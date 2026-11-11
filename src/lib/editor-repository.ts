import "server-only";

import { createHash, randomUUID } from "node:crypto";
import { execFile as nodeExecFile } from "node:child_process";
import { access, lstat, mkdir, readFile, readdir, realpath, rename, rm, writeFile } from "node:fs/promises";
import path from "node:path";
import { promisify } from "node:util";

const execFile = promisify(nodeExecFile);
const DEFAULT_REPOSITORY = path.resolve(process.cwd(), "../RevisionedPortfolio");
const DEFAULT_TEMPLATE = path.resolve(process.cwd(), "../RevisionedPortfolioTemplate");
const MAX_ASSET_BYTES = 30 * 1024 * 1024;
const MANAGED_ROOTS = ["content", path.join("public", "assets")];
const ALLOWED_TYPES = new Set([
  "image/png", "image/jpeg", "image/gif", "image/webp", "image/avif",
  "application/pdf", "text/plain", "application/zip",
  "video/mp4", "audio/mpeg",
]);

export class RepositoryError extends Error {
  constructor(message: string, public code = "REPOSITORY_ERROR") {
    super(message);
    this.name = "RepositoryError";
  }
}

type ProductionManifest = {
  schemaVersion: 1;
  role: "production";
  instanceName: string;
  templateName: string;
  templateContractVersion: number;
};

type RepositoryManifestInput = {
  schemaVersion?: number;
  role?: string;
  instanceName?: string;
  templateName?: string;
  templateContractVersion?: number;
};

async function readProductionManifest(root: string): Promise<ProductionManifest> {
  let manifest: RepositoryManifestInput;
  try {
    manifest = JSON.parse(await readFile(path.join(root, "portfolio.repo.json"), "utf8")) as Partial<ProductionManifest>;
  } catch (error) {
    if ((error as NodeJS.ErrnoException).code === "ENOENT") {
      throw new RepositoryError("The configured write target has no portfolio.repo.json manifest. Mark it explicitly as role=production before using the editor.", "MISSING_REPOSITORY_MANIFEST");
    }
    throw new RepositoryError("The configured production repository manifest is invalid JSON.", "INVALID_REPOSITORY_MANIFEST");
  }
  if (manifest.role === "template") {
      throw new RepositoryError("The editor's write target is read-only by design. Set PORTFOLIO_REPO_PATH to a production instance, not RevisionedPortfolioTemplate.", "TEMPLATE_IS_READ_ONLY");
  }
  if (
    manifest.schemaVersion !== 1 || manifest.role !== "production" ||
    typeof manifest.instanceName !== "string" || !manifest.instanceName.trim() ||
    typeof manifest.templateName !== "string" || !manifest.templateName.trim() ||
    typeof manifest.templateContractVersion !== "number" || !Number.isInteger(manifest.templateContractVersion)
  ) {
    throw new RepositoryError("The configured repository must have a valid production manifest with a template contract version.", "INVALID_REPOSITORY_MANIFEST");
  }
  return manifest as ProductionManifest;
}

export async function repositoryRoot(): Promise<string> {
  const configured = process.env.PORTFOLIO_REPO_PATH?.trim() || DEFAULT_REPOSITORY;
  let root: string;
  try {
    const fs = await import("node:fs/promises");
    root = await fs.realpath(/* turbopackIgnore: true */ configured);
  } catch {
    throw new RepositoryError("Portfolio repository is unavailable. Check PORTFOLIO_REPO_PATH.", "ROOT_NOT_FOUND");
  }
  const stat = await lstat(root);
  if (!stat.isDirectory()) throw new RepositoryError("Configured portfolio path is not a directory.", "INVALID_ROOT");
  try {
    await access(path.join(root, ".git"));
  } catch {
    throw new RepositoryError("Configured portfolio path is not a Git repository.", "NOT_A_GIT_REPOSITORY");
  }
  await readProductionManifest(root);
  return root;
}

/** Read-only inspection of the reusable base; it is never used as a content write target. */
export async function templateRepositoryStatus() {
  try {
    const configured = process.env.PORTFOLIO_TEMPLATE_PATH?.trim() || DEFAULT_TEMPLATE;
    const root = await realpath(/* turbopackIgnore: true */ configured);
    const stat = await lstat(root);
    if (!stat.isDirectory()) throw new RepositoryError("Configured template path is not a directory.", "INVALID_TEMPLATE_ROOT");
    await access(path.join(root, ".git"));
    const manifest = JSON.parse(await readFile(path.join(root, "portfolio.repo.json"), "utf8")) as {
      schemaVersion?: number;
      role?: string;
      templateName?: string;
      templateVersion?: string;
      contractVersion?: number;
    };
    if (manifest.schemaVersion !== 1 || manifest.role !== "template" || typeof manifest.contractVersion !== "number" || !Number.isInteger(manifest.contractVersion)) {
      throw new RepositoryError("The configured template is missing a supported portfolio.repo.json manifest.", "INVALID_TEMPLATE_MANIFEST");
    }
    const [branch, remote, status] = await Promise.all([
      execFile("git", ["branch", "--show-current"], { cwd: root, timeout: 10_000, windowsHide: true }).then((r) => r.stdout.trim()),
      execFile("git", ["remote", "get-url", "origin"], { cwd: root, timeout: 10_000, windowsHide: true }).then((r) => r.stdout.trim()).catch(() => ""),
      execFile("git", ["status", "--short", "--branch"], { cwd: root, timeout: 10_000, windowsHide: true }).then((r) => r.stdout.trim()),
    ]);
    return { ok: true as const, root, branch, remote, status, templateName: manifest.templateName ?? "Portfolio template", templateVersion: manifest.templateVersion ?? "unknown", contractVersion: manifest.contractVersion };
  } catch (error) {
    return { ok: false as const, error: (error as Error).message || "Template repository is unavailable." };
  }
}

export async function repoPath(relative: string): Promise<string> {
  if (!relative || path.isAbsolute(relative) || relative.includes("\0") || relative.includes("\\")) {
    throw new RepositoryError("Invalid repository-relative path.", "INVALID_PATH");
  }
  const root = await repositoryRoot();
  const normalized = path.normalize(relative);
  if (normalized === ".." || normalized.startsWith(".." + path.sep)) {
    throw new RepositoryError("Path escapes the configured repository.", "PATH_ESCAPE");
  }
  const absolute = path.resolve(root, normalized);
  if (absolute !== root && !absolute.startsWith(root + path.sep)) {
    throw new RepositoryError("Path escapes the configured repository.", "PATH_ESCAPE");
  }
  if (!MANAGED_ROOTS.some((managed) => normalized === managed || normalized.startsWith(managed + path.sep))) {
    throw new RepositoryError("The editor may only access content/ and public/assets/.", "PATH_NOT_MANAGED");
  }

  let current = root;
  for (const part of normalized.split(path.sep).filter(Boolean)) {
    current = path.join(current, part);
    try {
      const info = await lstat(current);
      if (info.isSymbolicLink()) throw new RepositoryError("Symbolic links are not allowed inside managed paths.", "SYMLINK_REJECTED");
    } catch (error) {
      if ((error as NodeJS.ErrnoException).code !== "ENOENT") throw error;
    }
  }
  return absolute;
}

export async function readRepoText(relative: string): Promise<string> {
  return readFile(await repoPath(relative), "utf8");
}

export async function readRepoSnapshot(relative: string): Promise<{ content: string | null; hash: string | null }> {
  try {
    const content = await readRepoText(relative);
    return { content, hash: createHash("sha256").update(content).digest("hex") };
  } catch (error) {
    if ((error as NodeJS.ErrnoException).code === "ENOENT") return { content: null, hash: null };
    throw error;
  }
}

export async function readRepoJson<T>(relative: string): Promise<T> {
  const raw = await readRepoText(relative);
  try {
    return JSON.parse(raw) as T;
  } catch {
    throw new RepositoryError("Invalid JSON in " + relative + ".", "INVALID_JSON");
  }
}

export async function readRepoJsonSnapshot<T>(relative: string): Promise<{ value: T; hash: string }> {
  const snapshot = await readRepoSnapshot(relative);
  if (snapshot.content === null || snapshot.hash === null) {
    throw new RepositoryError("Missing repository file: " + relative, "FILE_NOT_FOUND");
  }
  try {
    return { value: JSON.parse(snapshot.content) as T, hash: snapshot.hash };
  } catch {
    throw new RepositoryError("Invalid JSON in " + relative + ".", "INVALID_JSON");
  }
}

export async function writeRepoText(relative: string, content: string, expectedHash?: string | null): Promise<void> {
  const target = await repoPath(relative);
  if (expectedHash !== undefined) {
    const current = await readRepoSnapshot(relative);
    if (current.hash !== expectedHash) {
      throw new RepositoryError("This file changed after the editor loaded it. Reload the file or compare versions before saving.", "EDIT_CONFLICT");
    }
  }
  const parent = path.dirname(target);
  await mkdir(parent, { recursive: true });
  const temporary = path.join(parent, "." + path.basename(target) + "." + randomUUID() + ".tmp");
  try {
    await writeFile(temporary, content, { encoding: "utf8", flag: "wx", mode: 0o600 });
    await rename(temporary, target);
  } catch (error) {
    await rm(temporary, { force: true }).catch(() => undefined);
    throw error;
  }
}

export async function writeRepoJson(relative: string, value: unknown, expectedHash?: string | null): Promise<void> {
  await writeRepoText(relative, JSON.stringify(value, null, 2) + "\n", expectedHash);
}

export async function deleteRepoFile(relative: string, expectedHash?: string | null): Promise<void> {
  const target = await repoPath(relative);
  if (expectedHash !== undefined) {
    const current = await readRepoSnapshot(relative);
    if (current.hash !== expectedHash) {
      throw new RepositoryError("This file changed after the editor loaded it. Reload before deleting.", "EDIT_CONFLICT");
    }
  }
  await rm(target, { force: true });
}

export function safeAssetName(original: string): string {
  const base = path.basename(original).normalize("NFKC").replace(/[^a-zA-Z0-9._-]/g, "-").replace(/-{2,}/g, "-").slice(-120);
  return base || "upload.bin";
}

function verifyImageSignature(buffer: Buffer, type: string): boolean {
  if (type === "image/png") return buffer.subarray(0, 8).equals(Buffer.from([137, 80, 78, 71, 13, 10, 26, 10]));
  if (type === "image/jpeg") return buffer[0] === 0xff && buffer[1] === 0xd8 && buffer[2] === 0xff;
  if (type === "image/gif") return buffer.subarray(0, 3).toString() === "GIF";
  if (type === "image/webp") return buffer.subarray(0, 4).toString() === "RIFF" && buffer.subarray(8, 12).toString() === "WEBP";
  if (type === "image/avif") return buffer.subarray(4, 12).toString().includes("ftypavif");
  if (type === "application/pdf") return buffer.subarray(0, 5).toString() === "%PDF-";
  if (type === "application/zip") return buffer[0] === 0x50 && buffer[1] === 0x4b;
  if (type === "video/mp4") return buffer.subarray(4, 8).toString() === "ftyp";
  if (type === "audio/mpeg") return buffer.subarray(0, 3).toString() === "ID3" || (buffer[0] === 0xff && (buffer[1] & 0xe0) === 0xe0);
  return type === "text/plain" && !buffer.includes(0);
}

export async function writeAsset(file: File, options: { imagesOnly?: boolean } = {}) {
  if (file.size <= 0 || file.size > MAX_ASSET_BYTES) {
    throw new RepositoryError("File size must be between 1 byte and 30 MB.", "INVALID_ASSET_SIZE");
  }
  const type = (file.type || "application/octet-stream").split(";")[0].toLowerCase();
  if (!ALLOWED_TYPES.has(type) || (options.imagesOnly && !type.startsWith("image/"))) {
    throw new RepositoryError("File type " + type + " is not allowed.", "INVALID_ASSET_TYPE");
  }
  const extension = path.extname(file.name).toLowerCase();
  const allowedExtensions: Record<string, string[]> = {
    "image/png": [".png"], "image/jpeg": [".jpg", ".jpeg"], "image/gif": [".gif"],
    "image/webp": [".webp"], "image/avif": [".avif"], "application/pdf": [".pdf"],
    "text/plain": [".txt", ".md", ".csv"], "application/zip": [".zip"],
    "video/mp4": [".mp4"], "audio/mpeg": [".mp3"],
  };
  if (!allowedExtensions[type]?.includes(extension)) {
    throw new RepositoryError("The file extension does not match its declared content type.", "INVALID_ASSET_EXTENSION");
  }
  const buffer = Buffer.from(await file.arrayBuffer());
  if (!verifyImageSignature(buffer, type)) {
    throw new RepositoryError("Image signature does not match its declared file type.", "INVALID_ASSET_SIGNATURE");
  }
  const name = randomUUID() + "-" + safeAssetName(file.name);
  const relative = "public/assets/uploads/" + name;
  const target = await repoPath(relative);
  await mkdir(path.dirname(target), { recursive: true });
  const temporary = target + "." + randomUUID() + ".tmp";
  try {
    await writeFile(temporary, buffer, { flag: "wx", mode: 0o644 });
    await rename(temporary, target);
  } catch (error) {
    await rm(temporary, { force: true }).catch(() => undefined);
    throw error;
  }
  return { name, url: "/assets/uploads/" + encodeURIComponent(name), contentType: type, size: buffer.length };
}

export async function writeAssetBuffer(originalName: string, buffer: Buffer) {
  if (!buffer.length || buffer.length > MAX_ASSET_BYTES) {
    throw new RepositoryError("Imported asset must be between 1 byte and 30 MB.", "INVALID_ASSET_SIZE");
  }
  const extension = path.extname(originalName).toLowerCase();
  const signatures: Record<string, (data: Buffer) => boolean> = {
    ".png": (data) => data.subarray(0, 8).equals(Buffer.from([137, 80, 78, 71, 13, 10, 26, 10])),
    ".jpg": (data) => data[0] === 0xff && data[1] === 0xd8 && data[2] === 0xff,
    ".jpeg": (data) => data[0] === 0xff && data[1] === 0xd8 && data[2] === 0xff,
    ".gif": (data) => data.subarray(0, 3).toString() === "GIF",
    ".webp": (data) => data.subarray(0, 4).toString() === "RIFF" && data.subarray(8, 12).toString() === "WEBP",
    ".avif": (data) => data.subarray(4, 12).toString().includes("ftypavif"),
  };
  if (!signatures[extension] || !signatures[extension](buffer)) {
    throw new RepositoryError("Imported assets must be valid PNG, JPEG, GIF, WebP or AVIF images.", "INVALID_ASSET_SIGNATURE");
  }
  const name = randomUUID() + "-" + safeAssetName(originalName);
  const relative = "public/assets/uploads/" + name;
  const target = await repoPath(relative);
  await mkdir(path.dirname(target), { recursive: true });
  const temporary = target + "." + randomUUID() + ".tmp";
  try {
    await writeFile(temporary, buffer, { flag: "wx", mode: 0o644 });
    await rename(temporary, target);
  } catch (error) {
    await rm(temporary, { force: true }).catch(() => undefined);
    throw error;
  }
  const contentTypes: Record<string, string> = {
    ".png": "image/png", ".jpg": "image/jpeg", ".jpeg": "image/jpeg", ".gif": "image/gif", ".webp": "image/webp", ".avif": "image/avif",
  };
  return { name, url: "/assets/uploads/" + encodeURIComponent(name), contentType: contentTypes[extension], size: buffer.length };
}

export async function listAssets() {
  const directory = await repoPath("public/assets/uploads");
  await mkdir(directory, { recursive: true });
  const names = await readdir(directory);
  const rows = await Promise.all(names.map(async (name) => {
    const full = await repoPath("public/assets/uploads/" + name);
    const info = await lstat(full);
    if (!info.isFile() || info.isSymbolicLink()) return null;
    return {
      name,
      size: info.size,
      modified: info.mtime.toISOString(),
      url: "/assets/uploads/" + encodeURIComponent(name),
    };
  }));
  return rows.filter((row): row is NonNullable<typeof row> => row !== null).sort((a, b) => b.modified.localeCompare(a.modified));
}

export async function deleteAsset(name: string): Promise<void> {
  if (!name || name !== path.basename(name) || /[\\/\0]/.test(name)) {
    throw new RepositoryError("Invalid asset name.", "INVALID_ASSET_NAME");
  }
  const root = await repositoryRoot();
  const contentRoot = path.join(root, "content");
  const references: string[] = [];
  async function scan(directory: string): Promise<void> {
    const entries = await readdir(directory, { withFileTypes: true }).catch(() => []);
    for (const entry of entries) {
      if (entry.isSymbolicLink()) continue;
      const full = path.join(directory, entry.name);
      if (entry.isDirectory()) await scan(full);
      else if (/\.(md|mdx|json)$/i.test(entry.name)) {
        const body = await readFile(full, "utf8").catch(() => "");
        if (body.includes(name) || body.includes(encodeURIComponent(name))) {
          references.push(path.relative(root, full));
        }
      }
    }
  }
  await scan(contentRoot);
  if (references.length) {
    throw new RepositoryError("This asset is still referenced by: " + references.join(", "), "ASSET_IN_USE");
  }
  await deleteRepoFile("public/assets/uploads/" + name);
}

async function git(args: string[], timeout = 15_000): Promise<string> {
  const cwd = await repositoryRoot();
  try {
    const { stdout } = await execFile("git", args, { cwd, timeout, maxBuffer: 5 * 1024 * 1024, windowsHide: true });
    return stdout.trim();
  } catch (error) {
    const e = error as NodeJS.ErrnoException & { stderr?: string };
    throw new RepositoryError(e.stderr?.trim() || e.message || "Git command failed.", "GIT_COMMAND_FAILED");
  }
}

export async function repositoryStatus() {
  const [root, remote, branch, status, diffStat, diffCheck] = await Promise.all([
    git(["rev-parse", "--show-toplevel"]),
    git(["remote", "get-url", "origin"]).catch(() => ""),
    git(["branch", "--show-current"]),
    git(["status", "--short", "--branch"]),
    git(["diff", "--stat"]),
    git(["diff", "--check"]).then(() => ({ ok: true, output: "" })).catch((e: Error) => ({ ok: false, output: e.message })),
  ]);
  const manifest = await readProductionManifest(root);
  return {
    root,
    expectedRoot: await repositoryRoot(),
    remote,
    branch,
    detachedHead: branch.length === 0,
    status,
    diffStat,
    diffCheck,
    instanceName: manifest.instanceName,
    templateName: manifest.templateName,
    templateContractVersion: manifest.templateContractVersion,
  };
}

export async function repositoryHealth() {
  const status = await repositoryStatus();
  let fsck: { ok: boolean; output: string };
  try {
    fsck = { ok: true, output: await git(["fsck", "--full", "--strict"], 60_000) };
  } catch (error) {
    fsck = { ok: false, output: (error as Error).message };
  }
  let content: { ok: boolean; output: string };
  try {
    const root = await repositoryRoot();
    const { stdout, stderr } = await execFile("node", ["scripts/verify-content.mjs"], { cwd: root, timeout: 60_000, maxBuffer: 5 * 1024 * 1024, windowsHide: true });
    content = { ok: true, output: (stdout + stderr).trim() };
  } catch (error) {
    const e = error as NodeJS.ErrnoException & { stderr?: string; stdout?: string };
    content = { ok: false, output: [e.stdout, e.stderr, e.message].filter(Boolean).join("\n") };
  }
  let remoteConnectivity: { ok: boolean; output: string };
  try {
    remoteConnectivity = { ok: true, output: await git(["ls-remote", "--heads", "origin"], 60_000) };
  } catch (error) {
    remoteConnectivity = { ok: false, output: (error as Error).message };
  }
  const expectedRemote = process.env.EXPECTED_PORTFOLIO_REMOTE || "https://github.com/Claritys11/RevisionedPortfolio";
  let staticOutput: { ok: boolean; output: string };
  try {
    const root = await repositoryRoot();
    const { stdout, stderr } = await execFile("node", ["scripts/verify-static-output.mjs"], { cwd: root, timeout: 60_000, maxBuffer: 5 * 1024 * 1024, windowsHide: true });
    staticOutput = { ok: true, output: (stdout + stderr).trim() };
  } catch (error) {
    const e = error as NodeJS.ErrnoException & { stderr?: string; stdout?: string };
    staticOutput = { ok: false, output: [e.stdout, e.stderr, e.message].filter(Boolean).join("\n") };
  }
  const normalizeRemote = (value: string) => value.replace(/\.git$/, "").replace(/\/$/, "").toLowerCase();
  return { ...status, fsck, content, staticOutput, remoteConnectivity, expectedRemote, remoteMatches: normalizeRemote(status.remote) === normalizeRemote(expectedRemote) };
}

export async function repositoryDiff() {
  const [trackedStat, trackedPatch, untrackedOutput, managedStatus] = await Promise.all([
    git(["diff", "HEAD", "--stat", "--", ...MANAGED_ROOTS]),
    git(["diff", "HEAD", "--no-ext-diff", "--", ...MANAGED_ROOTS], 30_000),
    git(["ls-files", "--others", "--exclude-standard", "-z", "--", ...MANAGED_ROOTS]),
    git(["status", "--short", "--untracked-files=all", "--", ...MANAGED_ROOTS]),
  ]);
  const untracked = untrackedOutput.split("\0").filter(Boolean);
  const maxPreviewBytes = 240_000;
  let previewBytes = 0;
  const untrackedPatches: string[] = [];

  for (const relative of untracked) {
    const absolute = await repoPath(relative);
    const info = await lstat(absolute);
    if (!info.isFile()) continue;
    const textFile = /\.(md|mdx|json|ya?ml|txt|csv)$/i.test(relative);
    if (!textFile) {
      untrackedPatches.push(`New binary asset: ${relative} (${info.size} bytes)`);
      continue;
    }
    if (previewBytes >= maxPreviewBytes) {
      untrackedPatches.push("Additional untracked text files omitted because the preview reached its size limit.");
      break;
    }
    const body = await readFile(absolute, "utf8");
    const remaining = maxPreviewBytes - previewBytes;
    const visibleBody = body.slice(0, remaining);
    previewBytes += Buffer.byteLength(visibleBody, "utf8");
    const lines = visibleBody.replace(/\r\n/g, "\n").split("\n");
    const patchLines = lines.map((line) => "+" + line).join("\n");
    untrackedPatches.push([
      `diff --git a/${relative} b/${relative}`,
      "new file mode 100644",
      "--- /dev/null",
      `+++ b/${relative}`,
      `@@ -0,0 +1,${lines.length} @@`,
      patchLines,
      visibleBody.length < body.length ? "\\ File preview truncated." : "",
    ].filter(Boolean).join("\n"));
  }

  const untrackedStat = untracked.length ? `Untracked managed files (${untracked.length}):\n${untracked.join("\n")}` : "";
  const stat = [trackedStat, untrackedStat].filter(Boolean).join("\n\n");
  const patch = [trackedPatch, ...untrackedPatches].filter(Boolean).join("\n\n");
  return { stat, patch, managedStatus };
}

export async function commitRepositoryChanges(subject: string) {
  const message = subject.trim();
  if (!message || message.length > 160 || /[\r\n\0]/.test(message)) {
    throw new RepositoryError("Commit message must be 1-160 characters on one line.", "INVALID_COMMIT_MESSAGE");
  }
  const cwd = await repositoryRoot();
  try {
    await execFile("node", ["scripts/verify-content.mjs"], { cwd, timeout: 60_000, maxBuffer: 5 * 1024 * 1024, windowsHide: true });
  } catch (error) {
    const e = error as NodeJS.ErrnoException & { stderr?: string; stdout?: string };
    throw new RepositoryError([e.stdout, e.stderr, e.message].filter(Boolean).join("\n"), "CONTENT_VALIDATION_FAILED");
  }
  await git(["diff", "--check", "HEAD", "--", ...MANAGED_ROOTS]);
  await git(["add", "--", "content", "public/assets"]);
  await git(["diff", "--cached", "--check", "--", ...MANAGED_ROOTS]);
  // --only prevents unrelated files already staged by the user from entering this commit.
  await git(["commit", "--only", "-m", message, "--", "content", "public/assets"]);
  return git(["status", "--short", "--branch"]);
}

export async function pushRepositoryChanges() {
  const [remote, branch] = await Promise.all([
    git(["remote", "get-url", "origin"]),
    git(["branch", "--show-current"]),
  ]);
  const expectedRemote = process.env.EXPECTED_PORTFOLIO_REMOTE || "https://github.com/Claritys11/RevisionedPortfolio";
  const normalizeRemote = (value: string) => value.replace(/\.git$/, "").replace(/\/$/, "").toLowerCase();
  if (normalizeRemote(remote) !== normalizeRemote(expectedRemote)) {
    throw new RepositoryError("Push blocked: origin does not match the configured portfolio repository.", "REMOTE_MISMATCH");
  }
  if (!branch) throw new RepositoryError("Push blocked: checkout is in detached HEAD state.", "DETACHED_HEAD");
  await git(["push"], 60_000);
  return git(["status", "--short", "--branch"]);
}
