import { requireSession } from "@/lib/request-context";
import { deepMatchStore } from "@/lib/store";
import { forbidden, notFound, ok, unauthorized } from "@/lib/http";
import type { NextRequest } from "next/server";

export async function GET(
  request: NextRequest,
  context: { params: Promise<{ matchId: string }> },
) {
  const session = requireSession(request);
  if (!session) {
    return unauthorized();
  }

  const { matchId } = await context.params;
  const details = deepMatchStore.getDetailProfilesForMatch(matchId, session.agentId);
  if (!details) {
    const matchExists = deepMatchStore.listInbox(session.agentId).matches.some((match) => match.id === matchId);
    return matchExists ? forbidden("Detail profiles unlock only after a mutual match.") : notFound("Match not found.");
  }

  return ok(details);
}
