import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { GET } from "./route";

const mocks = vi.hoisted(() => ({ user: vi.fn(), read: vi.fn(), find: vi.fn(), lookup: vi.fn(), sign: vi.fn() }));
vi.mock("@/lib/auth", () => ({ getCurrentUser: mocks.user }));
vi.mock("@/lib/local-store", () => ({ readLocalStore: mocks.read }));
vi.mock("@/lib/prisma", () => ({ prisma: { product: { findFirst: mocks.find } } }));
vi.mock("@/lib/product-catalog.server", () => ({ lookupCatalogProduct: mocks.lookup, signCatalogProduct: mocks.sign }));
const request = (code = "3017624010701") => new Request(`http://localhost/api/products/lookup?barcode=${encodeURIComponent(code)}`);

describe("owner-only barcode lookup route", () => {
  beforeEach(() => {
    vi.resetAllMocks(); vi.stubEnv("DATABASE_URL", "");
    mocks.user.mockResolvedValue({ role: "OWNER" }); mocks.read.mockResolvedValue({ products: [] });
    mocks.find.mockResolvedValue(null); mocks.lookup.mockResolvedValue({ status: "not_found" }); mocks.sign.mockReturnValue("signed-token");
  });
  afterEach(() => vi.unstubAllEnvs());
  it.each([[null, 401], [{ role: "STAFF" }, 403]])("denies non-owner access before any database/network read", async (user, status) => {
    mocks.user.mockResolvedValue(user);
    expect((await GET(request())).status).toBe(status);
    expect(mocks.read).not.toHaveBeenCalled(); expect(mocks.lookup).not.toHaveBeenCalled();
  });
  it("finds an existing inactive variant locally without external lookup or exposing cost", async () => {
    mocks.read.mockResolvedValue({ products: [{ name: "Existing", sku: "MASTER", costPrice: 999, isActive: false, variants: [{ sku: "3017624010701" }] }] });
    const response = await GET(request());
    expect(await response.json()).toEqual({ status: "existing", name: "Existing", barcode: "3017624010701" });
    expect(mocks.lookup).not.toHaveBeenCalled();
    expect(response.headers.get("Cache-Control")).toContain("no-store");
  });
  it("checks exact main and variant codes in MongoDB, including inactive products", async () => {
    vi.stubEnv("DATABASE_URL", "mongodb://test.invalid/test"); mocks.find.mockResolvedValue({ name: "Stored" });
    expect(await (await GET(request())).json()).toMatchObject({ status: "existing" });
    expect(mocks.find.mock.calls[0][0]).toMatchObject({ select: { name: true }, where: { OR: expect.any(Array) } });
    expect(mocks.read).not.toHaveBeenCalled(); expect(mocks.lookup).not.toHaveBeenCalled();
  });
  it("does not send a custom SKU or oversized input externally", async () => {
    expect(await (await GET(request("MY-SKU"))).json()).toEqual({ status: "invalid" });
    expect((await GET(request("1".repeat(129)))).status).toBe(400);
    expect(mocks.lookup).not.toHaveBeenCalled();
  });
  it("returns a signed product for review without writing anything", async () => {
    const product = { barcode: "3017624010701", name: "Public data" };
    mocks.lookup.mockResolvedValue({ status: "found", product });
    expect(await (await GET(request())).json()).toEqual({ status: "found", product, token: "signed-token" });
    expect(mocks.sign).toHaveBeenCalledWith(product);
  });
  it("returns a recoverable error on database failure, not partial external results", async () => {
    mocks.read.mockRejectedValue(new Error("private connection details"));
    expect(await (await GET(request())).json()).toEqual({ status: "unavailable" });
    expect(mocks.lookup).not.toHaveBeenCalled();
  });
});
