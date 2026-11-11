import Link from "next/link";
import { listArticles, listProjects, listAchievements, getSiteConfig } from "@/lib/editor-content";
import { repositoryStatus } from "@/lib/editor-repository";

export default async function Dashboard() {
  const [articles, projects, achievements, site, git] = await Promise.all([
    listArticles({ includeDrafts: true }),
    listProjects(),
    listAchievements(),
    getSiteConfig(),
    repositoryStatus(),
  ]);
  const cards = [
    ["Writeups", articles.length, "/admin/writeups"],
    ["Published", articles.filter((item) => item.status === "published").length, "/admin/writeups"],
    ["Projects", projects.length, "/admin/projects"],
    ["Achievements", achievements.length, "/admin/achievements"],
  ] as const;
  return (
    <div className="grid gap-8">
      <header className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <p className="meta mb-2">local portfolio workspace</p>
          <h1 className="font-display text-4xl font-bold tracking-tight">Dashboard</h1>
          <p className="mt-2 text-sm text-muted-foreground">{site.url}</p>
        </div>
        <Link href="/admin/repository" className="meta underline underline-offset-4">repository status ↗</Link>
      </header>
      <div className="grid grid-cols-2 gap-px bg-border md:grid-cols-4">
        {cards.map(([label, number, href]) => (
          <Link key={label} href={href} className="bg-background p-5 hover:bg-secondary">
            <p className="meta">{label}</p>
            <p className="mt-2 font-display text-4xl font-black tabular-nums">{number}</p>
          </Link>
        ))}
      </div>
      <section className="grid gap-3">
        <h2 className="meta">recent writeups</h2>
        <ul className="divide-y divide-border border-y border-border">
          {articles.slice(0, 8).map((article) => (
            <li key={article.slug} className="flex items-center gap-3 py-3">
              <Link href={"/admin/writeups/" + article.slug} className="min-w-0 flex-1 truncate font-medium hover:text-primary">{article.title}</Link>
              <span className="meta">{article.category}</span>
              <span className={article.status === "published" ? "meta text-green-600" : "meta"}>{article.status}</span>
            </li>
          ))}
        </ul>
      </section>
      <section className="rounded-md border border-border p-4">
        <p className="meta mb-2">publishing target</p>
        <p className="font-mono text-sm">{git.branch || "detached HEAD"}</p>
        <p className="mt-1 break-all text-xs text-muted-foreground">{git.remote || "No origin remote configured"}</p>
        <p className="mt-3 text-xs text-muted-foreground">{git.status.split("\n").length - 1} working-tree change line(s). Saving edits files; commit and push are separate explicit actions.</p>
      </section>
    </div>
  );
}
