import { RepositoryPanel } from "@/components/admin/repository-panel";
import { repositoryStatus } from "@/lib/editor-repository";

export default async function RepositoryPage() {
  const status = await repositoryStatus();
  return (
    <div className="grid gap-8">
      <header>
        <p className="meta mb-2">read-only diagnostics</p>
        <h1 className="font-display text-4xl font-bold tracking-tight">Repository health</h1>
        <p className="mt-2 max-w-2xl text-sm text-muted-foreground">Detect Git object corruption, content errors, missing assets, remote drift and ordinary uncommitted changes. Diagnostic checks never reset, clean, rebase or repair the repository.</p>
      </header>
      <RepositoryPanel initial={status} />
    </div>
  );
}
