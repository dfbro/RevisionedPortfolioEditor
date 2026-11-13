import "server-only";

/**
 * The editor is a local-only application. The process must bind to 127.0.0.1;
 * there is no public login/session or database-backed account system.
 * Mutation endpoints additionally validate Host and Origin.
 */
export async function requireAdmin() {
  return { username: "local" };
}

export function requireAdminApi(request: Request): Response | null {
  const host = request.headers.get("host")?.toLowerCase() ?? "";
  const origin = request.headers.get("origin");
  const allowedHosts = new Set(["127.0.0.1:4317", "localhost:4317"]);
  if (!allowedHosts.has(host)) return Response.json({ error: "Local editor host only." }, { status: 403 });
  if (!origin) return Response.json({ error: "Origin header required." }, { status: 403 });
  try {
    const parsed = new URL(origin);
    if (parsed.host.toLowerCase() !== host || parsed.protocol !== "http:") {
      return Response.json({ error: "Cross-origin request rejected." }, { status: 403 });
    }
  } catch {
    return Response.json({ error: "Invalid Origin header." }, { status: 403 });
  }
  return null;
}

/** Same-origin read access for image/document previews requested by native browser elements. */
export function requireAdminReadApi(request: Request): Response | null {
  const host = request.headers.get("host")?.toLowerCase() ?? "";
  const allowedHosts = new Set(["127.0.0.1:4317", "localhost:4317"]);
  if (!allowedHosts.has(host)) return Response.json({ error: "Local editor host only." }, { status: 403 });

  const origin = request.headers.get("origin");
  if (origin) {
    try {
      const parsed = new URL(origin);
      if (parsed.host.toLowerCase() !== host || parsed.protocol !== "http:") {
        return Response.json({ error: "Cross-origin request rejected." }, { status: 403 });
      }
    } catch {
      return Response.json({ error: "Invalid Origin header." }, { status: 403 });
    }
  }

  const fetchSite = request.headers.get("sec-fetch-site");
  if (fetchSite && fetchSite !== "same-origin" && fetchSite !== "none") {
    return Response.json({ error: "Cross-site preview request rejected." }, { status: 403 });
  }
  if (!origin && !fetchSite) {
    return Response.json({ error: "Same-origin browser metadata required for asset previews." }, { status: 403 });
  }
  return null;
}
