export type UserRole = "OWNER" | "STAFF";

export type AppUser = {
  id: string;
  username: string;
  name: string;
  role: UserRole;
};

export const sessionCookieName = "vl_session";

export const staffAllowedRoutes = ["/pos", "/pos/history", "/pos/closing", "/members"];

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

export function encodeSession(user: AppUser) {
  return encodeURIComponent(
    [user.id, user.username, user.name, user.role].join("|")
  );
}

export function decodeSession(value: string): AppUser | null {
  try {
    const [id, username, name, role] = decodeURIComponent(value).split("|");

    if (!id || !username || !name || !isUserRole(role)) {
      return null;
    }

    return { id, username, name, role };
  } catch {
    return null;
  }
}

function isUserRole(value: string): value is UserRole {
  return value === "OWNER" || value === "STAFF";
}
