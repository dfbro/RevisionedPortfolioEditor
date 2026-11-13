import { requireAdminReadApi } from "@/lib/admin/guard";
import { readPublicPreviewAsset, RepositoryError } from "@/lib/editor-repository";

export const runtime = "nodejs";

export async function GET(request: Request) {
  const denied = requireAdminReadApi(request);
  if (denied) return denied;
  const pathname = new URL(request.url).searchParams.get("path") ?? "";
  try {
    const asset = await readPublicPreviewAsset(pathname);
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
