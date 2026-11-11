# ElaangPortfolioEditor

A local-only editor for the sibling ElaangPortofolio website repository.

## Run

    pnpm install
    pnpm dev

The app binds to 127.0.0.1:4317. Keep it local; do not expose through LAN, tunnel or public reverse proxy.

## Architecture

This is a local Next.js App Router application so it can reuse the old admin UI, forms, fonts, global CSS, Tiptap editor and Shadcn/Radix components at high visual fidelity.

It reads MD/JSON content from the configured website repository, builds view models in memory and writes changes directly to files. It has no editorial database. The default target is ../ElaangPortofolio; PORTFOLIO_REPO_PATH can override it in local environment.

The editor UI includes:
- dashboard and current repository status;
- writeup CRUD with draft/published status, Tiptap and import tools;
- project CRUD;
- achievement CRUD and reorder;
- profile and SEO editor;
- domain and light/dark color palette editor;
- public assets manager;
- repository status, diff, Git object/content/remote health diagnostics;
- explicit commit and push.

## Safety

- API mutation endpoints require the local Host and matching Origin.
- The server binds to loopback only.
- Repository path traversal and symlink escape are rejected.
- Asset files are checked by size, extension, MIME and signature.
- Content saves use SHA-256 optimistic concurrency; stale files are rejected.
- Commit runs content validation and Git diff checks first.
- Diagnostics are read-only. No git reset/clean/rebase or auto-repair.
- Commit stages only content/ and public/assets/.

The website repository is the only source of content truth. Do not add a database as a second content store.
