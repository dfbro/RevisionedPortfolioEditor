"use client";

import { useEffect } from "react";
import { toast } from "sonner";
import { useFormAction } from "@/components/admin/use-form-action";
import { Field } from "@/components/admin/field";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { saveSettings } from "@/lib/admin/actions/settings";
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
  useEffect(() => {
    if (state.ok && state.message) toast.success(state.message);
  }, [state]);
  const errors = state.fields ?? {};
  return (
    <form onSubmit={action} className="grid max-w-4xl gap-8">
      <input type="hidden" name="siteHash" value={siteHash} />
      <input type="hidden" name="appearanceHash" value={appearanceHash} />
      <section className="grid gap-4">
        <h2 className="meta">Site identity</h2>
        <Field label="Canonical domain" name="url" error={errors.url}>
          <Input id="url" name="url" type="url" defaultValue={site.url} required />
        </Field>
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
          <Field label="Trailing slash" name="trailingSlash">
            <select id="trailingSlash" name="trailingSlash" defaultValue={String(site.trailingSlash)} className="h-9 rounded-md border border-input bg-transparent px-3 text-sm">
              <option value="true">Enabled</option>
              <option value="false">Disabled</option>
            </select>
          </Field>
        </div>
        <Field label="Default colour theme" name="defaultTheme">
          <select id="defaultTheme" name="defaultTheme" defaultValue={appearance.defaultTheme} className="h-9 rounded-md border border-input bg-transparent px-3 text-sm">
            <option value="dark">Dark</option>
            <option value="light">Light</option>
          </select>
        </Field>
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
      <p className="text-xs text-muted-foreground">Theme values are written to content/appearance.json. The public website must read this configuration during its next build for the changes to appear.</p>
      <Button type="submit" disabled={pending} className="w-fit">{pending ? "Saving…" : "Save site settings"}</Button>
    </form>
  );
}
