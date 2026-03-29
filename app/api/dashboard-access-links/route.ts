import type { NextRequest } from "next/server";

import { DASHBOARD_ACCESS_LINK_MAX_AGE_SECONDS } from "@/lib/dashboard-access";
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

    const link = await deepMatchStore.createDashboardAccessLink(
      session.agentId,
      DASHBOARD_ACCESS_LINK_MAX_AGE_SECONDS,
    );
    if (!link) {
      throw new Error("Could not create dashboard access link.");
    }

    return ok(buildDashboardAccessPayload(request.url, link));
  } catch (error) {
    return errorResponse(error, "Failed to create dashboard access link.");
  }
}
