import { NextRequest, NextResponse } from "next/server";
import {
  canAccessPath,
  decodeSession,
  getRoleHome,
  sessionCookieName
} from "@/lib/auth-config";

export function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;

  if (pathname === "/api/health") {
    return NextResponse.next();
  }

  const user = decodeSession(request.cookies.get(sessionCookieName)?.value ?? "");

  if (!user && pathname !== "/login") {
    const loginUrl = new URL("/login", request.url);
    loginUrl.searchParams.set("next", pathname);

    return NextResponse.redirect(loginUrl);
  }

  if (user && (pathname === "/login" || pathname === "/")) {
    return NextResponse.redirect(new URL(getRoleHome(user.role), request.url));
  }

  if (!canAccessPath(user, pathname)) {
    return NextResponse.redirect(new URL(getRoleHome(user?.role), request.url));
  }

  return NextResponse.next();
}

export const config = {
  matcher: ["/((?!_next|.*\\..*).*)"]
};
