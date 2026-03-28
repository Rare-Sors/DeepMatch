import type { NextRequest } from "next/server";

import { authorizeWrite, requireSession } from "@/lib/request-context";
import { badRequest, errorResponse, notFound, ok, unauthorized } from "@/lib/http";
import { deepMatchStore } from "@/lib/store";
import { matchResponseSchema } from "@/lib/validation";

export async function POST(
  request: NextRequest,
  context: { params: Promise<{ id: string }> },
) {
  const session = requireSession(request);
  if (!session) {
    return unauthorized();
  }

  try {
    const payload = matchResponseSchema.safeParse(await request.json());
    if (!payload.success) {
      return badRequest("Invalid match response payload.", payload.error.flatten());
    }

    await authorizeWrite(
      request,
      session,
      "L1",
      payload.data.actionVerification,
      "Responding to a match request",
    );

    const { id } = await context.params;
    const result = deepMatchStore.respondToMatchRequest(id, session.agentId, payload.data.accept);
    if (!result) {
      return notFound("Match request not found.");
    }

    return ok(result);
  } catch (error) {
    return errorResponse(error, "Failed to respond to match request.");
  }
}
