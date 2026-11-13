import { mkdtemp, mkdir, rm, writeFile } from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import { afterEach, describe, expect, it, vi } from "vitest";
import { DELETE as deleteAssetRoute, GET as getAsset } from "@/app/api/admin/upload/[name]/route";
import { GET as listAssetRoute, POST as uploadAssetRoute } from "@/app/api/admin/upload/route";

let temporaryRoot: string | undefined;

async function makeRepo() {
  temporaryRoot = await mkdtemp(path.join(os.tmpdir(), "elaang-editor-assets-"));
  await mkdir(path.join(temporaryRoot, ".git"));
  await mkdir(path.join(temporaryRoot, "content"));
  await mkdir(path.join(temporaryRoot, "public", "assets", "uploads"), { recursive: true });
  await writeFile(path.join(temporaryRoot, "portfolio.repo.json"), JSON.stringify({
    schemaVersion: 1,
    role: "production",
    instanceName: "Asset API Test",
    templateName: "Portfolio Base",
    templateContractVersion: 1,
  }));
  await writeFile(path.join(temporaryRoot, "content", "site.json"), JSON.stringify({ url: "https://portfolio.example", basePath: "/" }));
  vi.stubEnv("PORTFOLIO_REPO_PATH", temporaryRoot);
  return temporaryRoot;
}

const localHeaders = { host: "127.0.0.1:4317", "sec-fetch-site": "same-origin" };

afterEach(async () => {
  vi.unstubAllEnvs();
  if (temporaryRoot) await rm(temporaryRoot, { recursive: true, force: true });
  temporaryRoot = undefined;
});

describe("asset preview API", () => {
  it("serves the exact asset bytes with a safe content type", async () => {
    const root = await makeRepo();
    const name = "a9e8dc62-e1e5-46a1-a6e6-9053dc763cb9-preview.png";
    const png = Buffer.from([137, 80, 78, 71, 13, 10, 26, 10]);
    await writeFile(path.join(root, "public", "assets", "uploads", name), png);

    const response = await getAsset(new Request(`http://127.0.0.1:4317/api/admin/upload/${name}`, { headers: localHeaders }), {
      params: Promise.resolve({ name }),
    });

    expect(response.status).toBe(200);
    expect(response.headers.get("content-type")).toBe("image/png");
    expect(response.headers.get("x-content-type-options")).toBe("nosniff");
    expect(Buffer.from(await response.arrayBuffer())).toEqual(png);
  });

  it("returns a not-found response instead of reading outside the upload directory", async () => {
    await makeRepo();
    const response = await getAsset(new Request("http://127.0.0.1:4317/api/admin/upload/%2E%2E", { headers: localHeaders }), {
      params: Promise.resolve({ name: ".." }),
    });
    expect(response.status).toBe(400);
  });

  it("lists public URLs separately from local preview URLs", async () => {
    const root = await makeRepo();
    const name = "preview.png";
    await writeFile(path.join(root, "public", "assets", "uploads", name), Buffer.from([1, 2, 3]));
    const response = await listAssetRoute(new Request("http://127.0.0.1:4317/api/admin/upload", { headers: localHeaders }));
    const json = await response.json() as { items: { name: string; url: string; previewUrl: string }[] };
    expect(response.status).toBe(200);
    expect(json.items).toContainEqual({
      name,
      size: 3,
      modified: expect.any(String),
      contentType: "image/png",
      url: "https://portfolio.example/assets/uploads/preview.png",
      previewUrl: "/api/admin/upload/preview.png",
    });
  });

  it("completes an upload, preview, and reference-safe delete cycle", async () => {
    await makeRepo();
    const png = Buffer.from([137, 80, 78, 71, 13, 10, 26, 10]);
    const form = new FormData();
    form.append("file", new File([png], "cycle.png", { type: "image/png" }));

    const uploaded = await uploadAssetRoute(new Request("http://127.0.0.1:4317/api/admin/upload", {
      method: "POST",
      headers: { host: "127.0.0.1:4317", origin: "http://127.0.0.1:4317" },
      body: form,
    }));
    const created = await uploaded.json() as { name: string; url: string };
    expect(uploaded.status).toBe(201);
    expect(created.url).toBe(`https://portfolio.example/assets/uploads/${encodeURIComponent(created.name)}`);

    const preview = await getAsset(new Request(`http://127.0.0.1:4317/api/admin/upload/${created.name}`, { headers: localHeaders }), {
      params: Promise.resolve({ name: created.name }),
    });
    expect(preview.status).toBe(200);
    expect(Buffer.from(await preview.arrayBuffer())).toEqual(png);

    const deleted = await deleteAssetRoute(new Request(`http://127.0.0.1:4317/api/admin/upload/${created.name}`, {
      method: "DELETE",
      headers: { host: "127.0.0.1:4317", origin: "http://127.0.0.1:4317" },
    }), { params: Promise.resolve({ name: created.name }) });
    expect(deleted.status).toBe(200);

    const missing = await getAsset(new Request(`http://127.0.0.1:4317/api/admin/upload/${created.name}`, { headers: localHeaders }), {
      params: Promise.resolve({ name: created.name }),
    });
    expect(missing.status).toBe(404);
  });
});
