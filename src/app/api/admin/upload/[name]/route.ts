import { requireAdminApi, requireAdminReadApi } from "@/lib/admin/guard";
import { deleteAsset, readAsset, RepositoryError } from "@/lib/editor-repository";

export const runtime = "nodejs";

export async function GET(request: Request, context: { params: Promise<{ name: string }> }) {
  const denied = requireAdminReadApi(request);
  if (denied) return denied;
  const { name } = await context.params;
  try {
    const asset = await readAsset(name);
    return new Response(new Uint8Array(asset.buffer), {
      headers: {
        "Content-Type": asset.contentType,
        "Content-Length": String(asset.size),
        "Content-Disposition": `inline; filename*=UTF-8''${encodeURIComponent(asset.name)}`,
        "Cache-Control": "private, no-store",
        "X-Content-Type-Options": "nosniff",
      },
    });
  } catch (error) {
    const status = error instanceof RepositoryError
      ? error.code === "ASSET_NOT_FOUND" ? 404 : 400
      : 500;
    return Response.json({ error: error instanceof Error ? error.message : "Preview failed" }, { status });
  }
}

export async function DELETE(request: Request, context: { params: Promise<{ name: string }> }) {
  const denied = requireAdminApi(request);
  if (denied) return denied;
  const { name } = await context.params;
  try {
    await deleteAsset(name);
    return Response.json({ ok: true });
  } catch (error) {
    const status = error instanceof RepositoryError ? 400 : 500;
    return Response.json({ error: error instanceof Error ? error.message : "Delete failed" }, { status });
  }
}
