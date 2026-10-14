import { beforeEach, describe, expect, it, vi } from "vitest";
import { logoutAction } from "./auth.action";
import { sessionCookieName } from "@/lib/auth-config";

const mocks = vi.hoisted(() => ({ deleteCookie: vi.fn(), redirect: vi.fn() }));
vi.mock("next/headers", () => ({ cookies: async () => ({ delete: mocks.deleteCookie }) }));
vi.mock("next/navigation", () => ({ redirect: mocks.redirect }));
vi.mock("@/lib/auth", () => ({ verifyLogin: vi.fn() }));

describe("explicit logout action", () => {
  beforeEach(() => vi.clearAllMocks());

  it("clears only the session cookie before redirecting to login", async () => {
    await logoutAction();
    expect(mocks.deleteCookie).toHaveBeenCalledExactlyOnceWith(sessionCookieName);
    expect(mocks.redirect).toHaveBeenCalledExactlyOnceWith("/login");
    expect(mocks.deleteCookie.mock.invocationCallOrder[0]).toBeLessThan(mocks.redirect.mock.invocationCallOrder[0]);
  });
});
