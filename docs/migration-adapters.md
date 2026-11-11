# Legacy migration adapters

This editor writes only the configured production repository. Migration adapters must normalize their source into the file contract before any production write.

## Reverse-engineered legacy source

The archived application used Prisma with PostgreSQL. Its schema is retained under the workspace-level `legacy-archive/website-runtime-2026-11-09/prisma/schema.prisma`.

| Legacy model / table | Legacy fields | File destination | Notes |
| --- | --- | --- | --- |
| `Writeup` / `writeups` | `id`, `slug`, `title`, `competition`, `category`, `difficulty`, `date`, `summary`, `content`, `flag`, `tagsJson`, `attachmentsJson`, `updatedAt` | `content/writeups/<slug>.md` | Preserve stable slug; map tags/attachments JSON; use `updatedAt` for `updated`; keep content in Markdown body |
| `Project` / `projects` | `id`, `title`, `description`, `imageUrl`, `projectUrl`, `category`, `tagsJson` | `content/projects.json` | Preserve source ID unless a deliberate stable-ID migration is needed |
| `Achievement` / `achievements` | `id`, `title`, `issuer`, `platform`, `description`, `imageUrl`, `date`, `proofScore`, `sortOrder`, `documentUrl` | `content/achievements.json` | Preserve the explicit ordering; current file order is presentation order |
| `ProfileSettings` / `profile_settings` | singleton `main`, identity/contact fields, `technicalArsenalJson`, `professionalJourneyJson`, `educationHistoryJson`, `seoSettingsJson` | `content/profile.json` and `content/site.json` | Map navbar brand mode/name into `brand`; keep unknown SEO keys in the normalized review model until intentionally mapped |
| `SecureMessage` / `secure_messages` | private contact message records | **Never to public content** | Private inbox records are not part of the public portfolio |
| `AccessLog` / `access_logs` | username, timestamp, success, IP | **Never to public content** | Operational/security telemetry is not portfolio content |

The live public snapshot script at `legacy-archive/website-runtime-2026-11-09/migrate-live-snapshot.py` is a separate, lower-fidelity adapter. It reads the sitemap, public HTML, Markdown exports and public upload paths. The recorded snapshot found 56 writeups, 12 projects and 32 achievements. It does not recover unpublished drafts, private messages, access logs or every original database field. It must not be treated as a PostgreSQL backup.

## Source selection

1. **Preferred:** owner-authorized PostgreSQL dump or structured application export, with an independently verified backup and table counts.
2. **Fallback:** verified public snapshot plus the matching original public upload store.
3. **Manual fallback:** Markdown/JSON export from an editor/content system.

Never infer or import private records from public page markup. Do not query hidden endpoints or bypass authentication.

## Adapter pipeline

Future panel tools should implement these stages:

1. Select a source type and provide a local archive/dump or authorized export.
2. Parse into a versioned normalized DTO; do not write to the production repository yet.
3. Validate required fields, date formats, duplicate IDs/slugs, MIME/signatures and every asset reference.
4. Compare source entities with production files by stable ID/slug and show create/update/skip/conflict counts.
5. Generate a dry-run report, including rejected records and unresolved assets.
6. Require an explicit user approval before staging changes in an isolated temporary workspace.
7. Run content verification, static build, output verification and diff review.
8. Only then make approved changes to the configured production repository. Commit and push remain separate, explicit actions.

The adapter must never mutate the template repository. It must never delete the production database or original uploads. Keep the source archive and report for rollback/audit until the owner closes the migration.
