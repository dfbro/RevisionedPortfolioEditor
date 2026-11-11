"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { z } from "zod";
import { type ActionState, formToObject } from "@/lib/admin/form";
import { AchievementSchema, OrderSchema } from "@/lib/admin/schemas";
import { listAchievements, saveAchievements } from "@/lib/editor-content";

function slugify(value: string) {
  return value.toLowerCase().normalize("NFKD").replace(/[\u0300-\u036f]/g, "").replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "") || "achievement";
}

export async function saveAchievement(_prev: ActionState, fd: FormData): Promise<ActionState> {
  const parsed = AchievementSchema.safeParse(formToObject(fd));
  if (!parsed.success) return { ok: false, message: "Fix the highlighted fields.", fields: z.flattenError(parsed.error).fieldErrors };
  const { id, ...data } = parsed.data;
  const rows = await listAchievements();
  const finalId = id ?? slugify(data.title);
  if (!id && rows.some((row) => row.id === finalId)) {
    return { ok: false, message: "An achievement with this generated ID already exists.", fields: { title: ["Change the title slightly to create a unique ID."] } };
  }
  if (id && !rows.some((row) => row.id === id)) return { ok: false, message: "Achievement no longer exists. Refresh the editor." };

  const item = {
    id: finalId,
    title: data.title,
    issuer: data.issuer,
    platform: data.platform,
    description: data.description ?? "",
    imageUrl: data.imageUrl,
    date: data.date ? data.date.toISOString().slice(0, 10) : null,
    proofScore: data.proofScore,
    documentUrl: data.documentUrl,
  };
  await saveAchievements(id ? rows.map((row) => row.id === id ? item : row) : [item, ...rows], String(fd.get("expectedHash") ?? "") || null);
  revalidatePath("/admin/achievements");
  revalidatePath("/achievements");
  redirect("/admin/achievements");
}

export async function deleteAchievement(id: string, expectedHash?: string) {
  await saveAchievements((await listAchievements()).filter((row) => row.id !== id), expectedHash);
  revalidatePath("/admin/achievements");
  revalidatePath("/achievements");
}

export async function saveAchievementOrder(fd: FormData): Promise<ActionState> {
  const parsed = OrderSchema.safeParse(formToObject(fd));
  if (!parsed.success) return { ok: false, message: "Invalid order." };
  const current = await listAchievements();
  const ids = parsed.data.ids;
  if (ids.length !== current.length || new Set(ids).size !== current.length || ids.some((id) => !current.some((row) => row.id === id))) {
    return { ok: false, message: "The submitted order does not match the current achievements. Refresh and try again." };
  }
  const byId = new Map(current.map((row) => [row.id, row]));
  await saveAchievements(ids.map((id) => byId.get(id)!), String(fd.get("expectedHash") ?? "") || null);
  revalidatePath("/admin/achievements");
  revalidatePath("/achievements");
  return { ok: true, message: "Order saved" };
}

export async function resetAchievementOrder(expectedHash?: string) {
  const current = await listAchievements();
  current.sort((a, b) => (b.date ?? "").localeCompare(a.date ?? ""));
  await saveAchievements(current, expectedHash);
  revalidatePath("/admin/achievements");
  revalidatePath("/achievements");
}
