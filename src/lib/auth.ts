import { cookies } from "next/headers";
import {
  decodeSession,
  sessionCookieName,
  type AppUser
} from "@/lib/auth-config";

type AuthUser = AppUser & {
  password: string;
};

const configuredUsers: AuthUser[] = [
  process.env.OWNER_USERNAME && process.env.OWNER_PASSWORD
    ? {
        id: "owner",
        username: process.env.OWNER_USERNAME,
        password: process.env.OWNER_PASSWORD,
        name: process.env.OWNER_NAME || "ເຈົ້າຂອງຮ້ານ",
        role: "OWNER"
      }
    : null,
  process.env.STAFF_USERNAME && process.env.STAFF_PASSWORD
    ? {
        id: "staff",
        username: process.env.STAFF_USERNAME,
        password: process.env.STAFF_PASSWORD,
        name: process.env.STAFF_NAME || "ພະນັກງານຂາຍ",
        role: "STAFF"
      }
    : null
].filter((user): user is AuthUser => Boolean(user));

export function getLoginUsers() {
  return configuredUsers.map((user) => ({
    id: user.id,
    username: user.username,
    name: user.name,
    role: user.role
  }));
}

export function verifyLogin(username: string, password: string) {
  const normalizedUsername = username.trim().toLowerCase();

  return (
    configuredUsers.find(
      (user) =>
        user.username.toLowerCase() === normalizedUsername &&
        user.password === password
    ) ?? null
  );
}

export async function getCurrentUser(): Promise<AppUser | null> {
  const cookieStore = await cookies();
  const rawSession = cookieStore.get(sessionCookieName)?.value;

  if (!rawSession) {
    return null;
  }

  return decodeSession(rawSession);
}
