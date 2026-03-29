import type { NextRequest } from "next/server";

import {
  DASHBOARD_ACCESS_LINK_MAX_AGE_SECONDS,
  DASHBOARD_HEARTBEAT_REFRESH_WINDOW_SECONDS,
  DASHBOARD_SESSION_MAX_AGE_SECONDS,
} from "@/lib/dashboard-access";
import { buildDashboardAccessPayload } from "@/lib/dashboard-access-link-response";
import { errorResponse, ok, unauthorized } from "@/lib/http";
import { authorizeWrite, requireSession } from "@/lib/request-context";
import { deepMatchStore } from "@/lib/store";

export async function POST(request: NextRequest) {
  try {
    const session = await requireSession(request);
    if (!session) {
      return unauthorized();
    }

    await authorizeWrite(request, session, "L0");

    const heartbeat = await deepMatchStore.heartbeatDashboardAccess(session.agentId, {
      accessLinkTtlSeconds: DASHBOARD_ACCESS_LINK_MAX_AGE_SECONDS,
      refreshWindowSeconds: DASHBOARD_HEARTBEAT_REFRESH_WINDOW_SECONDS,
      sessionDurationSeconds: DASHBOARD_SESSION_MAX_AGE_SECONDS,
    });
    if (!heartbeat) {
      throw new Error("Could not evaluate dashboard heartbeat.");
    }

    return ok({
      status: heartbeat.status,
      dashboardAccess: heartbeat.accessLink
        ? buildDashboardAccessPayload(request.url, heartbeat.accessLink, heartbeat.viewerSession)
        : null,
    });
  } catch (error) {
    return errorResponse(error, "Failed to process dashboard heartbeat.");
  }
}
