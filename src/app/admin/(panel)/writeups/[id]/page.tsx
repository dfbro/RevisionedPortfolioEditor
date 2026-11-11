import { notFound } from "next/navigation";
import { WriteupForm } from "@/components/admin/writeup-form";
import { listArticles, getArticleSnapshot } from "@/lib/editor-content";
import { buildTagIndex } from "@/lib/tags";

export default async function EditWriteup({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const [snapshot, articles] = await Promise.all([getArticleSnapshot(id), listArticles({ includeDrafts: true })]);
  if (!snapshot) notFound();
  const article = snapshot.article;
  return (
    <div className="grid gap-8">
      <h1 className="font-display text-4xl font-bold tracking-tight">Edit writeup</h1>
      <WriteupForm
        tagIndex={buildTagIndex(articles)}
        initial={{
          id: article.slug,
          expectedHash: snapshot.hash,
          title: article.title,
          slug: article.slug,
          competition: article.competition,
          category: article.category,
          difficulty: article.difficulty,
          date: article.date,
          summary: article.summary,
          content: article.html,
          status: article.status,
          flag: article.flag,
          tags: article.tags,
          attachments: article.attachments,
        }}
      />
    </div>
  );
}
