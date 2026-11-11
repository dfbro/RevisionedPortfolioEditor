import { requireAdminApi } from "@/lib/admin/guard";
import { renderPdfPreview } from "@/lib/pdf-preview";
import { RepositoryError, writeAsset, writeAssetBuffer } from "@/lib/editor-repository";

export const runtime = "nodejs";

export async function POST(request: Request) {
  const denied = requireAdminApi(request);
  if (denied) return denied;
  const file = (await request.formData().catch(() => null))?.get("file");
  if (!(file instanceof File)) return Response.json({ error: "file is required" }, { status: 400 });
  try {
    if (file.type === "application/pdf" || file.name.toLowerCase().endsWith(".pdf")) {
      const saved = await writeAsset(file);
      const preview = await renderPdfPreview(Buffer.from(await file.arrayBuffer()));
      const previewAsset = await writeAssetBuffer(file.name.replace(/\.pdf$/i, "-preview.png"), preview);
      return Response.json({ imageUrl: previewAsset.url, documentUrl: saved.url }, { status: 201 });
    }
    const image = await writeAsset(file, { imagesOnly: true });
    return Response.json({ imageUrl: image.url, documentUrl: null }, { status: 201 });
  } catch (error) {
    if (error instanceof RepositoryError) {
      const status = error.code === "INVALID_ASSET_SIZE" ? 413 : 415;
      return Response.json({ error: error.message }, { status });
    }
    return Response.json({ error: "Could not process this certificate (is the PDF valid?)" }, { status: 500 });
  }
}
