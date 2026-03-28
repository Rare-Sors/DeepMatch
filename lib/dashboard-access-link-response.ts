import {
  DASHBOARD_HEARTBEAT_REFRESH_WINDOW_SECONDS,
  DASHBOARD_SESSION_MAX_AGE_SECONDS,
} from "@/lib/dashboard-access";
import type { DashboardAccessLink, RareSession } from "@/types/domain";

export function buildDashboardAccessPayload(
  requestUrl: string,
  accessLink: DashboardAccessLink,
  viewerSession: RareSession | null = null,
) {
  const accessUrl = new URL("/dashboard/access", requestUrl);
  accessUrl.searchParams.set("token", accessLink.token);

  return {
    accessUrl: accessUrl.toString(),
    expiresAt: accessLink.expiresAt,
    sessionMaxAgeSeconds: DASHBOARD_SESSION_MAX_AGE_SECONDS,
    refreshWindowSeconds: DASHBOARD_HEARTBEAT_REFRESH_WINDOW_SECONDS,
    viewerSessionExpiresAt: viewerSession?.expiresAt ?? null,
  };
}
