import { AchievementForm } from "@/components/admin/achievement-form";
import { getAchievementsSnapshot } from "@/lib/editor-content";

export default async function NewAchievement() {
  const snapshot = await getAchievementsSnapshot();
  return (
    <div className="grid gap-8">
      <h1 className="font-display text-4xl font-bold tracking-tight">New achievement</h1>
      <AchievementForm initial={{ expectedHash: snapshot.hash }} />
    </div>
  );
}
