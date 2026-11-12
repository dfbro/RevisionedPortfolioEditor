# RevisionedPortfolioEditor

A local-only CMS for the maintained static portfolio repository. The editor keeps no editorial database: the configured production Git repository is the content source of truth.

## Run

```sh
pnpm install
pnpm dev
```

The app binds to `127.0.0.1:4317`. Do not expose it through LAN, a tunnel or a public reverse proxy.

Start with [docs/editor-guide.md](docs/editor-guide.md) for the CRUD workflow and [docs/git-and-publish.md](docs/git-and-publish.md) for review, Commit, Push and deployment verification.

## Three-repository model

| Repository | Role | Editor access |
| --- | --- | --- |
| `RevisionedPortfolioEditor` | Local CMS, forms, import adapters and Git actions | Application source; loopback-only runtime |
| `RevisionedPortfolioTemplate` | Reusable static site source and versioned content contract | Read-only compatibility check |
| `RevisionedPortfolio` | Production website source, content/assets, static build, and GitHub Pages deployment | Read/write; only editor commit/push target |

The editor defaults to sibling `../RevisionedPortfolio` for production and `../RevisionedPortfolioTemplate` for the template. Configure overrides in a local `.env.local`:

- `PORTFOLIO_REPO_PATH`: the only repository the editor may write, commit and push.
- `PORTFOLIO_TEMPLATE_PATH`: template repository path, inspected read-only.
- `EXPECTED_PORTFOLIO_REMOTE`: exact production `origin` URL accepted by the Push guard; defaults to `https://github.com/dfbro/RevisionedPortfolio`.

A template manifest with `role: template` is rejected as a write target. Do not point both environment variables to the same checkout.

## Features

- Writeup CRUD with Markdown/frontmatter, import tools and draft/published state.
- Project and achievement CRUD.
- Profile, SEO and appearance editor.
- Central site deployment settings: canonical origin, base path (`/` by default), fixed static output `dist`, trailing-slash policy, and metadata.
- Explicit GitHub Pages custom-domain synchronization with a browser confirmation; existing workflow publishing mode/source are preserved.
- Public asset manager.
- Production Git status, managed-path diff, validation, explicit commit and guarded push.
- Template identity and content contract compatibility check.
- Migration Tools workbench with the legacy schema map and future adapter pipeline.

## Legacy migration

See [docs/migration-runbook.md](docs/migration-runbook.md) and [docs/migration-adapters.md](docs/migration-adapters.md). The old backend used Prisma/PostgreSQL. Database exports are the preferred source for a complete migration; public endpoint scraping is only a lower-fidelity fallback. The Migration Tools panel is currently a read-only architecture/workflow scaffold: no importer writes production data yet.

## Safety

- API mutation endpoints require the local Host and matching Origin.
- The server binds to loopback only.
- Repository path traversal and symlink escape are rejected.
- A marked template repository cannot be configured as the write target.
- Asset files are checked by size, extension, MIME and signature.
- Content saves use SHA-256 optimistic concurrency; stale files are rejected.
- Commit runs content validation and Git diff checks first.
- Commit stages only `content/` and `public/assets/`.
- Push verifies `origin` against `EXPECTED_PORTFOLIO_REMOTE`.
- Diagnostics never reset, clean, rebase or repair Git state.

The source production repository remains the only source of content truth. The public static site is built from that repository's `dist/` artifact; there is no separate active `RevisionedPortfolioSite` Git repository. The editor's GitHub Pages action changes only the repository custom-domain setting. DNS records and TLS activation are separate infrastructure operations. Template files are not synchronized automatically, and migration imports require a future dry-run/approval workflow before production writes.

## Documentation

- [Editor guide: CRUD, profile, appearance and assets](docs/editor-guide.md)
- [Git and publishing: diff, Commit, Push and GitHub Actions](docs/git-and-publish.md)
- [Migration runbook](docs/migration-runbook.md)
- [Legacy schema and adapter mapping](docs/migration-adapters.md)
- [Workspace operations](../docs/WORKSPACE-GUIDE.md)
