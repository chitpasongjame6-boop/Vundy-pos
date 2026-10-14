import { describe, expect, it } from "vitest";
import { GET } from "./route";

describe("safe legacy logout navigation", () => {
  it("preserves the session and the LAN browser origin on GET", () => {
    const response = GET(new Request("http://0.0.0.0:3000/logout", {
      headers: { host: "192.168.1.20:3001" }
    }));
    expect(response.headers.get("location")).toBe("http://192.168.1.20:3001/login");
    expect(response.headers.has("set-cookie")).toBe(false);
    expect(response.headers.get("cache-control")).toBe("no-store");
  });

  it.each<Record<string, string>>([
    { "next-router-prefetch": "1" },
    { rsc: "1", "next-router-prefetch": "1" },
    { rsc: "1", "next-router-prefetch": "1", "next-router-segment-prefetch": "/_tree" },
    { purpose: "prefetch" }
  ])("never clears a session during prefetch: %j", (headers) => {
    const response = GET(new Request("http://localhost:3000/logout", {
      headers: { ...headers, host: "localhost:3000", cookie: "vl_session=existing-session" }
    }));
    expect(response.status).toBe(307);
    expect(response.headers.has("set-cookie")).toBe(false);
  });

  it("rejects a malformed Host instead of redirecting to it", () => {
    const response = GET(new Request("http://0.0.0.0:3000/logout", {
      headers: { host: "localhost@evil.test" }
    }));
    expect(response.status).toBe(400);
    expect(response.headers.has("location")).toBe(false);
  });
});
