import type { NextResponse } from "next/server";

import { isProduction } from "@/lib/env";

export const DASHBOARD_SESSION_COOKIE = "deepmatch-dashboard-session";
export const DASHBOARD_SESSION_MAX_AGE_SECONDS = 60 * 60 * 24 * 7;
export const DASHBOARD_ACCESS_LINK_MAX_AGE_SECONDS = 60 * 20;
export const DASHBOARD_HEARTBEAT_REFRESH_WINDOW_SECONDS = 60 * 60 * 24;

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
