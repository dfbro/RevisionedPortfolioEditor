"use client";

import { useState } from "react";
import { toast } from "sonner";
import { uploadFile } from "@/components/admin/image-field";
import { editorAssetPreviewUrl } from "@/lib/asset-preview";
import { Button } from "@/components/ui/button";
import type { Attachment } from "@/lib/types";

export function AttachmentsField({ name, defaultValue = [] }: { name: string; defaultValue?: Attachment[] }) {
  const [items, setItems] = useState<Attachment[]>(defaultValue);
  return (
    <div className="grid gap-3">
      <ul className="grid gap-1">
        {items.map((a, i) => (
          <li key={a.url} className="flex items-center justify-between gap-4 text-sm">
            <div className="flex min-w-0 items-center gap-3">
              {a.contentType.startsWith("image/") && (
                // eslint-disable-next-line @next/next/no-img-element
                <img src={editorAssetPreviewUrl(a.url)} alt="" loading="lazy" className="h-10 w-14 shrink-0 rounded border border-border object-cover" />
              )}
              <a href={editorAssetPreviewUrl(a.url)} target="_blank" rel="noreferrer" className="truncate font-mono text-xs">
                {a.name}
              </a>
            </div>
            <Button type="button" variant="ghost" size="sm" onClick={() => setItems(items.filter((_, j) => j !== i))}>
              remove
            </Button>
          </li>
        ))}
      </ul>
      <Button type="button" variant="secondary" className="w-fit" asChild>
        <label className="cursor-pointer">
          Add attachment
          <input
            type="file"
            className="sr-only"
            onChange={async (e) => {
              const f = e.target.files?.[0];
              if (!f) return;
              try {
                const saved = await uploadFile(f);
                setItems([...items, { url: saved.url, name: saved.name, contentType: saved.contentType }]);
              } catch (err) {
                toast.error((err as Error).message);
              }
            }}
          />
        </label>
      </Button>
      <input type="hidden" name={name} value={JSON.stringify(items)} />
    </div>
  );
}
