import { existsSync } from "node:fs";
import { resolve } from "node:path";
import { NextRequest } from "next/server";
import { unstable_doesMiddlewareMatch } from "next/experimental/testing/server";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { config, proxy } from "./proxy";
import { encodeSession, sessionCookieName, type UserRole } from "./lib/auth-config";

function request(path: string, host: string, options: NonNullable<ConstructorParameters<typeof NextRequest>[1]> = {}) {
  const headers = new Headers(options.headers);
  headers.set("host", host);
  // Model Next's internal Docker bind URL, different from the browser's Host.
  return new NextRequest(`http://0.0.0.0:3000${path}`, { ...options, headers });
}

async function session(role: UserRole) {
  return `${sessionCookieName}=${await encodeSession({ id: role, username: "test", name: "Test", role })}`;
}

describe("local access and authentication redirects", () => {
  beforeEach(() => vi.stubEnv("SESSION_SECRET", "test-local-redirect-secret-at-least-32-characters"));
  afterEach(() => vi.unstubAllEnvs());

  it("places Proxy beside src/app so Next actually discovers it", () => {
    expect(existsSync(resolve("src/proxy.ts"))).toBe(true);
    expect(existsSync(resolve("proxy.ts"))).toBe(false);
  });

  it.each(["0.0.0.0:3001", "[::]:3001"])("redirects navigation from %s before rendering", async host => {
    const response = await proxy(request("/products?query=coffee", host));
    expect(response.status).toBe(307);
    expect(response.headers.get("location")).toBe("http://localhost:3001/products?query=coffee");
    expect(response.headers.get("cache-control")).toBe("no-store");
  });

  it("does not redirect or replay credentials from a POST to another host", async () => {
    const response = await proxy(request("/login", "0.0.0.0:3000", {
      method: "POST", body: "username=test&password=private"
    }));
    expect(response.status).toBe(400);
    expect(response.headers.has("location")).toBe(false);
    expect(await response.text()).not.toContain("private");
  });

  it.each(["localhost:3000", "127.0.0.1:3001", "192.168.1.20:3100", "[::1]:3001"])(
    "keeps login redirects on the actual browser host %s", async host => {
      const response = await proxy(request("/dashboard", host));
      expect(response.headers.get("location")).toBe(`http://${host}/login?next=%2Fdashboard`);
    }
  );

  it("keeps localhost/production login and the database health endpoint accessible", async () => {
    for (const host of ["localhost:3000", "pos.example.com"]) {
      expect((await proxy(request("/login", host))).headers.get("x-middleware-next")).toBe("1");
    }
    expect((await proxy(request("/api/health", "0.0.0.0:3000"))).headers.get("x-middleware-next")).toBe("1");
  });

  it("keeps the public HTTPS URL when redirecting a signed-in owner", async () => {
    const response = await proxy(new NextRequest("https://pos.example.com/login", {
      headers: { host: "pos.example.com", cookie: await session("OWNER") }
    }));
    expect(response.headers.get("location")).toBe("https://pos.example.com/dashboard");
  });

  it("preserves staff access restrictions without redirecting LAN clients to the server bind URL", async () => {
    const cookie = await session("STAFF");
    const denied = await proxy(request("/settings", "192.168.1.20:3001", { headers: { cookie } }));
    expect(denied.headers.get("location")).toBe("http://192.168.1.20:3001/pos");
    const allowed = await proxy(request("/pos", "192.168.1.20:3001", { headers: { cookie } }));
    expect(allowed.headers.get("x-middleware-next")).toBe("1");
  });

  it.each(["good@evil.test", "good.test/path", "good.test\\evil", "good.test,evil.test", "https://evil.test", "good.test#evil"])(
    "rejects malformed Host headers: %s", async host => {
      const response = await proxy(request("/login", host));
      expect(response.status).toBe(400);
      expect(response.headers.has("location")).toBe(false);
    }
  );

  it("does not derive a redirect target from an arbitrary forwarded host or origin", async () => {
    const response = await proxy(request("/dashboard", "192.168.1.20:3001", {
      headers: { "x-forwarded-host": "evil.test", origin: "http://evil.test" }
    }));
    expect(response.headers.get("location")).toBe("http://192.168.1.20:3001/login?next=%2Fdashboard");
    expect(response.headers.has("access-control-allow-origin")).toBe(false);
  });

  it("covers page requests but leaves JS, CSS, fonts and images alone", () => {
    for (const url of ["/", "/login", "/pos", "/api/health"]) {
      expect(unstable_doesMiddlewareMatch({ config, nextConfig: {}, url })).toBe(true);
    }
    for (const url of ["/_next/static/chunks/app.js", "/_next/image?url=test", "/vundy-logo.png", "/fonts/NotoSansLao.woff2"]) {
      expect(unstable_doesMiddlewareMatch({ config, nextConfig: {}, url })).toBe(false);
    }
  });
});
