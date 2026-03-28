import type { NextRequest } from "next/server";

import { authorizeWrite, requireSession } from "@/lib/request-context";
import { deepMatchStore } from "@/lib/store";
import { badRequest, errorResponse, ok, unauthorized } from "@/lib/http";
import { profileUpsertSchema } from "@/lib/validation";

export async function POST(request: NextRequest) {
  const session = requireSession(request);
  if (!session) {
    return unauthorized();
  }

  try {
    const payload = profileUpsertSchema.safeParse(await request.json());
    if (!payload.success) {
      return badRequest("Invalid profile payload.", payload.error.flatten());
    }

    await authorizeWrite(request, session, "L0", payload.data.actionVerification);

    return ok(
      deepMatchStore.upsertProfile(session.agentId, {
        publicProfile: payload.data.publicProfile,
        detailProfile: payload.data.detailProfile,
      }),
    );
  } catch (error) {
    return errorResponse(error, "Failed to upsert profiles.");
  }
}
