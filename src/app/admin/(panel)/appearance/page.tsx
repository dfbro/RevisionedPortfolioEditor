import { SettingsForm } from "@/components/admin/settings-form";
import { getAppearanceSnapshot, getSiteSnapshot } from "@/lib/editor-content";

export default async function AppearancePage() {
  const [site, appearance] = await Promise.all([getSiteSnapshot(), getAppearanceSnapshot()]);
  return (
    <div className="grid gap-8">
      <header>
        <p className="meta mb-2">configuration files</p>
        <h1 className="font-display text-4xl font-bold tracking-tight">Appearance & SEO</h1>
        <p className="mt-2 max-w-2xl text-sm text-muted-foreground">Edit the canonical domain and design tokens. The editor writes directly to content/site.json and content/appearance.json.</p>
      </header>
      <SettingsForm site={site.value} appearance={appearance.value} siteHash={site.hash} appearanceHash={appearance.hash} />
    </div>
  );
}
