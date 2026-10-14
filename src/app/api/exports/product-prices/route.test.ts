import { beforeEach, describe, expect, it, vi } from "vitest";
import type { Product } from "@/types";

const mocks = vi.hoisted(() => ({ user: vi.fn(), products: vi.fn() }));
vi.mock("@/lib/auth", () => ({ getCurrentUser: mocks.user }));
vi.mock("@/actions/product.action", () => ({ getProducts: mocks.products }));
vi.mock("@/lib/product-expiry", () => ({ getShopDate: () => "2026-10-13" }));
import { GET } from "./route";

describe("product price export endpoint", () => {
  beforeEach(() => {
    vi.resetAllMocks();
    mocks.user.mockResolvedValue({ id: "owner", role: "OWNER" });
    mocks.products.mockResolvedValue([]);
  });

  it("denies an unauthenticated request before loading any products", async () => {
    mocks.user.mockResolvedValue(null);
    expect((await GET()).status).toBe(401);
    expect(mocks.products).not.toHaveBeenCalled();
  });

  it("denies staff access to cost and profit data", async () => {
    mocks.user.mockResolvedValue({ id: "staff", role: "STAFF" });
    expect((await GET()).status).toBe(403);
    expect(mocks.products).not.toHaveBeenCalled();
  });

  it("downloads the complete catalogue beyond the screen's 80-product limit", async () => {
    const products: Product[] = Array.from({ length: 105 }, (_, i) => ({
      id: String(i), name: `Product ${i}`, sku: `SKU-${i}`, category: "Perfume",
      costPrice: 100, sellPrice: 150, stock: 1, lowStockAlert: 0,
      isActive: i % 2 === 0, createdAt: new Date(), updatedAt: new Date()
    }));
    mocks.products.mockResolvedValue(products);
    const response = await GET();
    expect(response.status).toBe(200);
    expect(mocks.products).toHaveBeenCalledWith({ activeOnly: false });
    expect(response.headers.get("content-type")).toBe("text/csv; charset=utf-8");
    expect(response.headers.get("content-disposition")).toBe('attachment; filename="product-prices-2026-10-13.csv"');
    expect(response.headers.get("cache-control")).toContain("no-store");
    const bytes = new Uint8Array(await response.arrayBuffer());
    expect(Array.from(bytes.slice(0, 3))).toEqual([0xef, 0xbb, 0xbf]);
    const csv = new TextDecoder().decode(bytes);
    expect(csv.trimEnd().split("\r\n")).toHaveLength(106);
    expect(csv).toContain("Product 104,SKU-104,100,150,50\r\n");
  });

  it("returns a header-only file for an empty catalogue", async () => {
    const response = await GET();
    expect(response.status).toBe(200);
    const csv = await response.text();
    expect(csv.trimEnd().split("\r\n")).toHaveLength(1);
    expect(csv.trimEnd().split(",")).toHaveLength(5);
  });

  it("reports database failure rather than downloading an empty success file", async () => {
    mocks.products.mockRejectedValue(new Error("private database details"));
    const response = await GET();
    expect(response.status).toBe(500);
    expect(response.headers.get("content-disposition")).toBeNull();
    expect(await response.text()).not.toContain("private database details");
  });
});
