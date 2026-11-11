import { WriteupForm } from "@/components/admin/writeup-form";
import { listArticles } from "@/lib/editor-content";
import { buildTagIndex } from "@/lib/tags";

export default async function NewWriteup() {
  const articles = await listArticles({ includeDrafts: true });
  return (
    <div className="grid gap-8">
      <h1 className="font-display text-4xl font-bold tracking-tight">New writeup</h1>
      <WriteupForm tagIndex={buildTagIndex(articles)} />
    </div>
  );
}
