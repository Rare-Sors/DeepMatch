import type { NextRequest } from "next/server";

import { requireSession } from "@/lib/request-context";
import { deepMatchStore } from "@/lib/store";
import { ok, unauthorized } from "@/lib/http";

export async function GET(request: NextRequest) {
  const session = await requireSession(request);
  if (!session) {
    return unauthorized();
  }

  return ok({
    session,
    trustTier: await deepMatchStore.getTrustTier(session.agentId),
    inbox: await deepMatchStore.listInbox(session.agentId),
  });
}
