import { NextRequest, NextResponse } from "next/server";
import {
  canAccessPath,
  decodeSession,
  getRoleHome,
  sessionCookieName
} from "./lib/auth-config";
import { getBrowserRequestUrl, getLocalBrowserRedirect } from "./lib/request-url";

export async function proxy(request: NextRequest) {
  const { pathname } = request.nextUrl;

  if (pathname === "/api/health") {
    return NextResponse.next();
  }

  const browserUrl = getBrowserRequestUrl(request);
  if (!browserUrl) return new NextResponse("Invalid Host header", { status: 400 });
  const localRedirect = getLocalBrowserRedirect(browserUrl);
  if (localRedirect) {
    // Redirect the document before hydration/fetches. Never replay a form POST
    // with credentials across origins or rewrite Origin to bypass CSRF checks.
    if (request.method !== "GET" && request.method !== "HEAD") {
      return new NextResponse("Open this site using localhost instead of 0.0.0.0, then retry.", {
        status: 400,
        headers: { "Cache-Control": "no-store" }
      });
    }
    const response = NextResponse.redirect(localRedirect, 307);
    response.headers.set("Cache-Control", "no-store");
    return response;
  }

  const user = await decodeSession(request.cookies.get(sessionCookieName)?.value ?? "");

  if (!user && pathname !== "/login") {
    const loginUrl = new URL("/login", browserUrl);
    loginUrl.searchParams.set("next", pathname);

    return NextResponse.redirect(loginUrl);
  }

  if (user && (pathname === "/login" || pathname === "/")) {
    return NextResponse.redirect(new URL(getRoleHome(user.role), browserUrl));
  }

  if (!canAccessPath(user, pathname)) {
    return NextResponse.redirect(new URL(getRoleHome(user?.role), browserUrl));
  }

  return NextResponse.next();
}

export const config = {
  matcher: ["/((?!_next|.*\\..*).*)"]
};
