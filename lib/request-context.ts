import type { NextRequest } from "next/server";

import { DASHBOARD_SESSION_COOKIE } from "@/lib/dashboard-access";
import { HttpError } from "@/lib/http";
import type { RareActionEnvelope } from "@/lib/rare/auth";
import { deepMatchStore } from "@/lib/store";
import type { RareSession, TrustTier } from "@/types/domain";

function readAuthorizationToken(request: NextRequest) {
  const authorization = request.headers.get("authorization");
  if (authorization?.startsWith("Bearer ")) {
    return authorization.slice("Bearer ".length).trim();
  }

  const headerToken = request.headers.get("x-deepmatch-session-token")?.trim();
  if (headerToken) {
    return headerToken;
  }

  return request.cookies.get(DASHBOARD_SESSION_COOKIE)?.value?.trim() ?? "";
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
  if (session.role !== "agent") {
    throw new HttpError(403, "Dashboard viewer sessions cannot perform write actions.");
  }

  if (!deepMatchStore.hasMinimumTier(session.sessionToken, minimumTier)) {
    throw new HttpError(403, `This action requires ${minimumTier} access.`);
  }

  if (actionVerification) {
    try {
      const { verifyRareAction } = await import("@/lib/rare/auth");
      await verifyRareAction(session.sessionToken, actionVerification);
    } catch {
      throw new HttpError(403, "Action verification failed.");
    }
  }

  return session;
}
