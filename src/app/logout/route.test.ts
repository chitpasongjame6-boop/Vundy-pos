import { describe, expect, it } from "vitest";
import { GET } from "./route";

describe("logout redirect origin", () => {
  it("clears the cookie without sending a LAN browser to the internal bind URL", () => {
    const response = GET(new Request("http://0.0.0.0:3000/logout", {
      headers: { host: "192.168.1.20:3001" }
    }));
    expect(response.headers.get("location")).toBe("http://192.168.1.20:3001/login");
    expect(response.headers.get("set-cookie")).toContain("vl_session=;");
    expect(response.headers.get("set-cookie")).toContain("Expires=Thu, 01 Jan 1970");
  });

  it("rejects a malformed Host instead of redirecting to it", () => {
    const response = GET(new Request("http://0.0.0.0:3000/logout", {
      headers: { host: "localhost@evil.test" }
    }));
    expect(response.status).toBe(400);
    expect(response.headers.has("location")).toBe(false);
  });
});
