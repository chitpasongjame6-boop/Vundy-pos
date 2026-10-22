import sharp from "sharp";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import type { Product } from "../types";
import type { CatalogProduct } from "@/lib/product-catalog";

const mocks = vi.hoisted(() => ({
  read: vi.fn(), update: vi.fn(), revalidate: vi.fn(),
  createDb: vi.fn(), updateDb: vi.fn(), findDb: vi.fn(), owner: vi.fn(), openingDb: vi.fn(), categoryDb: vi.fn()
}));
vi.mock("next/cache", () => ({ revalidatePath: mocks.revalidate }));
vi.mock("next/navigation", () => ({ redirect: vi.fn() }));
vi.mock("@/lib/prisma", () => ({ prisma: { product: { create: mocks.createDb, update: mocks.updateDb, findMany: mocks.findDb },
  $transaction: (run: (tx: unknown) => unknown) => run({ product: { create: mocks.createDb }, category: { upsert: mocks.categoryDb }, stockMovement: { createMany: mocks.openingDb } }) } }));
vi.mock("@/lib/auth", () => ({ requireOwner: mocks.owner, requireAuthenticatedUser: vi.fn() }));
vi.mock("@/lib/local-store", () => ({ readLocalStore: mocks.read, updateLocalStore: mocks.update }));
vi.mock("@/actions/settings.action", () => ({ getCategories: vi.fn().mockResolvedValue(["Perfume"]) }));

let localStore: { products: Product[]; categories: string[] };

function productForm(dates: string[]) {
  const form = new FormData();
  form.set("name", "Expiry test");
  form.set("category", "Perfume");
  form.set("isActive", "on");
  dates.forEach((date, index) => {
    form.append("variantName", `${index + 1}ml`);
    form.append("variantSku", `TEST-${index}`);
    form.append("variantUnit", "pcs");
    form.append("variantCostPrice", "1000");
    form.append("variantSellPrice", "2000");
    form.append("variantStock", "5");
    form.append("variantLowStockAlert", "2");
    form.append("variantExpiryDate", date);
  });
  return form;
}

describe("product expiry and image saving", () => {
  beforeEach(() => {
    vi.resetModules();
    vi.clearAllMocks();
    vi.stubEnv("DATABASE_URL", "");
    vi.stubEnv("R2_ACCOUNT_ID", "");
    localStore = { products: [], categories: [] };
    mocks.read.mockImplementation(async () => localStore);
    mocks.update.mockImplementation(async (update) => { localStore = update(localStore); });
    mocks.findDb.mockResolvedValue([]);
    mocks.owner.mockResolvedValue({ id: "owner", name: "Owner", role: "OWNER" });
    mocks.createDb.mockImplementation(async ({ data }) => ({ id: "product", ...data, createdAt: new Date(), updatedAt: new Date() }));
  });
  afterEach(() => { vi.unstubAllEnvs(); vi.unstubAllGlobals(); });

  it("creates multiple variants with distinct dates and a compressed photo in local mode", async () => {
    const { createProduct } = await import("./product.action");
    const form = productForm(["2026-10-13", "2027-01-01"]);
    const bytes = await sharp({ create: { width: 40, height: 20, channels: 3, background: "red" } }).png().toBuffer();
    form.set("productImage", new File([new Uint8Array(bytes)], "photo.png", { type: "image/png" }));
    expect((await createProduct(form)).ok).toBe(true);
    expect(localStore.products[0].variants?.map((variant) => variant.expiryDate)).toEqual(["2026-10-13", "2027-01-01"]);
    expect(localStore.products[0].imageUrl).toMatch(/^data:image\/webp;base64,/);
    expect(mocks.revalidate).toHaveBeenCalledWith("/alerts");
    expect(mocks.owner).toHaveBeenCalled();
  });

  it("edits and clears dates while retaining the existing photo", async () => {
    const { createProduct, updateProductInfo } = await import("./product.action");
    await createProduct(productForm(["2026-10-13", "2027-01-01"]));
    const original = localStore.products[0];
    const edit = productForm(["", "2027-02-01"]);
    edit.set("productId", original.id);
    edit.set("currentImageUrl", "https://images.example.com/existing.webp");
    original.variants!.forEach((variant) => edit.append("variantId", variant.id));
    expect((await updateProductInfo({ ok: null, message: "" }, edit)).ok).toBe(true);
    expect(localStore.products[0].variants?.map((variant) => variant.expiryDate)).toEqual([null, "2027-02-01"]);
    expect(localStore.products[0].variants?.map((variant) => variant.id)).toEqual(original.variants?.map((variant) => variant.id));
    expect(localStore.products[0].imageUrl).toBe("https://images.example.com/existing.webp");
    expect(mocks.revalidate).toHaveBeenCalledWith("/alerts");
  });

  it("rejects invalid dates and corrupt image bytes without saving a product", async () => {
    const { createProduct } = await import("./product.action");
    expect((await createProduct(productForm(["2026-02-30"]))).ok).toBe(false);
    const form = productForm([""]);
    form.set("productImage", new File(["bad image"], "photo.jpg", { type: "image/jpeg" }));
    expect((await createProduct(form)).ok).toBe(false);
    expect(localStore.products).toHaveLength(0);
  });

  it("saves typed dates on create and edit as ISO dates, even without blurring the field", async () => {
    const { createProduct, updateProductInfo } = await import("./product.action");
    expect((await createProduct(productForm(["31/12/2026", "03042027"]))).ok).toBe(true);
    const original = localStore.products[0];
    expect(original.variants?.map((variant) => variant.expiryDate)).toEqual(["2026-12-31", "2027-04-03"]);

    const edit = productForm(["29022028", ""]);
    edit.set("productId", original.id);
    original.variants!.forEach((variant) => edit.append("variantId", variant.id));
    expect((await updateProductInfo({ ok: null, message: "" }, edit)).ok).toBe(true);
    expect(localStore.products[0].variants?.map((variant) => variant.expiryDate)).toEqual(["2028-02-29", null]);
  });

  it("does not save an impossible typed date on create or edit", async () => {
    const { createProduct, updateProductInfo } = await import("./product.action");
    expect((await createProduct(productForm(["31/02/2026"]))).ok).toBe(false);
    expect(localStore.products).toHaveLength(0);
    await createProduct(productForm(["2026-12-31"]));
    const original = localStore.products[0];
    const edit = productForm(["31042027"]);
    edit.set("productId", original.id);
    original.variants!.forEach((variant) => edit.append("variantId", variant.id));
    expect((await updateProductInfo({ ok: null, message: "" }, edit)).ok).toBe(false);
    expect(localStore.products[0].variants?.[0].expiryDate).toBe("2026-12-31");
  });

  it("writes expiry dates through Prisma in database mode", async () => {
    vi.stubEnv("DATABASE_URL", "mongodb://test.invalid/test");
    const { createProduct } = await import("./product.action");
    expect((await createProduct(productForm(["2027-06-01", ""]))).ok).toBe(true);
    const data = mocks.createDb.mock.calls[0][0].data;
    expect(data.variants.map((variant: { expiryDate: string | null }) => variant.expiryDate)).toEqual(["2027-06-01", null]);
    expect(mocks.update).not.toHaveBeenCalled();
  });

  it("converts THB cost server-side, keeps its original rate and ignores a forged kip preview", async () => {
    const { createProduct, updateProductInfo } = await import("./product.action");
    const form = productForm([""]);
    form.set("variantCostCurrency", "THB"); form.set("variantCostAmount", "200.50"); form.set("variantCostRate", "650");
    form.set("variantCostPrice", "1"); form.set("variantSellPrice", "200000");
    expect((await createProduct(form)).ok).toBe(true);
    const product = localStore.products[0];
    expect(product.variants?.[0]).toMatchObject({ costPrice: 130325, purchaseCurrency: "THB", purchaseAmountMinor: 20050, purchaseRate: 6500000 });
    const edit = productForm([""]);
    edit.set("productId", product.id); edit.set("variantId", product.variants![0].id);
    edit.set("variantCostPrice", "130325"); edit.set("variantSellPrice", "200000");
    expect((await updateProductInfo({ ok: null, message: "" }, edit)).ok).toBe(true);
    expect(localStore.products[0].variants?.[0].purchaseAmountMinor).toBe(20050);
  });

  it("rejects missing THB rates, negative prices and fractional stock before writing", async () => {
    const { createProduct } = await import("./product.action");
    const form = productForm([""]);
    form.set("variantCostCurrency", "THB"); form.set("variantCostAmount", "200");
    expect((await createProduct(form)).ok).toBe(false);
    form.set("variantCostRate", "650"); form.set("variantSellPrice", "-1");
    expect((await createProduct(form)).ok).toBe(false);
    form.set("variantSellPrice", "200000"); form.set("variantStock", "1.5");
    expect((await createProduct(form)).ok).toBe(false);
    expect(localStore.products).toHaveLength(0);
  });

  const catalog: CatalogProduct = {
    barcode: "3017624010701", name: "Cream", brand: "Example", quantity: "100 ml", category: "Cosmetics",
    imageUrl: "https://images.openbeautyfacts.org/images/products/301/762/401/0701/front_en.1.400.jpg",
    provider: "beauty", sourceUrl: "https://world.openbeautyfacts.org/product/3017624010701", retrievedAt: "2026-10-22T00:00:00Z"
  };
  async function catalogForm() {
    vi.stubEnv("SESSION_SECRET", "test-catalog-secret-not-production");
    const { signCatalogProduct } = await import("@/lib/product-catalog.server");
    const form = productForm([""]); form.set("variantSku", catalog.barcode);
    form.set("catalogToken", signCatalogProduct(catalog)); form.set("catalogUseImage", "on");
    return form;
  }

  it.each([false, true])("imports an approved image as WebP, saves attribution, keeps shop prices (Mongo=%s)", async database => {
    if (database) vi.stubEnv("DATABASE_URL", "mongodb://test.invalid/test");
    const form = await catalogForm();
    const bytes = await sharp({ create: { width: 30, height: 20, channels: 3, background: "blue" } }).png().toBuffer();
    vi.stubGlobal("fetch", vi.fn().mockResolvedValue(new Response(new Uint8Array(bytes), { headers: { "Content-Type": "image/png" } })));
    const { createProduct } = await import("./product.action");
    expect((await createProduct(form)).ok).toBe(true);
    const saved = database ? mocks.createDb.mock.calls[0][0].data : localStore.products[0];
    expect(saved.imageUrl).toMatch(/^data:image\/webp;base64,/);
    expect(saved.catalogSource).toMatchObject({ barcode: catalog.barcode, provider: "beauty", imageImported: true });
    expect(saved.costPrice).toBe(1000); expect(saved.sellPrice).toBe(2000); expect(saved.stock).toBe(5);
    expect(fetch).toHaveBeenCalledOnce(); // No second product lookup during save.
    if (database) expect(mocks.categoryDb).toHaveBeenCalledWith({ where: { name: "Perfume" }, update: { isActive: true }, create: { name: "Perfume" } });
  });

  it("can save without the remote image when offline, keeping data credit", async () => {
    const form = await catalogForm(); form.set("catalogUseImage", "");
    vi.stubGlobal("fetch", vi.fn());
    const { createProduct } = await import("./product.action");
    expect((await createProduct(form)).ok).toBe(true); expect(fetch).not.toHaveBeenCalled();
    expect(localStore.products[0].catalogSource?.imageImported).toBe(false);
  });

  it("prefers an uploaded image over the catalog and keeps attribution when editing", async () => {
    const form = await catalogForm();
    const bytes = await sharp({ create: { width: 20, height: 20, channels: 3, background: "blue" } }).png().toBuffer();
    form.set("productImage", new File([new Uint8Array(bytes)], "own.png", { type: "image/png" }));
    vi.stubGlobal("fetch", vi.fn());
    const { createProduct, updateProductInfo } = await import("./product.action");
    expect((await createProduct(form)).ok).toBe(true); expect(fetch).not.toHaveBeenCalled();
    const original = localStore.products[0];
    const edit = productForm([""]); edit.set("productId", original.id); edit.set("variantId", original.variants![0].id);
    edit.set("variantSku", catalog.barcode); edit.set("currentImageUrl", original.imageUrl!);
    expect((await updateProductInfo({ ok: null, message: "" }, edit)).ok).toBe(true);
    expect(localStore.products[0].catalogSource).toEqual(original.catalogSource);
  });

  it("rejects forged snapshots, changed barcodes and corrupt remote images without saving", async () => {
    const form = await catalogForm(); const token = String(form.get("catalogToken"));
    vi.stubGlobal("fetch", vi.fn().mockResolvedValue(new Response("not a real photo", { headers: { "Content-Type": "image/jpeg" } })));
    const { createProduct } = await import("./product.action");
    form.set("catalogToken", token + "x"); expect((await createProduct(form)).ok).toBe(false);
    form.set("catalogToken", token); form.set("variantSku", "12345678"); expect((await createProduct(form)).ok).toBe(false);
    expect(fetch).not.toHaveBeenCalled();
    form.set("variantSku", catalog.barcode); expect((await createProduct(form)).ok).toBe(false);
    expect(localStore.products).toHaveLength(0);
  });
});
