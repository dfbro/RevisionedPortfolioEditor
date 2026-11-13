"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { type ActionState, formToObject } from "@/lib/admin/form";
import { ProfileSchema } from "@/lib/admin/schemas";
import { getProfile, saveProfile as writeProfile } from "@/lib/editor-content";

export async function saveProfile(_prev: ActionState, fd: FormData): Promise<ActionState> {
  const parsed = ProfileSchema.safeParse(formToObject(fd));
  if (!parsed.success) return { ok: false, message: "Fix the highlighted fields.", fields: z.flattenError(parsed.error).fieldErrors };
  const data = parsed.data;
  const current = await getProfile();
  await writeProfile({
    ...current,
    displayName: data.displayName ?? "",
    alias: data.alias ?? "",
    brand: data.navbarBrandMode === "custom" && data.navbarBrandName ? data.navbarBrandName : data.alias ?? "",
    email: data.email,
    websiteUrl: data.websiteUrl,
    githubUrl: data.githubUrl,
    githubActivityUsername: data.githubActivityUsername,
    heroNameLines: data.heroNameLines,
    instagramUrl: data.instagramUrl,
    profileImageUrl: data.profileImageUrl ?? "/profile.jpg",
    aboutText: data.aboutText ?? "",
    philosophyText: data.philosophyText ?? "",
    skills: data.technicalArsenal,
    journey: data.professionalJourney,
    education: data.educationHistory,
    seo: data.seo,
  }, String(fd.get("expectedHash") ?? "") || null);
  revalidatePath("/admin/profile");
  return { ok: true, message: "Profile saved to the website repository." };
}
