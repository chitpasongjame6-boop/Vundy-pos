import { NextResponse } from "next/server";
import { sessionCookieName } from "@/lib/auth-config";
import { getBrowserRequestUrl } from "@/lib/request-url";

export function GET(request: Request) {
  const browserUrl = getBrowserRequestUrl(request);
  if (!browserUrl) return new NextResponse("Invalid Host header", { status: 400 });
  const response = NextResponse.redirect(new URL("/login", browserUrl));
  response.cookies.delete(sessionCookieName);

  return response;
}

