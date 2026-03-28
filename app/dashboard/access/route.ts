import type { NextRequest } from "next/server";
import { NextResponse } from "next/server";

import {
  attachDashboardSessionCookie,
  DASHBOARD_SESSION_MAX_AGE_SECONDS,
} from "@/lib/dashboard-access";
import { deepMatchStore } from "@/lib/store";

export async function GET(request: NextRequest) {
  const token = request.nextUrl.searchParams.get("token")?.trim() ?? "";
  const redirectUrl = new URL("/dashboard", request.url);

  if (!token) {
    redirectUrl.searchParams.set("access", "invalid");
    return NextResponse.redirect(redirectUrl);
  }

  const session = deepMatchStore.consumeDashboardAccessLink(
    token,
    DASHBOARD_SESSION_MAX_AGE_SECONDS,
  );
  if (!session) {
    redirectUrl.searchParams.set("access", "invalid");
    return NextResponse.redirect(redirectUrl);
  }

  const response = NextResponse.redirect(redirectUrl);
  return attachDashboardSessionCookie(response, session.sessionToken);
}
