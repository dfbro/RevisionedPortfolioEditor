# Editor Git and publishing guide

## 1. Understand the four stages

| Stage | Operation | Result |
| --- | --- | --- |
| Save | Editor form action | Changes files in the local production checkout |
| Commit | Repository health action | Creates a local Git commit |
| Fetch | Editor startup or Repository health action | Fetches `origin`; fast-forwards only a clean branch that is behind its `origin/*` upstream |
| Push | Repository health action | Sends existing local commits to `origin` |
| Build | GitHub Actions in `RevisionedPortfolio` | Runs validation and creates the `out/` static export |
| Publish | Publish job in the same workflow | Transfers `out/` to `RevisionedPortfolioSite` using a dedicated cross-repository token |
| Pages | Branch publishing in `RevisionedPortfolioSite` | Serves `main` → `/(root)` |

The editor never commits or pushes automatically. Startup fetch is enabled by default; it does not overwrite dirty or diverged work.

## 2. Check repository identity first

Open **Repository health**. Confirm:
- Production root is the expected `RevisionedPortfolio` checkout.
- Production remote is `https://github.com/dfbro/RevisionedPortfolio`.
- Current branch is `main`, not detached HEAD.
- Template root points to `RevisionedPortfolioTemplate`.
- Template/production contract versions match (currently v1).

The template is read-only. Commit and Push buttons target only the production repository.

## 3. Review changes

1. Save your edits in the relevant editor pages.
2. Open Repository health.
3. Check the working-tree listing.
4. Select **Show diff**.
5. Review the stat and patch. New text files are shown as additions; binary assets are listed with file size.
6. Check asset paths and ensure no accidental files or secrets are being published.

If you changed website source code, workflow files or docs directly in the production repository, review those changes in a terminal. The editor's managed commit is intentionally limited to `content/` and `public/assets/`.

## 3a. Fetch from another device

The Next.js Node server fetches `origin` once when it boots. To check for changes without restarting, open **Repository health** and select **Fetch remote**. Both paths use the same guarded behavior:

- `origin` must match `EXPECTED_PORTFOLIO_REMOTE`;
- the current branch must have an upstream under `origin/*`;
- a clean branch behind its upstream is updated with `git merge --ff-only`;
- uncommitted changes, local-only commits or diverged history are reported without rewriting local files or commits.

For more than one editing device, give each device a separate clone of the production repository, use the same branch/upstream, and fetch before starting a new editing session. Commit and Push remain explicit. If a device reports divergence, reconcile it manually in Git before continuing; do not use reset to force one device over another.

Set `EDITOR_AUTO_FETCH=false` in `.env.local` to disable the startup fetch. The manual action remains enabled.

## 4. Run repository health

Select **Run health check**. The current doctor checks:
- repository root and expected remote;
- `git fsck --full --strict` object integrity;
- content validation;
- static-output validation against the current `out/` build;
- remote reachability;
- `git diff --check`;
- working-tree state.

The doctor is diagnostic, not a repair tool. It never resets, cleans, rebases, prunes or repairs Git. If it detects corruption, stop and preserve a copy before attempting recovery.

## 5. Commit

Before committing, run the full production checks in a terminal when feasible:

```sh
cd ../RevisionedPortfolio
pnpm check
pnpm verify:content
pnpm verify:output
pnpm e2e
```

Then return to **Repository health**:
1. Enter a one-line commit message (1–160 characters).
2. Select **Commit content + assets**.
3. The editor re-runs content validation and whitespace checks.
4. It stages only `content/` and `public/assets/`; unrelated staged files are not included.
5. Verify the new commit and status.

For website source changes (for example `next.config.ts`, scripts, workflows or documentation), use Git from the production repo terminal instead. Do not expect the editor's scoped commit to include them.

## 6. Push

The editor Push action executes `git push` for the current branch after checking:
- `origin` equals `EXPECTED_PORTFOLIO_REMOTE`;
- branch is not detached.

Default expected remote:
`https://github.com/dfbro/RevisionedPortfolio`

For a different production remote, set `EXPECTED_PORTFOLIO_REMOTE` in `RevisionedPortfolioEditor/.env.local`, restart the editor and verify the expected/actual remote in Repository health. Do not disable the guard to force a push.

After pushing, verify with:

```sh
cd ../RevisionedPortfolio
git status --short --branch
git log -1 --oneline
git ls-remote origin refs/heads/main
```

## 7. Deployment verification

Every push to source `main` triggers `.github/workflows/pages.yml`. Follow both jobs:

```sh
gh run list --repo dfbro/RevisionedPortfolio --workflow pages.yml --limit 5
gh run watch <run-id> --repo dfbro/RevisionedPortfolio
```

Both `build` and `publish` must succeed. The published site is [https://dfbro.github.io/RevisionedPortfolioSite/](https://dfbro.github.io/RevisionedPortfolioSite/). Verify the homepage, one nested writeup, one image and sitemap.

The source repository uses Actions variables `STATIC_SITE_REPOSITORY=dfbro/RevisionedPortfolioSite` and `STATIC_SITE_BRANCH=main`, plus secret `STATIC_SITE_DEPLOY_TOKEN`. The secret must be a fine-grained PAT restricted to the static repository with Contents read/write; see the [source deployment guide](../../RevisionedPortfolio/docs/github-pages.md). Do not substitute the source repository's `GITHUB_TOKEN` because branch-based GitHub Pages does not build from commits pushed with that token.

## 8. Common failures

- **Push blocked: remote mismatch:** inspect `git remote -v` and `EXPECTED_PORTFOLIO_REMOTE`. Do not push to an unfamiliar remote.
- **Detached HEAD:** switch to the intended branch through normal Git operations after checking current state.
- **Content validation failed:** fix invalid JSON/frontmatter, duplicate slugs, date format or missing assets.
- **Static output check failed:** rebuild using `pnpm build`, then rerun `pnpm verify:output`.
- **Git conflict / stale form:** refresh repository data, reopen the file and reconcile the external edit.
- **Build succeeds but publish fails:** inspect `STATIC_SITE_REPOSITORY`, `STATIC_SITE_BRANCH` and the `STATIC_SITE_DEPLOY_TOKEN` secret. Confirm the token can push to the target repository's configured Pages branch.
- **Target commit succeeds but Pages has not updated:** check `RevisionedPortfolioSite` → Settings → Pages uses `main` and `/(root)` and inspect the Pages build status.
- **Pages workflow failed:** inspect the failed Actions step; do not assume a successful source Git push means a successful publication.
