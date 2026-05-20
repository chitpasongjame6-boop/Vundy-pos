import { NextResponse } from "next/server";
import { sessionCookieName } from "@/lib/auth-config";

export function GET(request: Request) {
  const response = NextResponse.redirect(new URL("/login", request.url));
  response.cookies.delete(sessionCookieName);

  return response;
}

