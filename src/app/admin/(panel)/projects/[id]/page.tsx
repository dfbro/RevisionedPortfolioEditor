import { notFound } from "next/navigation";
import { ProjectForm } from "@/components/admin/project-form";
import { getProjectsSnapshot } from "@/lib/editor-content";

export default async function EditProject({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const snapshot = await getProjectsSnapshot();
  const row = snapshot.value.find((item) => item.id === id);
  if (!row) notFound();
  return <div className="grid gap-8"><h1 className="font-display text-4xl font-bold tracking-tight">Edit project</h1><ProjectForm initial={{ ...row, expectedHash: snapshot.hash }} /></div>;
}
