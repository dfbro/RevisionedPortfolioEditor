# Local editor guide

## 1. Start and open the editor

From the editor repository:

```sh
pnpm install --frozen-lockfile
pnpm dev
```

Open [http://127.0.0.1:4317/admin](http://127.0.0.1:4317/admin). The server binds to loopback. Keep it local: the editor has no login/password system and must not be exposed through a tunnel, LAN, public reverse proxy or internet.

The expected sibling repositories are:
- `../RevisionedPortfolio`: production; the only writable repository.
- `../RevisionedPortfolioTemplate`: template; read-only compatibility inspection.

For non-default paths, copy `.env.example` to `.env.local` and set `PORTFOLIO_REPO_PATH`, `PORTFOLIO_TEMPLATE_PATH` and `EXPECTED_PORTFOLIO_REMOTE`.

## 2. Navigation

| Menu | What it edits |
| --- | --- |
| Dashboard | Content counts and editor overview |
| Writeups | Markdown article CRUD and draft/published status |
| Projects | Project cards and links |
| Achievements | Certificates, proof metadata and display order |
| Profile | Owner identity, contact, skills, journey, education and SEO |
| Appearance & SEO | Site URL/title/language, theme, fonts and color palette |
| Assets | Files under `public/assets/uploads/` |
| Migration tools | Read-only adapter plan; no active importer |
| Repository health | Root/remote checks, template compatibility, diff, doctor, commit and push |

Use **Refresh repository data** in the sidebar after editing files outside the editor. This refreshes the current local view; it does not contact GitHub. The Editor server also fetches its configured `origin` once at startup. For an immediate cross-device sync, use **Fetch remote** in Repository health. There is no persistent CMS database or guaranteed filesystem watcher.

## 3. Writeups: create, edit, publish, delete

1. Open **Writeups → New writeup**.
2. Enter a title. Leave slug blank only if you want the editor's generated slug; otherwise use lowercase words separated by hyphens.
3. Set category, competition, difficulty, date, summary and tags.
4. Write or paste the article body in the rich editor. You can import a PDF as a starting point, then review the extracted title, metadata and body before saving.
5. Add image references and attachments. Uploaded images are stored in `public/assets/uploads/`.
6. Choose **Draft** while work is unfinished. Choose **Published** only when ready for public release.
7. Select **Save writeup**.

To edit an article, select its title in the Writeups list, make changes, and save. The list shows draft/published state; the `view` link is shown for published articles.

To delete, use the row's Delete action and confirm. Deleting an article does not guarantee that unused attachments are automatically removed; check references before deleting assets.

**Public disclosure:** published article text, frontmatter flags, attachments and linked public assets are included in the static website. The flag reveal control is visual only; it is not confidentiality protection.

## 4. Projects and achievements

**Projects**
- Open **Projects → New project** or select an existing row.
- Fill title, category, description, image, project URL and comma-separated tags.
- Save the project. The record is written to `content/projects.json`.

**Achievements**
- Open **Achievements → New achievement** or select an existing record.
- Fill title, issuer, platform, date, description and proof score.
- Upload a certificate image or PDF with the Certificate field.
- Save. Change the list order in the Achievements page; use **Save order** when the order is correct.
- Records are stored in `content/achievements.json`.

## 5. Profile and appearance

**Profile** edits display name, alias/brand, email, website/social links, profile image, biography, quote, skills, journey, education and SEO metadata. **Hero name line groups** controls the homepage name layout: enter one visual line per row, keeping the complete display name in its original word order (for example, `Elang` / `Dimas Syadewa`, or three lines `Elang` / `Dimas` / `Syadewa`). The separate **GitHub activity username** controls which public account the static build uses for the contribution heatmap; when left blank, the build derives the login from the GitHub profile URL. Array editors preserve the order shown.

**Appearance & SEO** edits the canonical site URL, language, title/description, trailing-slash setting, default theme, typography, radius and light/dark color tokens.

The published project URL is currently `https://dfbro.github.io/RevisionedPortfolioSite/`. The editor still writes only to the source repository `RevisionedPortfolio`; the source workflow derives `basePath`, canonical metadata, sitemap, robots and article exports from the `STATIC_SITE_REPOSITORY` Actions variable. Do not treat a profile website link as a DNS or Pages configuration change.

## 6. Assets

The Assets page writes uploads directly to `public/assets/uploads/`. Supported formats are checked by size, extension, MIME and file signature. Each row shows a local preview served by the Editor from the configured Portfolio checkout, while **Copy public URL** copies the canonical website URL (including the configured base path). The public URL is suitable for published content; the local preview URL is only for the loopback Editor and is not saved into content. Files are public after deployment.

Do not delete an asset while an article, project, achievement or profile field still references it: the UI warns that existing references will break. Replace references first, save, then delete the old file.

## 7. Save and conflicts

Save writes directly into the production working tree. It does **not**:
- create a Git commit;
- push to GitHub;
- trigger GitHub Actions;
- deploy the website.

Forms carry a SHA-256 snapshot. If another process changes the same source file after the form was opened, the editor rejects the stale save with an edit-conflict error. Refresh repository data and reopen the item; do not try to overwrite the newer content blindly.

## 8. Sync across devices

Each device must have its own clone of the same production repository and use the same branch/upstream. Configure `PORTFOLIO_REPO_PATH` and `EXPECTED_PORTFOLIO_REMOTE` in that device's `.env.local`; the expected remote must match the configured production repo's `origin`.

- On Editor server boot, it fetches `origin` and fast-forwards the current branch only when the working tree is clean and it is strictly behind its `origin/*` upstream.
- In **Repository health**, select **Fetch remote** to run the same check while the Editor is open.
- If there are uncommitted changes, the remote refs are fetched but local files are not changed. Save/commit or otherwise reconcile the local work, then fetch again.
- If local and remote commits have diverged, the Editor reports the mismatch and does not rebase, merge, reset or overwrite either side. Reconcile the branch manually in Git.
- Fetch never pushes. Review and use the separate Commit and Push actions to publish changes.

Set `EDITOR_AUTO_FETCH=false` to disable startup fetch on a device. The manual **Fetch remote** action remains available.

## 9. Migration tools

The **Migration tools** page is currently a read-only workbench. It documents PostgreSQL/Prisma, public snapshot and Markdown/JSON adapter options and the required dry-run/staging pipeline. It has no file picker or import action yet. See [Migration runbook](migration-runbook.md) before handling a legacy export.

## 10. Finish the publishing cycle

After saving, follow [Git and publish](git-and-publish.md). Do not stop at Save if you expect the public site to change.
