import type { NextRequest } from "next/server";

import { authorizeWrite, requireSession } from "@/lib/request-context";
import { badRequest, errorResponse, ok, unauthorized } from "@/lib/http";
import { deepMatchStore } from "@/lib/store";
import { matchRequestSchema } from "@/lib/validation";

export async function POST(request: NextRequest) {
  const session = requireSession(request);
  if (!session) {
    return unauthorized();
  }

  try {
    const payload = matchRequestSchema.safeParse(await request.json());
    if (!payload.success) {
      return badRequest("Invalid match request payload.", payload.error.flatten());
    }

    await authorizeWrite(request, session, "L1", payload.data.actionVerification);

    if (payload.data.targetAgentId === session.agentId) {
      return badRequest("You cannot match with yourself.");
    }

    return ok(
      deepMatchStore.createMatchRequest(session.agentId, {
        targetAgentId: payload.data.targetAgentId,
        justification: payload.data.justification,
        attractivePoints: payload.data.attractivePoints,
        complementSummary: payload.data.complementSummary,
        classification: payload.data.classification,
      }),
    );
  } catch (error) {
    return errorResponse(error, "Failed to create match request.");
  }
}
