"use server";

import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import {
  canAccessPath,
  encodeSession,
  getRoleHome,
  sessionCookieName,
  sessionMaxAgeSeconds,
  shouldUseSecureSessionCookie
} from "@/lib/auth-config";
import { verifyLogin } from "@/lib/auth";

export async function loginAction(formData: FormData): Promise<void> {
  const username = String(formData.get("username") ?? "");
  const password = String(formData.get("password") ?? "");
  const nextPath = sanitizeNextPath(String(formData.get("next") ?? ""));
  const user = verifyLogin(username, password);

  if (!user) {
    redirect("/login?error=1");
  }

  const cookieStore = await cookies();
  cookieStore.set(sessionCookieName, await encodeSession(user), {
    httpOnly: true,
    secure: shouldUseSecureSessionCookie(),
    sameSite: "lax",
    path: "/",
    maxAge: sessionMaxAgeSeconds
  });

  if (nextPath && canAccessPath(user, nextPath)) {
    redirect(nextPath);
  }

  redirect(getRoleHome(user.role));
}

export async function logoutAction(): Promise<void> {
  const cookieStore = await cookies();
  cookieStore.delete(sessionCookieName);
  redirect("/login");
}

function sanitizeNextPath(value: string) {
  if (!value.startsWith("/") || value.startsWith("//")) {
    return "";
  }

  if (value.startsWith("/login") || value.startsWith("/logout")) {
    return "";
  }

  return value;
}
