import { ProjectForm } from "@/components/admin/project-form";
import { getProjectsSnapshot } from "@/lib/editor-content";

export default async function NewProject() {
  const snapshot = await getProjectsSnapshot();
  return (
    <div className="grid gap-8">
      <h1 className="font-display text-4xl font-bold tracking-tight">New project</h1>
      <ProjectForm initial={{ expectedHash: snapshot.hash }} />
    </div>
  );
}
