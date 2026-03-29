import { createHmac, timingSafeEqual } from "node:crypto";
import type { NextResponse } from "next/server";

import { env, isProduction } from "@/lib/env";
import type { IdentityMode, RareSession, TrustTier } from "@/types/domain";

export const DASHBOARD_SESSION_COOKIE = "deepmatch-dashboard-session";
export const DASHBOARD_SESSION_MAX_AGE_SECONDS = 60 * 60 * 24 * 7;
export const DASHBOARD_ACCESS_LINK_MAX_AGE_SECONDS = 60 * 20;
export const DASHBOARD_HEARTBEAT_REFRESH_WINDOW_SECONDS = 60 * 60 * 24;

interface DashboardAccessTokenClaims {
  v: 1;
  kind: "dashboard-access";
  agentId: string;
  identityMode: IdentityMode;
  rawLevel: TrustTier;
  level: TrustTier;
  displayName: string;
  viewerSessionId: string;
  expiresAt: number;
}

interface DashboardViewerTokenClaims {
  v: 1;
  kind: "dashboard-viewer";
  sessionId: string;
  agentId: string;
  identityMode: IdentityMode;
  rawLevel: TrustTier;
  level: TrustTier;
  displayName: string;
  expiresAt: number;
}

function getDashboardSigningSecret() {
  return (
    env.RARE_PLATFORM_SIGNING_PRIVATE_KEY ||
    env.UPSTASH_REDIS_REST_TOKEN ||
    `${env.RARE_PLATFORM_AUD || "deepmatch"}-dashboard-dev-secret`
  );
}

function encodeBase64Url(value: string) {
  return Buffer.from(value, "utf8").toString("base64url");
}

function decodeBase64Url(value: string) {
  return Buffer.from(value, "base64url").toString("utf8");
}

function signPayload(payload: string) {
  return createHmac("sha256", getDashboardSigningSecret()).update(payload).digest("base64url");
}

function serializeSignedToken(payload: DashboardAccessTokenClaims | DashboardViewerTokenClaims) {
  const encodedPayload = encodeBase64Url(JSON.stringify(payload));
  const signature = signPayload(encodedPayload);
  return `${encodedPayload}.${signature}`;
}

function parseSignedToken(token: string) {
  const [encodedPayload, signature] = token.split(".");
  if (!encodedPayload || !signature) {
    return null;
  }

  const expectedSignature = signPayload(encodedPayload);
  const actualBuffer = Buffer.from(signature, "utf8");
  const expectedBuffer = Buffer.from(expectedSignature, "utf8");
  if (
    actualBuffer.length !== expectedBuffer.length ||
    !timingSafeEqual(actualBuffer, expectedBuffer)
  ) {
    return null;
  }

  try {
    return JSON.parse(decodeBase64Url(encodedPayload)) as
      | DashboardAccessTokenClaims
      | DashboardViewerTokenClaims;
  } catch {
    return null;
  }
}

function isExpired(expiresAt: number) {
  return expiresAt <= Math.floor(Date.now() / 1000);
}

function buildViewerSessionFromClaims(
  claims: DashboardAccessTokenClaims | DashboardViewerTokenClaims,
  expiresAt: number,
): RareSession {
  const sessionId =
    claims.kind === "dashboard-access" ? claims.viewerSessionId : claims.sessionId;

  return {
    sessionToken: sessionId,
    agentId: claims.agentId,
    identityMode: claims.identityMode,
    role: "viewer",
    rawLevel: claims.rawLevel,
    level: claims.level,
    displayName: claims.displayName,
    sessionPubkey: "",
    lastSeenAt: new Date().toISOString(),
    expiresAt,
  };
}

export function createDashboardAccessToken(
  input: Omit<DashboardAccessTokenClaims, "v" | "kind">,
) {
  return serializeSignedToken({
    v: 1,
    kind: "dashboard-access",
    ...input,
  });
}

export function readDashboardAccessToken(token: string) {
  const claims = parseSignedToken(token);
  if (!claims || claims.kind !== "dashboard-access" || claims.v !== 1 || isExpired(claims.expiresAt)) {
    return null;
  }

  return claims;
}

export function createDashboardViewerSessionToken(
  accessClaims: DashboardAccessTokenClaims,
  sessionDurationSeconds: number,
) {
  const expiresAt = Math.floor(Date.now() / 1000) + sessionDurationSeconds;
  const session = buildViewerSessionFromClaims(accessClaims, expiresAt);
  const token = serializeSignedToken({
    v: 1,
    kind: "dashboard-viewer",
    sessionId: session.sessionToken,
    agentId: session.agentId,
    identityMode: session.identityMode,
    rawLevel: session.rawLevel,
    level: session.level,
    displayName: session.displayName,
    expiresAt,
  });

  return {
    token,
    session,
  };
}

export function readDashboardViewerSession(token: string): RareSession | null {
  const claims = parseSignedToken(token);
  if (!claims || claims.kind !== "dashboard-viewer" || claims.v !== 1 || isExpired(claims.expiresAt)) {
    return null;
  }

  return buildViewerSessionFromClaims(claims, claims.expiresAt);
}

export function attachDashboardSessionCookie(
  response: NextResponse,
  sessionToken: string,
  maxAge = DASHBOARD_SESSION_MAX_AGE_SECONDS,
) {
  response.cookies.set(DASHBOARD_SESSION_COOKIE, sessionToken, {
    httpOnly: true,
    maxAge,
    path: "/",
    sameSite: "lax",
    secure: isProduction(),
  });

  return response;
}
