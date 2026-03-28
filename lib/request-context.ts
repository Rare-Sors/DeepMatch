import type { NextRequest } from "next/server";

import { deepMatchStore } from "@/lib/store";
import { verifyRareAction } from "@/lib/rare/auth";
import type { RareActionEnvelope } from "@/lib/rare/auth";
import type { RareSession, TrustTier } from "@/types/domain";

function readAuthorizationToken(request: NextRequest) {
  const authorization = request.headers.get("authorization");
  if (authorization?.startsWith("Bearer ")) {
    return authorization.slice("Bearer ".length).trim();
  }

  return request.headers.get("x-deepmatch-session-token")?.trim() ?? "";
}

export function requireSession(request: NextRequest): RareSession | null {
  const sessionToken = readAuthorizationToken(request);
  if (!sessionToken) {
    return null;
  }

  return deepMatchStore.getSession(sessionToken) ?? null;
}

export async function authorizeWrite(
  request: NextRequest,
  session: RareSession,
  minimumTier: TrustTier,
  actionVerification?: RareActionEnvelope,
) {
  if (!deepMatchStore.hasMinimumTier(session.sessionToken, minimumTier)) {
    throw new Error(`This action requires ${minimumTier} access.`);
  }

  if (actionVerification) {
    await verifyRareAction(session.sessionToken, actionVerification);
  }

  return session;
}
