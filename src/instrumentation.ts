export async function register() {
  if (process.env.NEXT_RUNTIME !== "nodejs") return;
  if (process.env.EDITOR_AUTO_FETCH?.trim().toLowerCase() === "false") {
    console.info("[editor] startup remote fetch disabled by EDITOR_AUTO_FETCH=false");
    return;
  }

  try {
    const { fetchPortfolioRemote } = await import("./lib/editor-repository");
    const result = await fetchPortfolioRemote();
    console.info(`[editor] startup remote fetch: ${result.message}`);
  } catch (error) {
    console.warn("[editor] startup remote fetch failed; local files were left in place:", error);
  }
}
