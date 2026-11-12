"use client";

import { useEffect } from "react";
import { toast } from "sonner";
import { useFormAction } from "@/components/admin/use-form-action";
import { Field } from "@/components/admin/field";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { saveSettings, syncGithubPagesDomain } from "@/lib/admin/actions/settings";
import type { EditorAppearance, EditorSite } from "@/lib/editor-content";

const COLOR_LABELS = [
  ["background", "Background"],
  ["foreground", "Foreground"],
  ["card", "Card"],
  ["primary", "Primary / accent"],
  ["secondary", "Secondary"],
  ["muted", "Muted"],
  ["mutedForeground", "Muted text"],
] as const;

export function SettingsForm({ site, appearance, siteHash, appearanceHash }: { site: EditorSite; appearance: EditorAppearance; siteHash: string; appearanceHash: string }) {
  const [state, action, pending] = useFormAction(saveSettings);
  const [pagesState, pagesAction, pagesPending] = useFormAction(syncGithubPagesDomain);
  useEffect(() => {
    if (state.ok && state.message) toast.success(state.message);
  }, [state]);
  useEffect(() => {
    if (pagesState.ok && pagesState.message) toast.success(pagesState.message);
  }, [pagesState]);
  const errors = state.fields ?? {};
  return (
    <div className="grid max-w-4xl gap-8">
      <form onSubmit={action} className="grid gap-8">
        <input type="hidden" name="siteHash" value={siteHash} />
        <input type="hidden" name="appearanceHash" value={appearanceHash} />
        <section className="grid gap-4">
          <h2 className="meta">Site identity & deployment</h2>
          <Field label="Canonical origin" name="url" error={errors.url}>
            <Input id="url" name="url" type="url" defaultValue={site.url} required />
          </Field>
          <p className="-mt-2 text-xs text-muted-foreground">Origin only, e.g. https://dfbro.my.id. Do not append a repository or page path.</p>
          <Field label="Base path" name="basePath" error={errors.basePath}>
            <Input id="basePath" name="basePath" defaultValue={site.basePath || "/"} required />
          </Field>
          <p className="-mt-2 text-xs text-muted-foreground">Use `/` for a custom domain or user site. Use `/repository-name` only for a GitHub Pages project site without a custom domain.</p>
          <div className="grid gap-4 md:grid-cols-2">
            <Field label="Build output directory" name="outputDirectory">
              <Input id="outputDirectory" value="dist" readOnly aria-readonly="true" />
            </Field>
            <Field label="Trailing slash" name="trailingSlash">
              <select id="trailingSlash" name="trailingSlash" defaultValue={String(site.trailingSlash)} className="h-9 rounded-md border border-input bg-transparent px-3 text-sm">
                <option value="true">Enabled</option>
                <option value="false">Disabled</option>
              </select>
            </Field>
          </div>
          <Field label="Site title" name="title" error={errors.title}>
            <Input id="title" name="title" defaultValue={site.title} required />
          </Field>
          <Field label="Description" name="description" error={errors.description}>
            <Textarea id="description" name="description" rows={3} defaultValue={site.description} />
          </Field>
          <div className="grid gap-4 md:grid-cols-2">
            <Field label="HTML language" name="language" error={errors.language}>
              <Input id="language" name="language" defaultValue={site.language} />
            </Field>
            <Field label="Default colour theme" name="defaultTheme">
              <select id="defaultTheme" name="defaultTheme" defaultValue={appearance.defaultTheme} className="h-9 rounded-md border border-input bg-transparent px-3 text-sm">
                <option value="dark">Dark</option>
                <option value="light">Light</option>
              </select>
            </Field>
          </div>
        </section>
        <section className="grid gap-4">
          <h2 className="meta">Light palette</h2>
          <div className="grid gap-3 sm:grid-cols-2">
            {COLOR_LABELS.map(([key, label]) => (
              <Field key={key} label={label + " — " + appearance.colors.light[key]} name={"light." + key} error={errors["light"]}>
                <div className="flex items-center gap-3 rounded-md border border-border p-2">
                  <input type="color" name={"light." + key} defaultValue={appearance.colors.light[key]} className="h-9 w-12 cursor-pointer rounded border-0 bg-transparent" aria-label={label + " light colour"} />
                  <code className="text-xs">{appearance.colors.light[key]}</code>
                </div>
              </Field>
            ))}
          </div>
        </section>
        <section className="grid gap-4">
          <h2 className="meta">Dark palette</h2>
          <div className="grid gap-3 sm:grid-cols-2">
            {COLOR_LABELS.map(([key, label]) => (
              <Field key={key} label={label + " — " + appearance.colors.dark[key]} name={"dark." + key} error={errors["dark"]}>
                <div className="flex items-center gap-3 rounded-md border border-border p-2">
                  <input type="color" name={"dark." + key} defaultValue={appearance.colors.dark[key]} className="h-9 w-12 cursor-pointer rounded border-0 bg-transparent" aria-label={label + " dark colour"} />
                  <code className="text-xs">{appearance.colors.dark[key]}</code>
                </div>
              </Field>
            ))}
          </div>
        </section>
        {state.message && !state.ok && <p className="text-sm text-destructive">{state.message}</p>}
        <p className="text-xs text-muted-foreground">Site configuration and appearance are written to the production repository. A new build is required for static metadata, assets, sitemap, and base-path changes to take effect.</p>
        <Button type="submit" disabled={pending} className="w-fit">{pending ? "Saving…" : "Save site settings"}</Button>
      </form>
      <section className="grid gap-3 border-t border-border pt-6">
        <h2 className="meta">GitHub Pages domain</h2>
        <p className="text-sm text-muted-foreground">Apply the saved canonical hostname to the configured production repository. This changes GitHub Pages settings only; DNS records are managed separately.</p>
        <form onSubmit={(event) => {
          if (!window.confirm(`Update this repository's GitHub Pages custom domain to ${new URL(site.url).hostname}? The existing workflow publishing source will be preserved. This action does not edit DNS.`)) {
            event.preventDefault();
            return;
          }
          pagesAction(event);
        }}>
          <Button type="submit" disabled={pagesPending || site.basePath !== "/"} variant="secondary" className="w-fit">
            {pagesPending ? "Checking GitHub Pages…" : "Sync custom domain to GitHub Pages"}
          </Button>
        </form>
        {site.basePath !== "/" && <p className="text-xs text-muted-foreground">Set base path to `/` before applying a custom domain.</p>}
        {pagesState.message && <p className={`text-sm ${pagesState.ok ? "text-muted-foreground" : "text-destructive"}`}>{pagesState.message}</p>}
      </section>
    </div>
  );
}
