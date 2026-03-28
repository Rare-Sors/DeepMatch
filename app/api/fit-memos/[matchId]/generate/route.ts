import type { NextRequest } from "next/server";

import { authorizeWrite, requireSession } from "@/lib/request-context";
import { errorResponse, notFound, ok, unauthorized } from "@/lib/http";
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
    await authorizeWrite(request, session, "L1", undefined, "Generating a fit memo");

    const { matchId } = await context.params;
    const memo = deepMatchStore.generateFitMemo(matchId, session.agentId);
    if (!memo) {
      return notFound("Match not found or inaccessible.");
    }

    return ok({ fitMemo: memo });
  } catch (error) {
    return errorResponse(error, "Failed to generate fit memo.");
  }
}
