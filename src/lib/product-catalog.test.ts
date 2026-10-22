import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { catalogProductName, isCatalogBarcode, safeCatalogImageUrl, type CatalogProduct } from "./product-catalog";

const barcode = "3017624010701";
const imageUrl = "https://images.openfoodfacts.org/images/products/301/762/401/0701/front_en.12.400.jpg";
const product: CatalogProduct = {
  barcode, name: "Spread", brand: "Example", category: "Spreads", quantity: "400 g",
  imageUrl, provider: "food", sourceUrl: `https://world.openfoodfacts.org/product/${barcode}`, retrievedAt: "2026-10-22T00:00:00Z"
};
const upstream = (extra = {}) => ({ status: "success", product: { code: barcode, product_name: "Spread", brands: "Example", quantity: "400 g", categories: "Food, Spreads", image_front_url: imageUrl, ...extra } });

describe("retail barcode catalog", () => {
  beforeEach(() => { vi.resetModules(); vi.stubGlobal("fetch", vi.fn()); vi.stubEnv("SESSION_SECRET", "test-catalog-secret-not-production"); });
  afterEach(() => { vi.unstubAllGlobals(); vi.unstubAllEnvs(); vi.useRealTimers(); });

  it("accepts only retail barcode lengths, keeps leading zeroes and never guesses names", () => {
    expect(isCatalogBarcode("0012345678905")).toBe(true);
    for (const code of ["SKU-01", "1234", "123456789", "https://example.com", "１２３４５６７８"]) expect(isCatalogBarcode(code)).toBe(false);
    expect(catalogProductName(product)).toBe("Example Spread");
    expect(catalogProductName({ ...product, name: "Example spread" })).toBe("Example spread");
    expect(catalogProductName({ ...product, name: "" })).toBe("");
  });

  it("only accepts known HTTPS product image paths", () => {
    expect(safeCatalogImageUrl(imageUrl)).toBe(imageUrl);
    for (const url of ["http://127.0.0.1/image.jpg", imageUrl.replace(".org", ".org.evil.test"), imageUrl + "?url=http://localhost",
      imageUrl.replace("https://", "https://user:pass@"), imageUrl.replace(".org/", ".org:8443/"),
      "https://images.openfoodfacts.org/private.jpg", "data:image/svg+xml,test", imageUrl.replace(".jpg", ".svg")]) expect(safeCatalogImageUrl(url)).toBeNull();
  });

  it("reads v3, prefers Lao, strips markup and returns only approved descriptive data", async () => {
    vi.mocked(fetch).mockResolvedValue(Response.json(upstream({ product_name_lo: "<b>ສິນຄ້າ</b>", stock: 500, costPrice: 1 })));
    const { lookupCatalogProduct } = await import("./product-catalog.server");
    const result = await lookupCatalogProduct(barcode);
    expect(result).toMatchObject({ status: "found", product: { name: "ສິນຄ້າ", category: "Spreads", imageUrl, provider: "food" } });
    expect(JSON.stringify(result)).not.toContain("costPrice");
    const [url, options] = vi.mocked(fetch).mock.calls[0];
    expect(String(url)).toContain("/api/v3/product/");
    expect(String(url)).toContain("product_type=all");
    expect(options).toMatchObject({ cache: "no-store", redirect: "manual", headers: { "User-Agent": expect.stringContaining("VundyPOS") } });
  });

  it("follows a same-product redirect to Open Beauty Facts and preserves source", async () => {
    vi.mocked(fetch).mockResolvedValueOnce(new Response(null, { status: 307, headers: { location: `https://world.openbeautyfacts.org/api/v3/product/${barcode}` } }))
      .mockResolvedValueOnce(Response.json(upstream({ product_name: "Perfume" })));
    const { lookupCatalogProduct } = await import("./product-catalog.server");
    expect(await lookupCatalogProduct(barcode)).toMatchObject({ status: "found", product: { provider: "beauty", sourceUrl: `https://world.openbeautyfacts.org/product/${barcode}` } });
  });

  it.each(["http://127.0.0.1/private", "https://world.openfoodfacts.org.evil.test/api/v3/product/3017624010701", "https://world.openbeautyfacts.org/api/v3/product/12345678"])("blocks unsafe redirects: %s", async url => {
    vi.mocked(fetch).mockResolvedValue(new Response(null, { status: 302, headers: { location: url } }));
    const { lookupCatalogProduct } = await import("./product-catalog.server");
    expect(await lookupCatalogProduct(barcode)).toEqual({ status: "unavailable" });
    expect(fetch).toHaveBeenCalledOnce();
  });

  it("deduplicates simultaneous lookups, caches matches and missing products", async () => {
    vi.mocked(fetch).mockImplementation(async () => Response.json(upstream()));
    const { lookupCatalogProduct } = await import("./product-catalog.server");
    await Promise.all([lookupCatalogProduct(barcode), lookupCatalogProduct(barcode)]);
    await lookupCatalogProduct(barcode);
    expect(fetch).toHaveBeenCalledOnce();
    vi.mocked(fetch).mockResolvedValueOnce(new Response(null, { status: 404 }));
    expect(await lookupCatalogProduct("12345678")).toEqual({ status: "not_found" });
    await lookupCatalogProduct("12345678");
    expect(fetch).toHaveBeenCalledTimes(2);
    expect(await lookupCatalogProduct("MY-SKU")).toEqual({ status: "invalid" });
    expect(fetch).toHaveBeenCalledTimes(2);
  });

  it("handles partial records without inventing missing fields", async () => {
    vi.mocked(fetch).mockResolvedValue(Response.json({ product: { code: barcode } }));
    const { lookupCatalogProduct } = await import("./product-catalog.server");
    expect(await lookupCatalogProduct(barcode)).toMatchObject({ status: "found", product: { name: "", brand: "", quantity: "", category: "", imageUrl: null } });
  });

  it("rejects a different barcode or a malformed or oversized response", async () => {
    const { lookupCatalogProduct } = await import("./product-catalog.server");
    for (const response of [Response.json(upstream({ code: "12345678" })), new Response("bad json"),
      new Response("a".repeat(512 * 1024 + 1)), new Response(null, { status: 503 })]) {
      vi.mocked(fetch).mockResolvedValueOnce(response);
      expect(await lookupCatalogProduct(barcode)).toEqual({ status: "unavailable" });
    }
  });

  it("reports an upstream timeout without caching the failure", async () => {
    vi.mocked(fetch).mockRejectedValueOnce(new DOMException("Timed out", "TimeoutError"))
      .mockResolvedValueOnce(Response.json(upstream()));
    const { lookupCatalogProduct } = await import("./product-catalog.server");
    expect(await lookupCatalogProduct(barcode)).toEqual({ status: "unavailable" });
    expect(await lookupCatalogProduct(barcode)).toMatchObject({ status: "found" });
  });

  it("limits total outbound requests to 15/minute and honors 429 cooldown", async () => {
    vi.useFakeTimers();
    vi.mocked(fetch).mockImplementation(async () => new Response(null, { status: 404 }));
    const { lookupCatalogProduct } = await import("./product-catalog.server");
    for (let index = 0; index < 15; index++) await lookupCatalogProduct(String(10000000 + index));
    expect(await lookupCatalogProduct(barcode)).toEqual({ status: "rate_limited", retryAfter: 60 });
    expect(fetch).toHaveBeenCalledTimes(15);
    vi.advanceTimersByTime(60_001);
    vi.mocked(fetch).mockResolvedValueOnce(new Response(null, { status: 429, headers: { "Retry-After": "120" } }));
    expect(await lookupCatalogProduct(barcode)).toEqual({ status: "rate_limited", retryAfter: 120 });
    expect(await lookupCatalogProduct(barcode)).toMatchObject({ status: "rate_limited" });
    expect(fetch).toHaveBeenCalledTimes(16);
  });

  it("signs a snapshot, rejects tampering and expires it after a day", async () => {
    const { signCatalogProduct, verifyCatalogProduct } = await import("./product-catalog.server");
    const token = signCatalogProduct(product);
    expect(verifyCatalogProduct(token)).toEqual(product);
    expect(() => verifyCatalogProduct(token + "x")).toThrow();
    expect(() => verifyCatalogProduct("x".repeat(13000))).toThrow();
    vi.useFakeTimers(); vi.advanceTimersByTime(86_400_001);
    expect(() => verifyCatalogProduct(token)).toThrow();
    expect(fetch).not.toHaveBeenCalled();
  });

  it("bounds image downloads, rejects wrong MIME and disables redirects", async () => {
    const { downloadCatalogImage } = await import("./product-catalog.server");
    vi.mocked(fetch).mockResolvedValueOnce(new Response(new Uint8Array([1, 2]), { headers: { "Content-Type": "image/jpeg" } }));
    expect((await downloadCatalogImage(product)).type).toBe("image/jpeg");
    expect(vi.mocked(fetch).mock.calls[0][1]).toMatchObject({ redirect: "error", cache: "no-store" });
    for (const response of [new Response("<svg />", { headers: { "Content-Type": "image/svg+xml" } }),
      new Response("large", { headers: { "Content-Type": "image/jpeg", "Content-Length": "6000000" } }), new Response(null, { status: 500 })]) {
      vi.mocked(fetch).mockResolvedValueOnce(response);
      await expect(downloadCatalogImage(product)).rejects.toThrow();
    }
    await expect(downloadCatalogImage({ ...product, imageUrl: "http://localhost/private" })).rejects.toThrow();
    expect(fetch).toHaveBeenCalledTimes(4);
  });
});
