import { requireAdminApi } from "@/lib/admin/guard";
import { RepositoryError, writeAsset } from "@/lib/editor-repository";

export const runtime = "nodejs";

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
