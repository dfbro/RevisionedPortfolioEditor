"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import { toast } from "sonner";
import { uploadFile } from "@/components/admin/image-field";
import { Button } from "@/components/ui/button";

type Item = { name: string; size: number; modified: string; url: string; previewUrl: string; contentType: string };

export function UploadManager({ items }: { items: Item[] }) {
  const router = useRouter();
  const [busy, setBusy] = useState(false);
  return (
    <div className="grid gap-6">
      <Button asChild variant="secondary" className="w-fit" disabled={busy}>
        <label className="cursor-pointer">
          {busy ? "Uploading…" : "Upload files"}
          <input
            type="file"
            multiple
            className="sr-only"
            onChange={async (e) => {
              const files = Array.from(e.target.files ?? []);
              setBusy(true);
              for (const f of files) await uploadFile(f).catch((err: Error) => toast.error(`${f.name}: ${err.message}`));
              setBusy(false);
              router.refresh();
            }}
          />
        </label>
      </Button>
      <ul className="divide-y divide-border border-y border-border">
        {items.map((i) => (
          <li key={i.name} className="grid grid-cols-[4.5rem_minmax(0,1fr)] items-center gap-3 py-3 sm:grid-cols-[4.5rem_minmax(0,1fr)_auto_auto_auto] sm:gap-4">
            <a href={i.previewUrl} target="_blank" rel="noreferrer" aria-label={`Preview ${i.name}`} className="flex h-14 w-[4.5rem] items-center justify-center overflow-hidden rounded border border-border bg-muted">
              {i.contentType.startsWith("image/") ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img src={i.previewUrl} alt={i.name} loading="lazy" className="h-full w-full object-cover" />
              ) : (
                <span className="meta px-1 text-center">{i.contentType.split("/").at(-1)}</span>
              )}
            </a>
            <div className="min-w-0">
              <a href={i.previewUrl} target="_blank" rel="noreferrer" className="block truncate font-mono text-xs hover:text-primary">
                {i.name}
              </a>
              <p className="meta mt-1">{i.contentType} · {(i.size / 1024).toFixed(0)} KB</p>
            </div>
            <div className="col-start-2 flex flex-wrap items-center gap-1 sm:col-start-auto">
              <Button asChild size="sm" variant="ghost">
                <a href={i.previewUrl} target="_blank" rel="noreferrer">Preview</a>
              </Button>
              <Button size="sm" variant="ghost" type="button" onClick={() => navigator.clipboard.writeText(i.url).then(() => toast.success("Public URL copied"))}>
                Copy public URL
              </Button>
              <Button
                size="sm"
                variant="ghost"
                type="button"
                className="text-destructive"
                onClick={async () => {
                  if (!confirm(`Delete ${i.name}? Content referencing it will break.`)) return;
                  try {
                    const res = await fetch(`/api/admin/upload/${encodeURIComponent(i.name)}`, { method: "DELETE" });
                    if (res.ok) router.refresh();
                    else {
                      const result = await res.json().catch(() => null) as { error?: string } | null;
                      toast.error(result?.error ?? "Delete failed");
                    }
                  } catch {
                    toast.error("Delete failed. Check the local editor connection.");
                  }
                }}
              >
                Delete
              </Button>
            </div>
          </li>
        ))}
      </ul>
    </div>
  );
}
