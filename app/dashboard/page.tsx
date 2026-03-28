import { cookies } from "next/headers";

import { DashboardPage } from "@/components/dashboard-page";
import { DASHBOARD_SESSION_COOKIE } from "@/lib/dashboard-access";
import { deepMatchStore } from "@/lib/store";

export const dynamic = "force-dynamic";

export default async function DashboardRoute({
  searchParams,
}: {
  searchParams: Promise<{ access?: string }>;
}) {
  const params = await searchParams;
  const sessionToken = (await cookies()).get(DASHBOARD_SESSION_COOKIE)?.value?.trim() ?? "";
  const initialSession = sessionToken ? deepMatchStore.getSession(sessionToken) ?? null : null;
  const initialInbox = initialSession ? deepMatchStore.listInbox(initialSession.agentId) : null;
  const initialProfiles = deepMatchStore.listPublicProfiles();
  const initialStatus = initialSession
    ? initialSession.role === "viewer"
      ? "Viewer access"
      : "Agent session"
    : "Access link required";

  return (
    <DashboardPage
      accessState={params.access}
      initialInbox={initialInbox}
      initialProfiles={initialProfiles}
      initialSession={initialSession}
      initialStatus={initialStatus}
    />
  );
}
