import { mkdtemp, mkdir, readFile, rm, symlink, writeFile } from "node:fs/promises";
import { execFile as nodeExecFile } from "node:child_process";
import os from "node:os";
import path from "node:path";
import { promisify } from "node:util";
import { afterEach, describe, expect, it, vi } from "vitest";
import { commitRepositoryChanges, deleteRepoFile, listAssets, readAsset, readRepoSnapshot, repoPath, repositoryDiff, repositoryRoot, repositoryStatus, templateRepositoryStatus, pushRepositoryChanges, writeAsset, writeRepoJson, writeRepoText } from "@/lib/editor-repository";

const execFile = promisify(nodeExecFile);

let temporaryRoot: string | undefined;

async function makeRepo() {
  temporaryRoot = await mkdtemp(path.join(os.tmpdir(), "elaang-editor-test-"));
  await mkdir(path.join(temporaryRoot, ".git"));
  await mkdir(path.join(temporaryRoot, "content"));
  await writeFile(path.join(temporaryRoot, "portfolio.repo.json"), JSON.stringify({ schemaVersion: 1, role: "production", instanceName: "Editor Test", templateName: "Portfolio Base", templateContractVersion: 1 }));
  await writeFile(path.join(temporaryRoot, "content", "site.json"), JSON.stringify({ url: "https://portfolio.example", basePath: "/portfolio" }));
  vi.stubEnv("PORTFOLIO_REPO_PATH", temporaryRoot);
  return temporaryRoot;
}

async function git(root: string, args: string[]) {
  await execFile("git", args, { cwd: root, windowsHide: true });
}

afterEach(async () => {
  vi.unstubAllEnvs();
  if (temporaryRoot) await rm(temporaryRoot, { recursive: true, force: true });
  temporaryRoot = undefined;
});

describe("repository filesystem boundary", () => {
  it("resolves the explicitly configured website repository", async () => {
    const root = await makeRepo();
    expect(await repositoryRoot()).toBe(root);
  });

  it("refuses to use a marked template as the writable production target", async () => {
    const root = await makeRepo();
    await writeFile(path.join(root, "portfolio.repo.json"), JSON.stringify({ schemaVersion: 1, role: "template", contractVersion: 1 }));
    await expect(repositoryRoot()).rejects.toMatchObject({ code: "TEMPLATE_IS_READ_ONLY" });
  });

  it("requires a production manifest before opening a write target", async () => {
    const root = await makeRepo();
    await rm(path.join(root, "portfolio.repo.json"));
    await expect(repositoryRoot()).rejects.toMatchObject({ code: "MISSING_REPOSITORY_MANIFEST" });
  });

  it("inspects the configured template as a separate read-only Git repository", async () => {
    const root = await makeRepo();
    const template = path.join(root, "template");
    await mkdir(template);
    await git(template, ["init", "-b", "main"]);
    await writeFile(path.join(template, "portfolio.repo.json"), JSON.stringify({ schemaVersion: 1, role: "template", templateName: "Portfolio Base", templateVersion: "1.0.0", contractVersion: 1 }));
    vi.stubEnv("PORTFOLIO_TEMPLATE_PATH", template);

    const status = await templateRepositoryStatus();
    expect(status).toMatchObject({ ok: true, root: template, templateName: "Portfolio Base", templateVersion: "1.0.0", contractVersion: 1, branch: "main" });
  });

  it("exposes the production template pin for a compatibility check", async () => {
    const root = await makeRepo();
    await git(root, ["init", "-b", "main"]);
    await git(root, ["config", "user.name", "Editor Test"]);
    await git(root, ["config", "user.email", "editor-test@example.test"]);
    await git(root, ["add", "--all"]);
    await git(root, ["commit", "-m", "initial"]);

    await expect(repositoryStatus()).resolves.toMatchObject({
      instanceName: "Editor Test",
      templateName: "Portfolio Base",
      templateContractVersion: 1,
      branch: "main",
    });
  });

  it("rejects parent traversal and absolute paths", async () => {
    await makeRepo();
    await expect(repoPath("../outside")).rejects.toMatchObject({ code: "PATH_ESCAPE" });
    await expect(repoPath("/etc/passwd")).rejects.toMatchObject({ code: "INVALID_PATH" });
  });

  it("restricts editor filesystem access to content and public assets", async () => {
    await makeRepo();
    await expect(repoPath("README.md")).rejects.toMatchObject({ code: "PATH_NOT_MANAGED" });
    await expect(repoPath(".git/config")).rejects.toMatchObject({ code: "PATH_NOT_MANAGED" });
    await expect(repoPath("content/../.git/config")).rejects.toMatchObject({ code: "PATH_NOT_MANAGED" });
    await expect(repoPath("src/app/page.tsx")).rejects.toMatchObject({ code: "PATH_NOT_MANAGED" });
    await expect(repoPath("public/package.json")).rejects.toMatchObject({ code: "PATH_NOT_MANAGED" });
    await expect(repoPath("public/assets/image.png")).resolves.toBe(path.join(temporaryRoot!, "public/assets/image.png"));
  });

  it("rejects a symbolic link inside managed paths", async () => {
    const root = await makeRepo();
    const outside = path.join(root, "outside");
    const managed = path.join(root, "content");
    await mkdir(outside);
    await mkdir(managed, { recursive: true });
    await symlink(outside, path.join(managed, "escape"));
    await expect(repoPath("content/escape/secret.json")).rejects.toMatchObject({ code: "SYMLINK_REJECTED" });
  });

  it("writes text atomically and serializes JSON", async () => {
    const root = await makeRepo();
    await writeRepoText("content/article.md", "# Example\n");
    await writeRepoJson("content/site.json", { url: "https://example.test" });
    expect(await readFile(path.join(root, "content/article.md"), "utf8")).toBe("# Example\n");
    expect(JSON.parse(await readFile(path.join(root, "content/site.json"), "utf8"))).toEqual({ url: "https://example.test" });
    await deleteRepoFile("content/article.md");
    await expect(readFile(path.join(root, "content/article.md"), "utf8")).rejects.toMatchObject({ code: "ENOENT" });
  });

  it("rejects a stale write rather than overwriting a newer external edit", async () => {
    const root = await makeRepo();
    await writeRepoText("content/article.md", "original\n");
    const snapshot = await readRepoSnapshot("content/article.md");
    await writeRepoText("content/article.md", "changed outside the editor\n");
    await expect(writeRepoText("content/article.md", "stale editor value\n", snapshot.hash)).rejects.toMatchObject({ code: "EDIT_CONFLICT" });
    expect(await readFile(path.join(root, "content/article.md"), "utf8")).toBe("changed outside the editor\n");
  });

  it("rejects creation if a file appeared after the editor opened a new form", async () => {
    await makeRepo();
    const snapshot = await readRepoSnapshot("content/new.json");
    expect(snapshot.hash).toBeNull();
    await writeRepoText("content/new.json", "{}\n");
    await expect(writeRepoText("content/new.json", "{\"stale\":true}\n", snapshot.hash)).rejects.toMatchObject({ code: "EDIT_CONFLICT" });
  });

  it("rejects a file whose image signature does not match its MIME type", async () => {
    await makeRepo();
    const invalidPng = new File([Buffer.from("not a png")], "fake.png", { type: "image/png" });
    await expect(writeAsset(invalidPng)).rejects.toMatchObject({ code: "INVALID_ASSET_SIGNATURE" });
  });

  it("rejects SVG uploads to avoid active same-origin content", async () => {
    await makeRepo();
    const svg = new File(["<svg xmlns='http://www.w3.org/2000/svg'></svg>"], "image.svg", { type: "image/svg+xml" });
    await expect(writeAsset(svg)).rejects.toMatchObject({ code: "INVALID_ASSET_TYPE" });
  });

  it("stores a valid PNG under the website's public assets folder", async () => {
    const root = await makeRepo();
    const pngHeader = Buffer.from([137, 80, 78, 71, 13, 10, 26, 10]);
    const png = new File([pngHeader], "pixel.png", { type: "image/png" });
    const stored = await writeAsset(png, { imagesOnly: true });
    expect(stored.url).toMatch(/^https:\/\/portfolio\.example\/portfolio\/assets\/uploads\//);
    expect((await readFile(path.join(root, "public", "assets", "uploads", stored.name))).subarray(0, 8)).toEqual(pngHeader);
    const asset = await readAsset(stored.name);
    expect(asset).toMatchObject({ name: stored.name, contentType: "image/png", size: pngHeader.length });
    expect(asset.buffer.subarray(0, 8)).toEqual(pngHeader);
    await expect(readAsset("..")).rejects.toMatchObject({ code: "INVALID_ASSET_NAME" });
    const [listed] = await listAssets();
    expect(listed).toMatchObject({
      name: stored.name,
      url: stored.url,
      previewUrl: `/api/admin/upload/${encodeURIComponent(stored.name)}`,
      contentType: "image/png",
    });
  });

  it("shows untracked content and binary assets in the repository diff preview", async () => {
    const root = await makeRepo();
    await mkdir(path.join(root, "content"), { recursive: true });
    await mkdir(path.join(root, "public", "assets"), { recursive: true });
    await writeFile(path.join(root, "content", "site.json"), "{}\n");
    await git(root, ["init", "-b", "main"]);
    await git(root, ["config", "user.name", "Editor Test"]);
    await git(root, ["config", "user.email", "editor-test@example.test"]);
    await git(root, ["add", "--all"]);
    await git(root, ["commit", "-m", "initial"]);

    await writeRepoText("content/new-article.md", "---\ntitle: Example\n---\n\nNew content.\n");
    await writeFile(path.join(root, "public", "assets", "new-image.bin"), Buffer.from([0, 1, 2, 3]));

    const diff = await repositoryDiff();
    expect(diff.stat).toContain("content/new-article.md");
    expect(diff.patch).toContain("New content.");
    expect(diff.patch).toContain("New binary asset: public/assets/new-image.bin (4 bytes)");
  });

  it("commits only managed paths and leaves unrelated staged changes untouched", async () => {
    const root = await makeRepo();
    await mkdir(path.join(root, "content"), { recursive: true });
    await mkdir(path.join(root, "public", "assets"), { recursive: true });
    await mkdir(path.join(root, "scripts"), { recursive: true });
    await writeFile(path.join(root, "README.md"), "original readme\n");
    await writeRepoText("content/site.json", "{}\n");
    await writeRepoText("public/assets/.keep", "");
    await mkdir(path.join(root, "scripts"), { recursive: true });
    await writeFile(path.join(root, "scripts", "verify-content.mjs"), "process.exit(0);\n");
    await git(root, ["init", "-b", "main"]);
    await git(root, ["config", "user.name", "Editor Test"]);
    await git(root, ["config", "user.email", "editor-test@example.test"]);
    await git(root, ["add", "--all"]);
    await git(root, ["commit", "-m", "initial"]);

    await writeFile(path.join(root, "README.md"), "unrelated staged change\n");
    await git(root, ["add", "README.md"]);
    await writeRepoText("content/projects.json", "[]\n");

    await commitRepositoryChanges("content: update projects");

    const { stdout: committed } = await execFile("git", ["show", "--format=", "--name-only", "HEAD"], { cwd: root });
    const { stdout: staged } = await execFile("git", ["diff", "--cached", "--name-only"], { cwd: root });
    expect(committed.trim().split(/\r?\n/)).toContain("content/projects.json");
    expect(committed).not.toContain("README.md");
    expect(staged.trim()).toBe("README.md");
  });

  it("blocks pushes to an unexpected origin", async () => {
    const root = await makeRepo();
    await mkdir(path.join(root, "content"), { recursive: true });
    await writeFile(path.join(root, "content", "site.json"), "{}\n");
    await git(root, ["init", "-b", "main"]);
    await git(root, ["config", "user.name", "Editor Test"]);
    await git(root, ["config", "user.email", "editor-test@example.test"]);
    await git(root, ["add", "--all"]);
    await git(root, ["commit", "-m", "initial"]);
    await git(root, ["remote", "add", "origin", "https://example.test/unexpected.git"]);
    vi.stubEnv("EXPECTED_PORTFOLIO_REMOTE", "https://github.com/dfbro/RevisionedPortfolio");

    await expect(pushRepositoryChanges()).rejects.toMatchObject({ code: "REMOTE_MISMATCH" });
  });
});
