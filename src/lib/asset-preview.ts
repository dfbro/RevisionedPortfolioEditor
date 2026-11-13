/** Map website-owned assets to same-origin editor routes while retaining their canonical stored URL. */
export function editorAssetPreviewUrl(value: string): string {
  try {
    const parsed = new URL(value, "http://127.0.0.1:4317");
    const pathname = parsed.pathname;
    const marker = "/assets/uploads/";
    const index = pathname.lastIndexOf(marker);

    if (index >= 0) {
      const encodedName = pathname.slice(index + marker.length);
      if (!encodedName || encodedName.includes("/")) return value;
      const name = decodeURIComponent(encodedName);
      if (!name || name === "." || name === ".." || /[\\/\0]/.test(name)) return value;
      return "/api/admin/upload/" + encodeURIComponent(name);
    }

    // Root-relative files such as /profile.jpg live in the portfolio repository, not the editor's public/.
    if (value.startsWith("/") && !value.startsWith("//")) {
      return "/api/admin/public-preview?path=" + encodeURIComponent(pathname);
    }
    return value;
  } catch {
    return value;
  }
}

export function isPdfAssetUrl(value: string | null | undefined): boolean {
  if (!value) return false;
  try {
    return new URL(value, "http://127.0.0.1:4317").pathname.toLowerCase().endsWith(".pdf");
  } catch {
    return false;
  }
}
