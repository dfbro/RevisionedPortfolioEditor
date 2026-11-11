import Link from "next/link";
import { AchievementOrderList } from "@/components/admin/achievement-order-list";
import { Button } from "@/components/ui/button";
import { getAchievementsSnapshot } from "@/lib/editor-content";

export default async function AchievementsAdmin() {
  const snapshot = await getAchievementsSnapshot();
  const rows = snapshot.value;
  return (
    <div className="grid gap-6">
      <div className="flex items-center justify-between">
        <h1 className="font-display text-4xl font-bold tracking-tight">Achievements <span className="meta">{rows.length}</span></h1>
        <Button asChild><Link href="/admin/achievements/new">New achievement</Link></Button>
      </div>
      <AchievementOrderList
        key={rows.map((r) => r.id).join()}
        hasCustomOrder={false}
        expectedHash={snapshot.hash}
        initial={rows.map((r) => ({ id: r.id, title: r.title, date: r.date ?? "undated", imageUrl: r.imageUrl }))}
      />
    </div>
  );
}
