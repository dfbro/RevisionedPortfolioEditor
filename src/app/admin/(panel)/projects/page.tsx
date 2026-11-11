import Link from "next/link";
import { DeleteButton } from "@/components/admin/delete-button";
import { Button } from "@/components/ui/button";
import { deleteProject } from "@/lib/admin/actions/projects";
import { getProjectsSnapshot } from "@/lib/editor-content";

export default async function ProjectsAdmin() {
  const snapshot = await getProjectsSnapshot();
  const rows = snapshot.value;
  return (
    <div className="grid gap-6">
      <div className="flex items-center justify-between">
        <h1 className="font-display text-4xl font-bold tracking-tight">Projects <span className="meta">{rows.length}</span></h1>
        <Button asChild><Link href="/admin/projects/new">New project</Link></Button>
      </div>
      <ul className="divide-y divide-border border-y border-border">
        {rows.map((p) => (
          <li key={p.id} className="flex items-center justify-between gap-4 py-3">
            <Link href={"/admin/projects/" + p.id} className="font-medium hover:text-primary">{p.title}</Link>
            <div className="flex items-center gap-3">
              <span className="meta">{p.category}</span>
              <DeleteButton action={deleteProject.bind(null, p.id, snapshot.hash)} />
            </div>
          </li>
        ))}
      </ul>
    </div>
  );
}
