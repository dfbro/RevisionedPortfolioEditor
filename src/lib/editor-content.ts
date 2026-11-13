import "server-only";

import { marked } from "marked";
import { readdir } from "node:fs/promises";
import { repoPath, readRepoJson, readRepoJsonSnapshot, readRepoSnapshot, readRepoText, writeRepoJson, writeRepoText, deleteRepoFile } from "@/lib/editor-repository";

export type EditorArticle = {
  id: string;
  slug: string;
  title: string;
  competition: string;
  category: string;
  difficulty: string | null;
  date: string | null;
  updated: string | null;
  summary: string;
  tags: string[];
  status: "draft" | "published";
  flag: string | null;
  attachments: { url: string; name: string; contentType: string }[];
  source?: string;
  content: string;
  html: string;
};

export type EditorProject = {
  id: string;
  title: string;
  description: string;
  imageUrl: string | null;
  projectUrl: string | null;
  category: string;
  tags: string[];
};

export type EditorAchievement = {
  id: string;
  title: string;
  issuer: string | null;
  platform: string | null;
  description: string;
  imageUrl: string | null;
  date: string | null;
  proofScore: number | null;
  documentUrl: string | null;
};

export type EditorProfile = {
  displayName: string;
  alias: string;
  brand: string;
  email: string | null;
  websiteUrl: string | null;
  githubUrl: string | null;
  githubActivityUsername?: string | null;
  instagramUrl: string | null;
  profileImageUrl: string;
  aboutText: string;
  philosophyText: string;
  skills: { name: string; level: number }[];
  journey: { role: string; company: string; period: string; desc: string }[];
  education: { level: string; school: string; period: string }[];
  seo?: Record<string, unknown>;
};

export type EditorSite = {
  schemaVersion: 2;
  url: string;
  basePath: string;
  outputDirectory: "dist";
  title: string;
  description: string;
  language: string;
  trailingSlash: boolean;
};

export type EditorAppearance = {
  defaultTheme: "dark" | "light";
  typography: { display: "Archivo"; body: "Inter Tight"; mono: "Geist Mono" };
  radius: number;
  colors: {
    light: Record<string, string>;
    dark: Record<string, string>;
  };
};

export const DEFAULT_APPEARANCE: EditorAppearance = {
  defaultTheme: "dark",
  typography: { display: "Archivo", body: "Inter Tight", mono: "Geist Mono" },
  radius: 6,
  colors: {
    light: { background: "#EDEBE6", foreground: "#0E0E0C", card: "#F3F1EB", primary: "#FF5B1F", secondary: "#E0DED8", muted: "#E6E3DC", mutedForeground: "#73716A" },
    dark: { background: "#0E0E0C", foreground: "#EDEBE6", card: "#141412", primary: "#FF5B1F", secondary: "#222220", muted: "#1D1D1B", mutedForeground: "#A8A59E" },
  },
};

const WRITEUPS_DIR = "content/writeups";

function parseValue(value: string): unknown {
  const text = value.trim();
  try { return JSON.parse(text) as unknown; } catch { return text; }
}

export function parseArticleFile(raw: string, filename: string): Omit<EditorArticle, "html"> {
  const match = /^---\r?\n([\s\S]*?)\r?\n---\r?\n?([\s\S]*)$/.exec(raw);
  if (!match) throw new Error(filename + ": missing frontmatter");
  const meta: Record<string, unknown> = {};
  for (const line of match[1].split(/\r?\n/)) {
    const property = /^([a-zA-Z][\w-]*):\s*(.*)$/.exec(line);
    if (property) meta[property[1]] = parseValue(property[2]);
  }
  const slug = String(meta.slug ?? filename.replace(/\.md$/, ""));
  if (slug !== filename.replace(/\.md$/, "")) throw new Error(filename + ": slug does not match its filename");
  const status = meta.status === "published" ? "published" : "draft";
  const attachments = Array.isArray(meta.attachments) ? meta.attachments : [];
  return {
    id: slug,
    slug,
    title: String(meta.title ?? "Untitled"),
    competition: String(meta.competition ?? ""),
    category: String(meta.category ?? "Misc"),
    difficulty: typeof meta.difficulty === "string" ? meta.difficulty : null,
    date: typeof meta.date === "string" ? meta.date : null,
    updated: typeof meta.updated === "string" ? meta.updated : null,
    summary: String(meta.summary ?? ""),
    tags: Array.isArray(meta.tags) ? meta.tags.filter((x): x is string => typeof x === "string") : [],
    status,
    flag: typeof meta.flag === "string" ? meta.flag : null,
    attachments: attachments.filter((x): x is { url: string; name: string; contentType: string } =>
      !!x && typeof x === "object" && typeof (x as { url?: unknown }).url === "string"
    ).map((x) => ({
      url: x.url,
      name: typeof x.name === "string" ? x.name : x.url.split("/").pop() ?? "file",
      contentType: typeof x.contentType === "string" ? x.contentType : "application/octet-stream",
    })),
    source: typeof meta.source === "string" ? meta.source : undefined,
    content: match[2].trim(),
  };
}

function quote(value: unknown): string {
  return JSON.stringify(value ?? null);
}

export function serializeArticle(article: Omit<EditorArticle, "html" | "id">): string {
  const frontmatter = [
    "slug: " + quote(article.slug),
    "title: " + quote(article.title),
    "competition: " + quote(article.competition),
    "category: " + quote(article.category),
    "difficulty: " + quote(article.difficulty),
    "date: " + quote(article.date),
    "updated: " + quote(article.updated),
    "summary: " + quote(article.summary),
    "tags: " + quote(article.tags),
    "status: " + quote(article.status),
    "flag: " + quote(article.flag),
    "attachments: " + quote(article.attachments),
  ];
  if (article.source) frontmatter.push("source: " + quote(article.source));
  return "---\n" + frontmatter.join("\n") + "\n---\n\n" + article.content.trim() + "\n";
}

export async function listArticles(options: { includeDrafts?: boolean } = {}): Promise<EditorArticle[]> {
  const directory = await repoPath(WRITEUPS_DIR);
  const names = await readdir(directory).catch(() => []);
  const files = names.filter((name) => name.endsWith(".md")).sort();
  const rows = await Promise.all(files.map(async (name) => {
    const parsed = parseArticleFile(await readRepoText(WRITEUPS_DIR + "/" + name), name);
    return { ...parsed, html: String(await marked.parse(parsed.content, { async: false, gfm: true })) };
  }));
  return rows
    .filter((article) => options.includeDrafts || article.status === "published")
    .sort((a, b) => (b.date ?? "").localeCompare(a.date ?? "") || (b.updated ?? "").localeCompare(a.updated ?? ""));
}

export async function listArticleSnapshots(): Promise<{ article: EditorArticle; hash: string }[]> {
  const directory = await repoPath(WRITEUPS_DIR);
  const names = (await readdir(directory).catch(() => [])).filter((name) => name.endsWith(".md")).sort();
  const rows = await Promise.all(names.map(async (name) => {
    const snapshot = await readRepoSnapshot(WRITEUPS_DIR + "/" + name);
    if (snapshot.content === null || snapshot.hash === null) return null;
    const parsed = parseArticleFile(snapshot.content, name);
    return { article: { ...parsed, html: String(await marked.parse(parsed.content, { async: false, gfm: true })) }, hash: snapshot.hash };
  }));
  return rows.filter((row): row is NonNullable<typeof row> => row !== null);
}

export async function getArticle(slug: string): Promise<EditorArticle | null> {
  if (!/^[a-z0-9]+(?:-[a-z0-9]+)*$/.test(slug)) return null;
  try {
    const parsed = parseArticleFile(await readRepoText(WRITEUPS_DIR + "/" + slug + ".md"), slug + ".md");
    return { ...parsed, html: String(await marked.parse(parsed.content, { async: false, gfm: true })) };
  } catch {
    return null;
  }
}

export async function getArticleSnapshot(slug: string): Promise<{ article: EditorArticle; hash: string } | null> {
  if (!/^[a-z0-9]+(?:-[a-z0-9]+)*$/.test(slug)) return null;
  const snapshot = await readRepoSnapshot(WRITEUPS_DIR + "/" + slug + ".md");
  if (snapshot.content === null || snapshot.hash === null) return null;
  const parsed = parseArticleFile(snapshot.content, slug + ".md");
  return { article: { ...parsed, html: String(await marked.parse(parsed.content, { async: false, gfm: true })) }, hash: snapshot.hash };
}

export async function saveArticle(article: Omit<EditorArticle, "html" | "id">, previousSlug?: string, expectedHash?: string | null) {
  const target = WRITEUPS_DIR + "/" + article.slug + ".md";
  const current = await getArticle(article.slug);
  if (current && article.slug !== previousSlug) throw new Error("Slug " + article.slug + " is already used.");
  if (previousSlug && previousSlug !== article.slug) {
    if (expectedHash === undefined) throw new Error("The original article version is missing. Reload before renaming.");
    const originalPath = WRITEUPS_DIR + "/" + previousSlug + ".md";
    const original = await readRepoSnapshot(originalPath);
    if (original.hash !== expectedHash) throw new Error("This article changed after the editor loaded it. Reload before renaming.");
    const newTarget = await readRepoSnapshot(target);
    if (newTarget.hash !== null) throw new Error("The new slug is already in use.");
    await writeRepoText(target, serializeArticle(article), null);
    await deleteRepoFile(originalPath, expectedHash);
    return;
  }
  await writeRepoText(target, serializeArticle(article), expectedHash);
}

export async function deleteArticle(slug: string, expectedHash?: string) {
  await deleteRepoFile(WRITEUPS_DIR + "/" + slug + ".md", expectedHash);
}

export async function listProjects(): Promise<EditorProject[]> {
  return readRepoJson<EditorProject[]>("content/projects.json");
}
export async function getProjectsSnapshot() {
  return readRepoJsonSnapshot<EditorProject[]>("content/projects.json");
}
export async function saveProjects(items: EditorProject[], expectedHash?: string | null) {
  await writeRepoJson("content/projects.json", items, expectedHash);
}
export async function listAchievements(): Promise<EditorAchievement[]> {
  return readRepoJson<EditorAchievement[]>("content/achievements.json");
}
export async function getAchievementsSnapshot() {
  return readRepoJsonSnapshot<EditorAchievement[]>("content/achievements.json");
}
export async function saveAchievements(items: EditorAchievement[], expectedHash?: string | null) {
  await writeRepoJson("content/achievements.json", items, expectedHash);
}
export async function getProfile(): Promise<EditorProfile> {
  return readRepoJson<EditorProfile>("content/profile.json");
}
export async function getProfileSnapshot() {
  return readRepoJsonSnapshot<EditorProfile>("content/profile.json");
}
export async function saveProfile(profile: EditorProfile, expectedHash?: string | null) {
  await writeRepoJson("content/profile.json", profile, expectedHash);
}
export async function getSiteConfig(): Promise<EditorSite> {
  return readRepoJson<EditorSite>("content/site.json");
}
export async function getSiteSnapshot() {
  return readRepoJsonSnapshot<EditorSite>("content/site.json");
}
export async function saveSiteConfig(site: EditorSite, expectedHash?: string | null) {
  await writeRepoJson("content/site.json", site, expectedHash);
}
export async function getAppearance(): Promise<EditorAppearance> {
  try {
    return await readRepoJson<EditorAppearance>("content/appearance.json");
  } catch {
    return DEFAULT_APPEARANCE;
  }
}
export async function getAppearanceSnapshot() {
  return readRepoJsonSnapshot<EditorAppearance>("content/appearance.json");
}
export async function saveAppearance(appearance: EditorAppearance, expectedHash?: string | null) {
  await writeRepoJson("content/appearance.json", appearance, expectedHash);
}
