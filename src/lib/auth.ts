import { cookies } from "next/headers";
import {
  decodeSession,
  sessionCookieName,
  type AppUser
} from "@/lib/auth-config";

type AuthUser = AppUser & {
  password: string;
};

const defaultUsers: AuthUser[] = [
  {
    id: "owner",
    username: process.env.OWNER_USERNAME || "owner",
    password: process.env.OWNER_PASSWORD || "owner123",
    name: process.env.OWNER_NAME || "ເຈົ້າຂອງຮ້ານ",
    role: "OWNER"
  },
  {
    id: "staff",
    username: process.env.STAFF_USERNAME || "staff",
    password: process.env.STAFF_PASSWORD || "staff123",
    name: process.env.STAFF_NAME || "ພະນັກງານຂາຍ",
    role: "STAFF"
  }
];

export function getLoginUsers() {
  return defaultUsers.map((user) => ({
    id: user.id,
    username: user.username,
    name: user.name,
    role: user.role
  }));
}

export function verifyLogin(username: string, password: string) {
  const normalizedUsername = username.trim().toLowerCase();

  return (
    defaultUsers.find(
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
