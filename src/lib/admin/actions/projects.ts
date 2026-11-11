"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { z } from "zod";
import { type ActionState, formToObject } from "@/lib/admin/form";
import { ProjectSchema } from "@/lib/admin/schemas";
import { listProjects, saveProjects } from "@/lib/editor-content";

function slugify(value: string) {
  return value.toLowerCase().normalize("NFKD").replace(/[\u0300-\u036f]/g, "").replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "") || "project";
}

export async function saveProject(_prev: ActionState, fd: FormData): Promise<ActionState> {
  const parsed = ProjectSchema.safeParse(formToObject(fd));
  if (!parsed.success) return { ok: false, message: "Fix the highlighted fields.", fields: z.flattenError(parsed.error).fieldErrors };
  const { id, ...data } = parsed.data;
  const rows = await listProjects();
  let finalId = id ?? slugify(data.title);
  if (!id && rows.some((row) => row.id === finalId)) finalId = finalId + "-" + Date.now().toString(36);
  if (id && !rows.some((row) => row.id === id)) return { ok: false, message: "Project no longer exists. Refresh the editor." };

  const item = {
    id: finalId,
    title: data.title,
    description: data.description ?? "",
    imageUrl: data.imageUrl,
    projectUrl: data.projectUrl,
    category: data.category ?? "Project",
    tags: data.tags,
  };
  const next = id ? rows.map((row) => row.id === id ? item : row) : [item, ...rows];
  await saveProjects(next, String(fd.get("expectedHash") ?? "") || null);
  revalidatePath("/admin/projects");
  revalidatePath("/projects");
  redirect("/admin/projects");
}

export async function deleteProject(id: string, expectedHash?: string) {
  await saveProjects((await listProjects()).filter((row) => row.id !== id), expectedHash);
  revalidatePath("/admin/projects");
  revalidatePath("/projects");
}
