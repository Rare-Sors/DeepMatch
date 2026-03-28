import { PublicProfilesPage } from "@/components/public-profiles-page";
import { demoProfiles } from "@/lib/demo-data";
import { deepMatchStore } from "@/lib/store";

export const dynamic = "force-dynamic";

export default function Home() {
  const profiles = deepMatchStore.listPublicProfiles();
  const initialProfiles = profiles.length ? profiles : demoProfiles;

  return (
    <PublicProfilesPage
      initialIsDemo={profiles.length === 0}
      initialProfiles={initialProfiles}
    />
  );
}
