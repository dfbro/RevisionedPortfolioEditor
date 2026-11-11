import Link from "next/link";
import { DeleteButton } from "@/components/admin/delete-button";
import { Button } from "@/components/ui/button";
import { deleteWriteup } from "@/lib/admin/actions/writeups";
import { listArticleSnapshots } from "@/lib/editor-content";

export default async function WriteupsAdmin() {
  const snapshots = await listArticleSnapshots();
  const rows = snapshots.map((entry) => ({ ...entry.article, hash: entry.hash }));
  return (
    <div className="grid gap-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <h1 className="font-display text-4xl font-bold tracking-tight">Writeups <span className="meta">{rows.length}</span></h1>
        <Button asChild><Link href="/admin/writeups/new">New writeup</Link></Button>
      </div>
      <ul className="divide-y divide-border border-y border-border">
        {rows.map((w) => (
          <li key={w.slug} className="grid grid-cols-[1fr_auto] items-center gap-4 py-3 md:grid-cols-[1fr_8rem_12rem_7rem_auto]">
            <Link href={"/admin/writeups/" + w.slug} className="font-medium hover:text-primary">{w.title}</Link>
            <span className="meta hidden md:block">{w.category}</span>
            <span className="meta hidden md:block">{w.competition || "—"}</span>
            <span className="meta hidden md:block">{w.date ?? "undated"}</span>
            <div className="flex items-center gap-2">
              <span className={w.status === "published" ? "meta text-green-600" : "meta"}>{w.status}</span>
              {w.status === "published" && <a href={"/writeups/" + w.slug + "/"} target="_blank" rel="noreferrer" className="meta hover:text-foreground">view</a>}
              <DeleteButton action={deleteWriteup.bind(null, w.slug, w.hash)} />
            </div>
          </li>
        ))}
      </ul>
    </div>
  );
}
