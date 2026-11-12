"use server";

import { revalidatePath } from "next/cache";
import { execFile as execFileCallback } from "node:child_process";
import { promisify } from "node:util";
import { z } from "zod";
import { type ActionState, formToObject } from "@/lib/admin/form";
import { DEFAULT_APPEARANCE, getAppearance, getSiteConfig, saveAppearance, saveSiteConfig } from "@/lib/editor-content";
import { repositoryRoot } from "@/lib/editor-repository";

const execFile = promisify(execFileCallback);

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
  url: z.url().refine((value) => {
    const parsed = new URL(value);
    return ["https:", "http:"].includes(parsed.protocol) && parsed.pathname === "/" && !parsed.search && !parsed.hash;
  }, "Enter the canonical origin only, without a path, query, or fragment."),
  basePath: z.string().trim().min(1).max(128).refine((value) => value === "/" || /^\/(?:[A-Za-z0-9._~-]+\/?)*$/.test(value), "Use `/` or a URL-safe path such as `/portfolio`."),
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
    schemaVersion: 2,
    url: parsed.data.url.replace(/\/+$/, ""),
    basePath: parsed.data.basePath === "/" ? "/" : "/" + parsed.data.basePath.split("/").filter(Boolean).join("/"),
    outputDirectory: "dist",
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

function repositoryCoordinates(remote: string): { owner: string; repo: string } | null {
  const match = /(?:https?:\/\/github\.com\/|git@github\.com:)([^/\s]+)\/([^/\s]+?)(?:\.git)?$/i.exec(remote.trim());
  return match ? { owner: match[1], repo: match[2] } : null;
}

/** Update only GitHub Pages' custom-domain field, preserving its current workflow/source/HTTPS settings. */
export async function syncGithubPagesDomain(): Promise<ActionState> {
  try {
    const site = await getSiteConfig();
    if (site.basePath !== "/") {
      return { ok: false, message: "GitHub Pages custom domains serve the site from `/`. Set basePath to `/` before syncing this domain." };
    }

    const domain = new URL(site.url).hostname.toLowerCase();
    if (domain.endsWith(".github.io")) {
      return { ok: false, message: "The canonical origin is a github.io host, not a custom domain." };
    }

    const root = await repositoryRoot();
    const { stdout: remote } = await execFile("git", ["remote", "get-url", "origin"], { cwd: root, timeout: 10_000, windowsHide: true });
    const coordinates = repositoryCoordinates(remote);
    if (!coordinates) return { ok: false, message: "The production repository origin is not a supported github.com remote." };

    const endpoint = `repos/${coordinates.owner}/${coordinates.repo}/pages`;
    const readPages = async () => {
      const { stdout } = await execFile("gh", ["api", endpoint], { cwd: root, timeout: 20_000, windowsHide: true, maxBuffer: 1024 * 1024 });
      return JSON.parse(stdout) as { cname?: string | null; build_type?: string; source?: { branch?: string; path?: string }; https_enforced?: boolean };
    };
    const current = await readPages();
    if ((current.cname ?? "").toLowerCase() === domain) {
      return { ok: true, message: `GitHub Pages already uses ${domain}; its current publishing configuration was left unchanged.` };
    }

    const args = ["api", "--method", "PUT", endpoint, "-f", `cname=${domain}`];
    if (current.build_type) args.push("-f", `build_type=${current.build_type}`);
    if (current.source?.branch && current.source.path) {
      args.push("-f", `source[branch]=${current.source.branch}`, "-f", `source[path]=${current.source.path}`);
    }
    if (typeof current.https_enforced === "boolean") args.push("-F", `https_enforced=${current.https_enforced}`);
    await execFile("gh", args, { cwd: root, timeout: 30_000, windowsHide: true, maxBuffer: 1024 * 1024 });

    const updated = await readPages();
    if ((updated.cname ?? "").toLowerCase() !== domain) {
      return { ok: false, message: "GitHub Pages accepted the update request, but the custom domain did not verify on read-back." };
    }
    revalidatePath("/admin/appearance");
    return { ok: true, message: `GitHub Pages custom domain is now ${domain}. DNS records are managed separately.` };
  } catch (error) {
    const detail = error instanceof Error ? error.message : "Unknown error";
    return { ok: false, message: `GitHub Pages sync failed: ${detail}` };
  }
}
