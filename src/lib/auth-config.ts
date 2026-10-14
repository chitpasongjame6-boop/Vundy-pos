export type UserRole = "OWNER" | "STAFF";

export type AppUser = {
  id: string;
  username: string;
  name: string;
  role: UserRole;
};

export const sessionCookieName = "vl_session";
export const sessionMaxAgeSeconds = 60 * 60 * 12;

export const staffAllowedRoutes = [
  "/pos",
  "/pos/history",
  "/pos/closing",
  "/pos/shifts",
  "/members"
];

export function getRoleHome(role?: UserRole) {
  return role === "STAFF" ? "/pos" : "/dashboard";
}

export function canAccessPath(user: AppUser | null, pathname: string) {
  if (!user) {
    return pathname === "/login";
  }

  if (pathname === "/login" || pathname === "/logout" || pathname === "/") {
    return true;
  }

  if (user.role === "OWNER") {
    return true;
  }

  return staffAllowedRoutes.some(
    (route) => pathname === route || pathname.startsWith(`${route}/`)
  );
}

type SessionPayload = AppUser & {
  expiresAt: number;
};

export async function encodeSession(user: AppUser) {
  const payload = encodeBase64Url(
    JSON.stringify({
      ...user,
      expiresAt: Date.now() + sessionMaxAgeSeconds * 1000
    } satisfies SessionPayload)
  );
  const signature = await sign(payload);

  return `${payload}.${signature}`;
}

export async function decodeSession(value: string): Promise<AppUser | null> {
  try {
    const [payload, signature, extra] = value.split(".");

    if (!payload || !signature || extra || !(await verify(payload, signature))) {
      return null;
    }

    const session = JSON.parse(decodeBase64Url(payload)) as Partial<SessionPayload>;

    if (
      !session.id ||
      !session.username ||
      !session.name ||
      !isUserRole(session.role) ||
      typeof session.expiresAt !== "number" ||
      session.expiresAt <= Date.now()
    ) {
      return null;
    }

    return {
      id: session.id,
      username: session.username,
      name: session.name,
      role: session.role
    };
  } catch {
    return null;
  }
}

async function sign(value: string) {
  const key = await getSigningKey(["sign"]);
  const signature = await crypto.subtle.sign("HMAC", key, textEncoder.encode(value));

  return bytesToBase64Url(new Uint8Array(signature));
}

async function verify(value: string, signature: string) {
  const key = await getSigningKey(["verify"]);

  return crypto.subtle.verify(
    "HMAC",
    key,
    base64UrlToBytes(signature),
    textEncoder.encode(value)
  );
}

function getSigningKey(usages: KeyUsage[]) {
  return crypto.subtle.importKey(
    "raw",
    textEncoder.encode(getSessionSecret()),
    { name: "HMAC", hash: "SHA-256" },
    false,
    usages
  );
}

function getSessionSecret() {
  const secret = process.env.SESSION_SECRET?.trim() || process.env.OWNER_PASSWORD?.trim();

  if (!secret) {
    throw new Error("SESSION_SECRET or OWNER_PASSWORD must be configured");
  }

  return `vundy-pos-session:${secret}`;
}

const textEncoder = new TextEncoder();

function encodeBase64Url(value: string) {
  return bytesToBase64Url(textEncoder.encode(value));
}

function decodeBase64Url(value: string) {
  return new TextDecoder().decode(base64UrlToBytes(value));
}

function bytesToBase64Url(bytes: Uint8Array) {
  let binary = "";

  bytes.forEach((byte) => {
    binary += String.fromCharCode(byte);
  });

  return btoa(binary).replaceAll("+", "-").replaceAll("/", "_").replace(/=+$/g, "");
}

function base64UrlToBytes(value: string) {
  const normalized = value.replaceAll("-", "+").replaceAll("_", "/");
  const padded = normalized.padEnd(Math.ceil(normalized.length / 4) * 4, "=");
  const binary = atob(padded);

  return Uint8Array.from(binary, (character) => character.charCodeAt(0));
}

function isUserRole(value: unknown): value is UserRole {
  return value === "OWNER" || value === "STAFF";
}
