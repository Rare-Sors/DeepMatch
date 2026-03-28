import type { NextRequest } from "next/server";

import { requireSession } from "@/lib/request-context";
import { deepMatchStore } from "@/lib/store";
import { ok, unauthorized } from "@/lib/http";

export async function GET(request: NextRequest) {
  const session = requireSession(request);
  if (!session) {
    return unauthorized();
  }

  return ok({
    session,
    trustTier: deepMatchStore.getTrustTier(session.agentId),
    inbox: deepMatchStore.listInbox(session.agentId),
  });
}
