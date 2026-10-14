import { NextResponse } from "next/server";
import { getBrowserRequestUrl } from "@/lib/request-url";

export function GET(request: Request) {
  const browserUrl = getBrowserRequestUrl(request);
  if (!browserUrl) return new NextResponse("Invalid Host header", { status: 400 });
  const response = NextResponse.redirect(new URL("/login", browserUrl));
  // GET (including prefetch/HEAD) must never change the session. The explicit
  // logout form submits logoutAction via POST with Next.js origin validation.
  response.headers.set("Cache-Control", "no-store");

  return response;
}

