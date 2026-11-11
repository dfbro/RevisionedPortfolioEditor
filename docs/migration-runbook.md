# Legacy migration runbook

## Current implementation status

The Editor's **Migration tools** page is a read-only workbench. It lists source adapters and the safe migration pipeline, but it does not currently parse an archive, upload a dump, create a dry-run report or write imported records. Do not treat the menu as an executable importer.

The field mapping is documented in [migration-adapters.md](migration-adapters.md).

## 1. Choose a source

Preferred order:

1. An owner-authorized PostgreSQL custom-format dump or structured export from the old application.
2. A verified public-site snapshot plus the matching public upload store.
3. A reviewed Markdown/JSON export.

A public snapshot is incomplete by definition. It cannot recover private messages, access logs, unpublished drafts or all original metadata.

## 2. Preserve a backup

Before importing:
- obtain a database dump and upload archive from the system owner;
- record export timestamp and source version;
- verify the database dump with `pg_restore --list <backup.dump>`;
- calculate checksums (for example, `sha256sum <backup.dump> <uploads.tar.gz>`);
- store backups outside all Git repositories;
- never restore over the source database as part of a migration test.

The archived `restore.sh` uses `pg_restore --clean --if-exists`, which can remove/replace objects in the target database. Treat it as a destructive restore utility, not an export or migration command.

## 3. Legacy public-snapshot script

The one-time script is in the workspace archive, not in this editor repository:

`legacy-archive/website-runtime-2026-11-09/migrate-live-snapshot.py`

It requests the public sitemap, public HTML/Markdown exports and public upload paths. It writes output under the archive directory's own `content/`, `public/assets/uploads/` and `migration/live-public-snapshot-report.json`; it does not target the active production repository.

It defaults to the former domain. Always set `PORTFOLIO_SOURCE_URL` explicitly to an origin you are authorized to read:

```sh
cd /home/wilhelm/workspaceAI/RevisionedPortfolio
PORTFOLIO_SOURCE_URL=https://authorized-old-site.example \
  python3 legacy-archive/website-runtime-2026-11-09/migrate-live-snapshot.py
```

Do not run it against a third-party domain without authorization. Review its report and every incomplete asset. Copy only reviewed results into the production checkout after comparing them with the existing snapshot. The script's historical field assumptions are specific to the old site; it is not a general-purpose CMS importer.

## 4. Normalize and compare

A future importer should:
1. Parse source records into a versioned normalized DTO.
2. Preserve stable IDs, article slugs, dates, order and attachment metadata.
3. Validate required fields, duplicates, dates, MIME/signatures and all asset references.
4. Compare source records with production by ID/slug and report create/update/skip/conflict counts.
5. Produce a dry-run report with rejected records and missing assets.
6. Exclude `SecureMessage`, `AccessLog`, sessions, credentials and other private records.
7. Ask for explicit approval before staging changes in an isolated copy or temporary branch.
8. Run content validation, static build, output verification and diff review.
9. Merge approved content into production. Commit and push remain separate user actions.

Never import private data just because it exists in the old database. Public website visibility is a deliberate allow-list decision.

## 5. Manual file layout

The target format is:
- `content/site.json`: canonical URL, title, description, language and trailing slash.
- `content/profile.json`: identity, contact, skills, journey, education and SEO.
- `content/appearance.json`: theme, fonts, radius and color tokens.
- `content/projects.json`: project records.
- `content/achievements.json`: achievements and document references.
- `content/writeups/<slug>.md`: one article per slug, JSON-compatible frontmatter and Markdown/HTML body.
- `public/assets/uploads/`: public media and documents.

See [template content contract](../../RevisionedPortfolioTemplate/docs/content-contract.md).

## 6. Validate before production changes

From the production repository:

```sh
pnpm verify:content
pnpm check
pnpm verify:output
pnpm e2e
git diff --check
```

Reconcile content counts and attachment references with the source report. Review flags, challenge files, PDFs and every uploaded asset: all published fields/assets are public in the static site. Only after review should content be committed and pushed using the [Git publishing guide](git-and-publish.md).
