"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { type ActionState, formToObject } from "@/lib/admin/form";
import { DEFAULT_APPEARANCE, getAppearance, getSiteConfig, saveAppearance, saveSiteConfig } from "@/lib/editor-content";

const color = z.string().regex(/^#[0-9a-fA-F]{6}$/, "Use a six-digit hex colour.");
const colors = z.object({
  background: color,
  foreground: color,
  card: color,
  primary: color,
  secondary: color,
  muted: color,
  mutedForeground: color,
});
const schema = z.object({
  url: z.url(),
  title: z.string().trim().min(1).max(200),
  description: z.string().max(1000),
  language: z.string().trim().min(2).max(12),
  trailingSlash: z.enum(["true", "false"]),
  defaultTheme: z.enum(["dark", "light"]),
  light: colors,
  dark: colors,
});

export async function saveSettings(_prev: ActionState, fd: FormData): Promise<ActionState> {
  const form = formToObject(fd);
  const readColors = (name: "light" | "dark") => Object.fromEntries(
    Object.keys(DEFAULT_APPEARANCE.colors[name]).map((key) => [key, form[name + "." + key]])
  );
  const parsed = schema.safeParse({
    ...form,
    light: readColors("light"),
    dark: readColors("dark"),
  });
  if (!parsed.success) return { ok: false, message: "Fix the highlighted settings.", fields: z.flattenError(parsed.error).fieldErrors };

  const currentSite = await getSiteConfig();
  const currentAppearance = await getAppearance();
  const siteHash = String(fd.get("siteHash") ?? "") || null;
  const appearanceHash = String(fd.get("appearanceHash") ?? "") || null;
  await saveSiteConfig({
    ...currentSite,
    url: parsed.data.url.replace(/\/+$/, ""),
    title: parsed.data.title,
    description: parsed.data.description,
    language: parsed.data.language,
    trailingSlash: parsed.data.trailingSlash === "true",
  }, siteHash);
  await saveAppearance({
    ...currentAppearance,
    defaultTheme: parsed.data.defaultTheme,
    colors: { light: parsed.data.light, dark: parsed.data.dark },
  }, appearanceHash);
  revalidatePath("/");
  revalidatePath("/sitemap.xml");
  return { ok: true, message: "Site settings and appearance saved to the website repository." };
}
