import { ProfileForm } from "@/components/admin/profile-form";
import { getProfileSnapshot } from "@/lib/editor-content";

export default async function ProfilePage() {
  const snapshot = await getProfileSnapshot();
  const r = snapshot.value;
  return (
    <div className="grid gap-8">
      <h1 className="font-display text-4xl font-bold tracking-tight">Profile</h1>
      <ProfileForm initial={{
        expectedHash: snapshot.hash,
        displayName: r.displayName,
        alias: r.alias,
        navbarBrandMode: r.brand !== r.alias ? "custom" : "default",
        navbarBrandName: r.brand !== r.alias ? r.brand : "",
        email: r.email ?? "",
        websiteUrl: r.websiteUrl ?? "",
        githubUrl: r.githubUrl ?? "",
        githubActivityUsername: r.githubActivityUsername ?? "",
        heroNameLines: r.heroNameLines?.join("\n") ?? [r.displayName.trim().split(/\s+/)[0], r.displayName.trim().split(/\s+/).slice(1).join(" ")].filter(Boolean).join("\n"),
        instagramUrl: r.instagramUrl ?? "",
        profileImageUrl: r.profileImageUrl,
        aboutText: r.aboutText,
        philosophyText: r.philosophyText,
        technicalArsenal: r.skills,
        professionalJourney: r.journey,
        educationHistory: r.education,
        seo: {
          ...(r.seo ?? {}),
          keywords: Array.isArray(r.seo?.keywords) ? r.seo.keywords as string[] : [],
          sameAs: Array.isArray(r.seo?.sameAs) ? r.seo.sameAs as string[] : [],
        },
      }} />
    </div>
  );
}
