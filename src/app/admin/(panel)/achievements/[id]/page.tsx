import { notFound } from "next/navigation";
import { AchievementForm } from "@/components/admin/achievement-form";
import { getAchievementsSnapshot } from "@/lib/editor-content";

export default async function EditAchievement({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const snapshot = await getAchievementsSnapshot();
  const row = snapshot.value.find((item) => item.id === id);
  if (!row) notFound();
  return <div className="grid gap-8"><h1 className="font-display text-4xl font-bold tracking-tight">Edit achievement</h1><AchievementForm initial={{ ...row, expectedHash: snapshot.hash }} /></div>;
}
