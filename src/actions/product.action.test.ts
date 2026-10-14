import sharp from "sharp";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import type { Product } from "../types";

const mocks = vi.hoisted(() => ({
  read: vi.fn(), update: vi.fn(), revalidate: vi.fn(),
  createDb: vi.fn(), updateDb: vi.fn(), findDb: vi.fn(), owner: vi.fn()
}));
vi.mock("next/cache", () => ({ revalidatePath: mocks.revalidate }));
vi.mock("next/navigation", () => ({ redirect: vi.fn() }));
vi.mock("@/lib/prisma", () => ({ prisma: { product: { create: mocks.createDb, update: mocks.updateDb, findMany: mocks.findDb } } }));
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
  });
  afterEach(() => vi.unstubAllEnvs());

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
});
