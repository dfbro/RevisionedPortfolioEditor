"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { z } from "zod";
import { type ActionState, formToObject } from "@/lib/admin/form";
import { WriteupSchema } from "@/lib/admin/schemas";
import { deleteArticle, getArticle, listArticles, saveArticle } from "@/lib/editor-content";
import { defaultWriteupSlug } from "@/lib/slug";

export async function saveWriteup(_prev: ActionState, fd: FormData): Promise<ActionState> {
  const parsed = WriteupSchema.safeParse(formToObject(fd));
  if (!parsed.success) return { ok: false, message: "Fix the highlighted fields.", fields: z.flattenError(parsed.error).fieldErrors };
  const { id, tags, attachments, slug, status, ...rest } = parsed.data;
  const finalSlug = slug ?? (defaultWriteupSlug(rest.category, rest.title) || null);
  if (!finalSlug) return { ok: false, message: "A valid slug is required.", fields: { slug: ["Enter a slug."] } };

  const existing = await getArticle(finalSlug);
  if (existing && id !== finalSlug) {
    return { ok: false, message: "Slug already used.", fields: { slug: ["This slug is already used by another writeup."] } };
  }
  const previous = id ? await getArticle(id) : null;
  const duplicate = (await listArticles({ includeDrafts: true })).find((item) => item.slug === finalSlug && item.slug !== id);
  if (duplicate) return { ok: false, message: "Slug already used.", fields: { slug: ["This slug is already used by another writeup."] } };

  try {
    await saveArticle({
      slug: finalSlug,
      title: rest.title,
      competition: rest.competition ?? "",
      category: rest.category ?? "Misc",
      difficulty: rest.difficulty,
      date: rest.date ? rest.date.toISOString().slice(0, 10) : null,
      updated: new Date().toISOString().slice(0, 10),
      summary: rest.summary ?? "",
      tags,
      status,
      flag: rest.flag,
      attachments,
      source: previous?.source,
      content: rest.content,
    }, previous?.slug, String(fd.get("expectedHash") ?? "") || null);
  } catch (error) {
    return { ok: false, message: (error as Error).message };
  }

  revalidatePath("/admin/writeups");
  revalidatePath("/writeups");
  revalidatePath("/sitemap.xml");
  redirect("/admin/writeups");
}

export async function deleteWriteup(slug: string, expectedHash?: string) {
  await deleteArticle(slug, expectedHash);
  revalidatePath("/admin/writeups");
  revalidatePath("/writeups");
  revalidatePath("/sitemap.xml");
}
