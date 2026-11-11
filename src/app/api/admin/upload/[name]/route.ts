import { requireAdminApi } from "@/lib/admin/guard";
import { deleteAsset, RepositoryError } from "@/lib/editor-repository";

export const runtime = "nodejs";

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
