import { beforeEach, describe, expect, it, vi } from "vitest";
import { GET } from "./route";

const mocks = vi.hoisted(() => ({ owner: vi.fn(), products: vi.fn() }));
vi.mock("@/lib/auth", () => ({ requireOwner: mocks.owner }));
vi.mock("@/actions/product.action", () => ({ getProducts: mocks.products }));
vi.mock("@/actions/pos.action", () => ({ getSales: vi.fn().mockResolvedValue([]) }));
vi.mock("@/actions/inventory.action", () => ({ getInventoryWorkspace: vi.fn() }));

describe("full product export with catalog provenance", () => {
  beforeEach(() => {
    vi.resetAllMocks();
    mocks.products.mockResolvedValue([{ id: "one", name: "=UNTRUSTED()", sku: "12345678", category: "Cosmetics", isActive: true,
      costPrice: 10, sellPrice: 20, stock: 1, lowStockAlert: 5,
      catalogSource: { provider: "beauty", barcode: "12345678", sourceUrl: "https://world.openbeautyfacts.org/product/12345678", retrievedAt: "2026-10-22T00:00:00Z", imageImported: true }
    }]);
  });
  it("retains source and licensing without interpreting catalog names as formulas", async () => {
    const response = await GET(new Request("http://localhost/api/exports/products"), { params: Promise.resolve({ dataset: "products" }) });
    const csv = await response.text();
    expect(csv).toContain("catalogSource,catalogBarcode,catalogRetrievedAt,catalogDataLicense,catalogImageLicense");
    expect(csv).toContain("https://world.openbeautyfacts.org/product/12345678");
    expect(csv).toContain("ODbL 1.0"); expect(csv).toContain("CC BY-SA 3.0");
    expect(csv).toContain("'=UNTRUSTED()"); expect(mocks.owner).toHaveBeenCalledOnce();
  });
});
