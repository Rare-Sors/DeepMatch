import type { NextRequest } from "next/server";

import { DASHBOARD_ACCESS_LINK_MAX_AGE_SECONDS } from "@/lib/dashboard-access";
import { buildDashboardAccessPayload } from "@/lib/dashboard-access-link-response";
import { authorizeWrite, requireSession } from "@/lib/request-context";
import { normalizeProfileUpsertPayload } from "@/lib/profile-upsert-normalizer";
import { deepMatchStore } from "@/lib/store";
import { badRequest, errorResponse, ok, unauthorized } from "@/lib/http";
import { profileUpsertSchema } from "@/lib/validation";

export async function POST(request: NextRequest) {
  const session = await requireSession(request);
  if (!session) {
    return unauthorized();
  }

  try {
    const rawPayload = await request.json();
    const normalizedPayload = normalizeProfileUpsertPayload(rawPayload);
    const payload = profileUpsertSchema.safeParse(normalizedPayload);
    if (!payload.success) {
      return badRequest("Invalid profile payload.", payload.error.flatten());
    }

    await authorizeWrite(request, session, "L0", payload.data.actionVerification);

    const existingProfile = await deepMatchStore.getPublicProfile(session.agentId);
    const result = await deepMatchStore.upsertProfile(session.agentId, {
      publicProfile: payload.data.publicProfile,
      detailProfile: payload.data.detailProfile,
    });

    const initialAccessLink =
      !existingProfile && session.role === "agent"
        ? await deepMatchStore.createDashboardAccessLink(
            session.agentId,
            DASHBOARD_ACCESS_LINK_MAX_AGE_SECONDS,
          )
        : null;

    return ok({
      ...result,
      dashboardAccess: initialAccessLink
        ? buildDashboardAccessPayload(request.url, initialAccessLink)
        : null,
    });
  } catch (error) {
    return errorResponse(error, "Failed to upsert profiles.");
  }
}
