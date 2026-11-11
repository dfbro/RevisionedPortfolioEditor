const adapters = [
  {
    title: "PostgreSQL / Prisma export",
    status: "preferred",
    description: "Parse an owner-authorized database dump or structured export, preserve source IDs and timestamps, and map public entities into the content file contract.",
    entities: "Writeup · Project · Achievement · ProfileSettings",
    note: "SecureMessage and AccessLog are explicitly excluded from public migration."
  },
  {
    title: "Public website snapshot",
    status: "fallback",
    description: "Parse sitemap entries, public article exports, visible project/achievement pages and public upload paths.",
    entities: "Published writeups · Visible projects · Visible achievements",
    note: "Cannot restore drafts, private records, or all original metadata; it is not a database backup."
  },
  {
    title: "Markdown / JSON archive",
    status: "planned",
    description: "Import a normalized folder/archive of Markdown articles, profile JSON, project JSON, achievement JSON and associated assets.",
    entities: "File-backed content",
    note: "Requires schema detection and an asset-reference reconciliation report."
  }
] as const;

const stages = [
  "Source selection and archive verification",
  "Parse into a versioned normalized DTO",
  "Schema, ID/slug, MIME and asset validation",
  "Compare with production and resolve conflicts",
  "Dry-run report and rejected-record review",
  "Explicit approval before isolated staging",
  "Content validation, static build and diff review",
  "Separate commit and push actions"
];

export default function MigrationToolsPage() {
  return (
    <div className="grid gap-8">
      <header>
        <p className="meta mb-2">migration workbench · read-only plan</p>
        <h1 className="font-display text-4xl font-bold tracking-tight">Migration Tools</h1>
        <p className="mt-2 max-w-3xl text-sm text-muted-foreground">
          Source adapters normalize legacy data into the production file contract. No importer is enabled yet; this page records the supported source formats and the required safety pipeline before any production write.
        </p>
      </header>

      <section className="grid gap-3">
        <h2 className="meta">source adapters</h2>
        <div className="grid gap-3">
          {adapters.map((adapter) => (
            <article key={adapter.title} className="rounded-md border border-border p-4">
              <div className="flex flex-wrap items-center justify-between gap-3">
                <h3 className="font-medium">{adapter.title}</h3>
                <span className="meta rounded-full border border-border px-2 py-1">{adapter.status}</span>
              </div>
              <p className="mt-2 text-sm text-muted-foreground">{adapter.description}</p>
              <p className="meta mt-3">{adapter.entities}</p>
              <p className="mt-2 text-xs text-muted-foreground">{adapter.note}</p>
            </article>
          ))}
        </div>
      </section>

      <section className="grid gap-3">
        <h2 className="meta">required execution pipeline</h2>
        <ol className="grid gap-2">
          {stages.map((stage, index) => (
            <li key={stage} className="flex items-start gap-3 rounded-md border border-border px-3 py-3">
              <span className="meta text-primary">{String(index + 1).padStart(2, "0")}</span>
              <span className="text-sm">{stage}</span>
            </li>
          ))}
        </ol>
      </section>

      <section className="rounded-md border border-border p-4">
        <h2 className="meta">production safety boundary</h2>
        <p className="mt-2 text-sm text-muted-foreground">
          The configured production repository is the only write target. Template is read-only. Migration runs must begin with a dry run and isolated staging; saving content, committing, pushing, deleting the source database, or changing DNS are separate operations.
        </p>
      </section>
    </div>
  );
}
