import { requireAdminApi, requireAdminReadApi } from "@/lib/admin/guard";
import { listAssets, RepositoryError, writeAsset } from "@/lib/editor-repository";

export const runtime = "nodejs";

export async function GET(request: Request) {
  const denied = requireAdminReadApi(request);
  if (denied) return denied;
  try {
    return Response.json({ items: await listAssets() }, { headers: { "Cache-Control": "private, no-store" } });
  } catch (error) {
    const status = error instanceof RepositoryError ? 400 : 500;
    return Response.json({ error: error instanceof Error ? error.message : "Could not list assets" }, { status });
  }
}

export async function POST(request: Request) {
  const denied = requireAdminApi(request);
  if (denied) return denied;
  const file = (await request.formData().catch(() => null))?.get("file");
  if (!(file instanceof File)) return Response.json({ error: "file is required" }, { status: 400 });
  try {
    return Response.json(await writeAsset(file), { status: 201 });
  } catch (error) {
    if (error instanceof RepositoryError) {
      const status = error.code === "INVALID_ASSET_SIZE" ? 413 : error.code.startsWith("INVALID_ASSET") ? 415 : 400;
      return Response.json({ error: error.message }, { status });
    }
    return Response.json({ error: "Upload failed" }, { status: 500 });
  }
}
