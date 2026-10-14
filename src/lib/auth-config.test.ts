import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import {
  canAccessPath,
  decodeSession,
  encodeSession,
  sessionMaxAgeSeconds,
  shouldUseSecureSessionCookie,
  type AppUser
} from "./auth-config";

const owner: AppUser = {
  id: "owner",
  username: "owner",
  name: "Owner",
  role: "OWNER"
};

const staff: AppUser = {
  id: "staff",
  username: "staff",
  name: "Staff",
  role: "STAFF"
};

describe("local HTTP cookie opt-in", () => {
  afterEach(() => vi.unstubAllEnvs());

  it("keeps HTTPS cookies enabled by default in production", () => {
    vi.stubEnv("NODE_ENV", "production");
    vi.stubEnv("VUNDY_LOCAL_HTTP", "");
    expect(shouldUseSecureSessionCookie()).toBe(true);
  });

  it("allows local production HTTP only with the exact opt-in flag", () => {
    vi.stubEnv("NODE_ENV", "production");
    vi.stubEnv("VERCEL", "");
    vi.stubEnv("VUNDY_LOCAL_HTTP", "1");
    expect(shouldUseSecureSessionCookie()).toBe(false);
    vi.stubEnv("VUNDY_LOCAL_HTTP", "true");
    expect(shouldUseSecureSessionCookie()).toBe(true);
  });

  it("never disables secure production cookies on Vercel", () => {
    vi.stubEnv("NODE_ENV", "production");
    vi.stubEnv("VERCEL", "1");
    vi.stubEnv("VUNDY_LOCAL_HTTP", "1");
    expect(shouldUseSecureSessionCookie()).toBe(true);
  });
});

describe("signed sessions", () => {
  beforeEach(() => {
    vi.stubEnv("SESSION_SECRET", "test-session-secret-with-more-than-32-characters");
    vi.useFakeTimers();
    vi.setSystemTime(new Date("2026-10-11T00:00:00.000Z"));
  });

  afterEach(() => {
    vi.useRealTimers();
    vi.unstubAllEnvs();
  });

  it("round-trips a valid signed session", async () => {
    const encoded = await encodeSession(owner);

    await expect(decodeSession(encoded)).resolves.toEqual(owner);
  });

  it("rejects a modified session", async () => {
    const encoded = await encodeSession(owner);
    const [payload, signature] = encoded.split(".");
    const changedPayload = `${payload.slice(0, -1)}${payload.endsWith("A") ? "B" : "A"}`;

    await expect(decodeSession(`${changedPayload}.${signature}`)).resolves.toBeNull();
  });

  it("rejects an expired session", async () => {
    const encoded = await encodeSession(owner);
    vi.advanceTimersByTime((sessionMaxAgeSeconds + 1) * 1000);

    await expect(decodeSession(encoded)).resolves.toBeNull();
  });
});

describe("route authorization", () => {
  it("allows owners to access protected routes", () => {
    expect(canAccessPath(owner, "/settings")).toBe(true);
    expect(canAccessPath(owner, "/promotions")).toBe(true);
  });

  it("limits staff to POS and member routes", () => {
    expect(canAccessPath(staff, "/pos/history")).toBe(true);
    expect(canAccessPath(staff, "/members")).toBe(true);
    expect(canAccessPath(staff, "/settings")).toBe(false);
    expect(canAccessPath(staff, "/promotions")).toBe(false);
  });
});
