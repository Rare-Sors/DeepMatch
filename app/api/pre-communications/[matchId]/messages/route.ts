import type { NextRequest } from "next/server";

import { authorizeWrite, requireSession } from "@/lib/request-context";
import { badRequest, errorResponse, notFound, ok, unauthorized } from "@/lib/http";
import { deepMatchStore } from "@/lib/store";
import { preCommunicationMessageSchema } from "@/lib/validation";

export async function GET(
  request: NextRequest,
  context: { params: Promise<{ matchId: string }> },
) {
  const session = requireSession(request);
  if (!session) {
    return unauthorized();
  }

  const { matchId } = await context.params;
  const messages = deepMatchStore.listPreCommunicationMessages(matchId, session.agentId);
  if (!messages) {
    return notFound("Pre-communication thread not found.");
  }

  return ok({ messages });
}

export async function POST(
  request: NextRequest,
  context: { params: Promise<{ matchId: string }> },
) {
  const session = requireSession(request);
  if (!session) {
    return unauthorized();
  }

  try {
    const payload = preCommunicationMessageSchema.safeParse(await request.json());
    if (!payload.success) {
      return badRequest("Invalid pre-communication payload.", payload.error.flatten());
    }

    await authorizeWrite(
      request,
      session,
      "L1",
      payload.data.actionVerification,
      "Posting a pre-communication message",
    );

    const { matchId } = await context.params;
    const result = deepMatchStore.addPreCommunicationMessage(
      matchId,
      session.agentId,
      payload.data.topic,
      payload.data.messageType,
      payload.data.content,
    );

    if (!result) {
      return notFound("Mutual match not found.");
    }

    return ok(result);
  } catch (error) {
    return errorResponse(error, "Failed to append pre-communication message.");
  }
}
