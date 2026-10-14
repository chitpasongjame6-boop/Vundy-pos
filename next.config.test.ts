import { describe, expect, it, vi } from "vitest";

vi.mock("node:os", () => ({
  networkInterfaces: () => ({
    lo: [{ family: "IPv4", address: "127.0.0.1" }],
    eth0: [{ family: "IPv4", address: "192.168.1.20" }, { family: "IPv6", address: "fe80::1" }],
    other: [{ family: "IPv4", address: "192.168.1.20" }, { family: "IPv4", address: "0.0.0.0" }],
    empty: undefined
  })
}));

import nextConfig from "./next.config";

describe("local dev origin configuration", () => {
  it("allows only explicit loopback and machine IPv4 hosts for dev assets", () => {
    expect(nextConfig.allowedDevOrigins).toEqual(["127.0.0.1", "192.168.1.20"]);
  });

  it("does not weaken production Server Actions origin checks", () => {
    expect(nextConfig.experimental?.serverActions).toEqual({ bodySizeLimit: "8mb" });
  });

  it("preserves explicit redirect hosts instead of normalizing back to the bind address", () => {
    expect(nextConfig.skipProxyUrlNormalize).toBe(true);
  });
});
