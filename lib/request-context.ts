import type { NextRequest } from "next/server";

import { DASHBOARD_SESSION_COOKIE, readDashboardViewerSession } from "@/lib/dashboard-access";
import { HttpError } from "@/lib/http";
import { capabilitySummaryForTier, upgradeHintForTier } from "@/lib/permissions";
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

export async function requireSession(request: NextRequest): Promise<RareSession | null> {
  const sessionToken = readAuthorizationToken(request);
  if (!sessionToken) {
    return null;
  }

  return (await deepMatchStore.getSession(sessionToken)) ?? readDashboardViewerSession(sessionToken);
}

export async function authorizeWrite(
  request: NextRequest,
  session: RareSession,
  minimumTier: TrustTier,
  actionVerification?: RareActionEnvelope,
  actionLabel?: string,
) {
  if (session.role !== "agent") {
    throw new HttpError(
      403,
      "Dashboard viewer sessions are read-only. Use the founder agent session token from Rare login for write actions.",
      {
        role: session.role,
        requiredRole: "agent",
      },
    );
  }

  if (!(await deepMatchStore.hasMinimumTier(session.sessionToken, minimumTier))) {
    const actionPrefix = actionLabel ? `${actionLabel} requires ${minimumTier} access.` : `This action requires ${minimumTier} access.`;
    throw new HttpError(
      403,
      `${actionPrefix} Current trust tier: ${session.level}. ${session.level} can ${capabilitySummaryForTier(session.level)}. ${upgradeHintForTier(minimumTier)}`,
      {
        action: actionLabel ?? "write action",
        currentTier: session.level,
        requiredTier: minimumTier,
        currentCapabilities: capabilitySummaryForTier(session.level),
        upgradeHint: upgradeHintForTier(minimumTier),
      },
    );
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
