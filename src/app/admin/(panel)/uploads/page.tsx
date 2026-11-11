import { UploadManager } from "@/components/admin/upload-manager";
import { listAssets } from "@/lib/editor-repository";

export default async function AssetsPage() {
  const items = await listAssets();
  return (
    <div className="grid gap-6">
      <header>
        <p className="meta mb-2">public website assets</p>
        <h1 className="font-display text-4xl font-bold tracking-tight">Assets <span className="meta">{items.length}</span></h1>
        <p className="mt-2 text-sm text-muted-foreground">Files are written directly to the website repository at public/assets/uploads/.</p>
      </header>
      <UploadManager items={items} />
    </div>
  );
}
