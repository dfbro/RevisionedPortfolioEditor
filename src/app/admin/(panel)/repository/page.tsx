import { RepositoryPanel } from "@/components/admin/repository-panel";
import { repositoryStatus, templateRepositoryStatus } from "@/lib/editor-repository";

export default async function RepositoryPage() {
  const [status, template] = await Promise.all([repositoryStatus(), templateRepositoryStatus()]);
  return (
    <div className="grid gap-8">
      <header>
        <p className="meta mb-2">repository sync and diagnostics</p>
        <h1 className="font-display text-4xl font-bold tracking-tight">Repository health</h1>
        <p className="mt-2 max-w-2xl text-sm text-muted-foreground">Inspect repository integrity and working-tree state, or fetch the latest remote commits. Fetch updates files only through a clean fast-forward; it never resets, rebases or discards local work.</p>
      </header>
      <RepositoryPanel initial={status} template={template} />
    </div>
  );
}
