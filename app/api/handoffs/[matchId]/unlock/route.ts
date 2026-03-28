import type { NextRequest } from "next/server";

import { authorizeWrite, requireSession } from "@/lib/request-context";
import { errorResponse, forbidden, notFound, ok, unauthorized } from "@/lib/http";
import { deepMatchStore } from "@/lib/store";

export async function POST(
  request: NextRequest,
  context: { params: Promise<{ matchId: string }> },
) {
  const session = requireSession(request);
  if (!session) {
    return unauthorized();
  }

  try {
    await authorizeWrite(request, session, "L1", undefined, "Unlocking handoff");

    const { matchId } = await context.params;
    const handoff = deepMatchStore.unlockHandoff(matchId, session.agentId);
    if (!handoff) {
      const inbox = deepMatchStore.listInbox(session.agentId);
      const hasMemo = inbox.fitMemos.some((memo) => memo.matchId === matchId);
      return hasMemo
        ? forbidden("Handoff unlock requires a positive fit memo.")
        : notFound("Match or fit memo not found.");
    }

    return ok({ handoff });
  } catch (error) {
    return errorResponse(error, "Failed to unlock handoff.");
  }
}
