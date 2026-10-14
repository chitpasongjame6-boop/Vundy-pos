import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import type { Product, Promotion, PromotionInput } from "@/types";
import type { LocalStore } from "@/lib/local-store";
import { getPricingKey, resolvePromotionPrice } from "@/lib/promotions";

const mocks = vi.hoisted(() => ({
  owner: vi.fn(), user: vi.fn(), read: vi.fn(), update: vi.fn(), revalidate: vi.fn(),
  transaction: vi.fn(), findProducts: vi.fn(), findPromotions: vi.fn(), createPromotion: vi.fn(), updatePromotion: vi.fn(), deletePromotion: vi.fn(),
  findSale: vi.fn(), createSale: vi.fn(), updateProduct: vi.fn(), audit: vi.fn(), movement: vi.fn()
}));
vi.mock("@/lib/auth", () => ({ requireOwner: mocks.owner, requireAuthenticatedUser: mocks.user }));
vi.mock("next/cache", () => ({ revalidatePath: mocks.revalidate }));
vi.mock("@/lib/local-store", () => ({ readLocalStore: mocks.read, updateLocalStore: mocks.update }));
vi.mock("@/lib/prisma", () => ({ prisma: {
  $transaction: mocks.transaction,
  product: { findMany: mocks.findProducts }, promotion: { findMany: mocks.findPromotions }
} }));

const now = new Date("2026-10-14T03:00:00Z");
const productId = "507f1f77bcf86cd799439011";
const promotionId = "507f1f77bcf86cd799439012";
const owner = { id: "owner", name: "Owner", username: "owner", role: "OWNER" as const };
const staff = { id: "staff", name: "Staff", username: "staff", role: "STAFF" as const };
const product: Product = { id: productId, name: "Perfume", sku: "P", category: "Perfume", costPrice: 100000,
  sellPrice: 250000, stock: 10, lowStockAlert: 1, isActive: true, createdAt: now, updatedAt: now };
const promotion: Promotion = { id: promotionId, name: "New Year", kind: "FIXED_PRICE", value: 200000,
  targets: [{ productId, variantId: "default" }], startsAt: now, endsAt: new Date(now.getTime() + 3600000),
  isActive: true, createdAt: now, updatedAt: now };
const input: PromotionInput = { name: promotion.name, kind: promotion.kind, value: promotion.value,
  targets: promotion.targets, isActive: true, startsAt: "2026-10-14T10:00", endsAt: "2026-10-14T11:00" };
let store: LocalStore;

function saleInput() {
  return { items: [{ productId, variantId: "default", quantity: 2 }], discount: 0,
    paymentMethod: "CASH" as const, receivedAmount: 500000, expectedNetAmount: 400000, idempotencyKey: "test-key",
    pricingKey: getPricingKey([{ productId, variantId: "default", quantity: 2,
      ...resolvePromotionPrice(productId, "default", 250000, [promotion], now.getTime()) }]) };
}

beforeEach(() => {
  vi.resetModules(); vi.clearAllMocks(); vi.useFakeTimers(); vi.setSystemTime(now);
  vi.stubEnv("DATABASE_URL", "");
  store = { products: structuredClone([product]), promotions: [], sales: [], cashShifts: [], stockMovements: [], auditLogs: [],
    storeSettings: { requireShiftForSale: false, taxEnabled: false, taxRate: 0, defaultBranchName: "Shop" } } as unknown as LocalStore;
  mocks.owner.mockResolvedValue(owner); mocks.user.mockResolvedValue(staff);
  mocks.read.mockImplementation(async () => store);
  mocks.update.mockImplementation(async updater => { store = await updater(store); return store; });
  mocks.findProducts.mockImplementation(async () => store.products);
  mocks.findPromotions.mockImplementation(async () => store.promotions);
  mocks.findSale.mockResolvedValue(null);
  mocks.createPromotion.mockImplementation(async ({ data }) => ({ ...data, id: promotionId, createdAt: now, updatedAt: now }));
  mocks.updatePromotion.mockImplementation(async ({ data }) => ({ ...promotion, ...data }));
  mocks.deletePromotion.mockImplementation(async ({ where }) => {
    const found = store.promotions.find(item => item.id === where.id);
    if (!found) throw new Error("Promotion missing");
    store = { ...store, promotions: store.promotions.filter(item => item.id !== where.id) };
    return found;
  });
  mocks.createSale.mockImplementation(async ({ data }) => ({ ...data, id: "sale1", createdAt: now, updatedAt: now }));
  mocks.transaction.mockImplementation(async callback => callback({
    product: { findMany: mocks.findProducts, update: mocks.updateProduct },
    promotion: { findMany: mocks.findPromotions, create: mocks.createPromotion, update: mocks.updatePromotion, delete: mocks.deletePromotion },
    sale: { findUnique: mocks.findSale, count: vi.fn().mockResolvedValue(0), create: mocks.createSale },
    storeSettingsRecord: { findUnique: vi.fn().mockResolvedValue(store.storeSettings) },
    cashShift: { findFirst: vi.fn().mockResolvedValue(null) }, auditLog: { create: mocks.audit }, stockMovement: { create: mocks.movement }
  }));
});
afterEach(() => { vi.useRealTimers(); vi.unstubAllEnvs(); });

describe("owner promotion management", () => {
  it("creates, edits and pauses a promotion locally with an audit trail", async () => {
    const { savePromotion, setPromotionEnabled } = await import("./promotion.action");
    expect((await savePromotion(input)).ok).toBe(true);
    const saved = store.promotions[0];
    expect(new Date(saved.startsAt).toISOString()).toBe(now.toISOString());
    expect((await savePromotion({ ...input, id: saved.id, value: 180000 })).ok).toBe(true);
    expect(store.promotions).toHaveLength(1);
    expect(store.promotions[0].value).toBe(180000);
    expect((await setPromotionEnabled(saved.id, false)).ok).toBe(true);
    expect(store.promotions[0].isActive).toBe(false);
    expect(store.auditLogs.map(log => log.action)).toEqual(["PROMOTION_PAUSED", "PROMOTION_UPDATED", "PROMOTION_CREATED"]);
    expect(store.products[0].sellPrice).toBe(250000);
  });
  it("checks owner authorization even when a staff client calls the action directly", async () => {
    mocks.owner.mockRejectedValue(new Error("Forbidden"));
    const actions = await import("./promotion.action");
    await expect(actions.savePromotion(input)).rejects.toThrow("Forbidden");
    await expect(actions.setPromotionEnabled(promotionId, false)).rejects.toThrow("Forbidden");
    await expect(actions.deletePromotion(promotionId)).rejects.toThrow("Forbidden");
    await expect(actions.getPromotions()).rejects.toThrow("Forbidden");
    expect(mocks.update).not.toHaveBeenCalled();
    expect(mocks.transaction).not.toHaveBeenCalled();
  });
  it("rejects invalid dates/targets and does not silently create a missing edit", async () => {
    const { savePromotion } = await import("./promotion.action");
    expect((await savePromotion({ ...input, endsAt: input.startsAt })).ok).toBe(false);
    expect((await savePromotion({ ...input, targets: [{ productId, variantId: "missing" }] })).ok).toBe(false);
    expect((await savePromotion({ ...input, id: "missing" })).ok).toBe(false);
    expect(store.promotions).toHaveLength(0);
  });
  it("writes the same typed data and audit event through the database transaction", async () => {
    vi.stubEnv("DATABASE_URL", "mongodb://test.invalid/test");
    const { savePromotion, setPromotionEnabled } = await import("./promotion.action");
    expect((await savePromotion(input)).ok).toBe(true);
    expect(mocks.createPromotion.mock.calls[0][0].data).toMatchObject({ value: 200000, startsAt: now, targets: input.targets });
    expect((await setPromotionEnabled(promotionId, false)).ok).toBe(true);
    expect(mocks.updatePromotion).toHaveBeenCalledWith({ where: { id: promotionId }, data: { isActive: false } });
    expect(mocks.audit).toHaveBeenCalledTimes(2);
  });
  it("returns enabled future/active rules to authenticated POS clients", async () => {
    store.promotions = [promotion, { ...promotion, id: "paused", isActive: false }, { ...promotion, id: "ended", endsAt: now }];
    const { getPosPromotions } = await import("./promotion.action");
    expect((await getPosPromotions()).promotions.map(promo => promo.id)).toEqual([promotionId]);
    expect(mocks.user).toHaveBeenCalled();
  });
});

describe.each(["local", "database"])("promotion deletion (%s)", mode => {
  beforeEach(() => {
    store.promotions = [structuredClone(promotion), { ...promotion, id: "other", name: "Keep this promotion", isActive: false }];
    if (mode === "database") vi.stubEnv("DATABASE_URL", "mongodb://test.invalid/test");
  });

  it.each(["active", "paused", "expired"])("deletes only the selected %s promotion and records the owner's identity", async status => {
    if (status === "paused") store.promotions[0].isActive = false;
    if (status === "expired") store.promotions[0].endsAt = now;
    const { deletePromotion } = await import("./promotion.action");
    expect((await deletePromotion(promotionId)).ok).toBe(true);
    expect(store.promotions.map(item => item.id)).toEqual(["other"]);
    const audit = mode === "local" ? store.auditLogs[0] : mocks.audit.mock.calls[0][0].data;
    expect(audit).toMatchObject({ action: "PROMOTION_DELETED", entityId: promotionId,
      description: promotion.name, userId: owner.id, userName: owner.name, userRole: "OWNER" });
    expect(mocks.revalidate).toHaveBeenCalledWith("/promotions");
    expect(mocks.revalidate).toHaveBeenCalledWith("/pos");
    if (mode === "database") {
      expect(mocks.transaction).toHaveBeenCalledTimes(1);
      expect(mocks.deletePromotion).toHaveBeenCalledWith({ where: { id: promotionId } });
    }
  });

  it("keeps historical sale prices, totals, stock and movements unchanged", async () => {
    const { createPosSale } = await import("./pos.action");
    const sold = await createPosSale(saleInput());
    expect(sold.ok).toBe(true);
    const storedSale = mode === "local" ? store.sales[0] : mocks.createSale.mock.calls[0][0].data;
    const savedSnapshot = structuredClone(storedSale);
    const before = structuredClone(store);
    const writes = { sale: mocks.createSale.mock.calls.length, product: mocks.updateProduct.mock.calls.length,
      movement: mocks.movement.mock.calls.length };
    const { deletePromotion } = await import("./promotion.action");
    expect((await deletePromotion(promotionId)).ok).toBe(true);
    expect(storedSale).toEqual(savedSnapshot);
    expect(storedSale.items[0]).toMatchObject({ originalPrice: 250000, price: 200000, promotionId, promotionName: "New Year" });
    expect(storedSale).toMatchObject({ totalAmount: 500000, discount: 100000, netAmount: 400000 });
    expect(store.sales).toEqual(before.sales);
    expect(store.products).toEqual(before.products);
    expect(store.stockMovements).toEqual(before.stockMovements);
    expect(mocks.createSale).toHaveBeenCalledTimes(writes.sale);
    expect(mocks.updateProduct).toHaveBeenCalledTimes(writes.product);
    expect(mocks.movement).toHaveBeenCalledTimes(writes.movement);
  });

  it("rejects a stale POS quote after deletion and accepts a reviewed regular-price quote", async () => {
    const quoted = saleInput();
    const { deletePromotion, getPosPromotions } = await import("./promotion.action");
    await deletePromotion(promotionId);
    expect((await getPosPromotions()).promotions.some(item => item.id === promotionId)).toBe(false);
    const { createPosSale } = await import("./pos.action");
    expect(await createPosSale(quoted)).toMatchObject({ ok: false, priceChanged: true });
    expect(store.sales).toHaveLength(0);
    expect(mocks.createSale).not.toHaveBeenCalled();
    expect(mocks.updateProduct).not.toHaveBeenCalled();
    expect(store.products[0].stock).toBe(10);
    const pricingKey = getPricingKey([{ productId, variantId: "default", quantity: 2,
      ...resolvePromotionPrice(productId, "default", 250000, [], now.getTime()) }]);
    expect(await createPosSale({ ...quoted, pricingKey, expectedNetAmount: 500000 }))
      .toMatchObject({ ok: true, sale: { discount: 0, netAmount: 500000 } });
  });

  it("rejects malformed IDs before any write", async () => {
    const { deletePromotion } = await import("./promotion.action");
    const invalid: unknown[] = ["", "  ", null, {}, "x".repeat(129)];
    if (mode === "database") invalid.push("not-an-object-id");
    for (const id of invalid) expect((await deletePromotion(id as string)).ok).toBe(false);
    expect(mocks.update).not.toHaveBeenCalled();
    expect(mocks.transaction).not.toHaveBeenCalled();
  });

  it("does not delete other promotions when the requested promotion is missing", async () => {
    const before = structuredClone(store);
    const { deletePromotion } = await import("./promotion.action");
    expect((await deletePromotion("507f1f77bcf86cd799439099")).ok).toBe(false);
    expect(store).toEqual(before);
    expect(mocks.audit).not.toHaveBeenCalled();
    expect(mocks.revalidate).not.toHaveBeenCalled();
  });

  it("returns a safe failure when persistence fails without reporting success", async () => {
    const before = structuredClone(store);
    if (mode === "database") mocks.transaction.mockRejectedValueOnce(new Error("private database error"));
    else mocks.update.mockRejectedValueOnce(new Error("private disk error"));
    const { deletePromotion } = await import("./promotion.action");
    const result = await deletePromotion(promotionId);
    expect(result.ok).toBe(false);
    expect(result.message).not.toContain("private");
    expect(store).toEqual(before);
    expect(mocks.revalidate).not.toHaveBeenCalled();
  });
});

describe.each(["local", "database"])("automatic POS promotions (%s)", mode => {
  beforeEach(() => {
    store.promotions = [structuredClone(promotion)];
    if (mode === "database") vi.stubEnv("DATABASE_URL", "mongodb://test.invalid/test");
  });
  it("lets staff sell at the authorized promo price, snapshots it, and subtracts stock only once", async () => {
    const { createPosSale } = await import("./pos.action");
    const result = await createPosSale(saleInput());
    expect(result).toMatchObject({ ok: true, sale: { totalAmount: 500000, discount: 100000, netAmount: 400000, changeAmount: 100000 } });
    expect(result.sale?.items[0]).toMatchObject({ originalPrice: 250000, price: 200000, promotionName: "New Year", cost: 0 });
    const saved = mode === "local" ? store.sales[0] : mocks.createSale.mock.calls[0][0].data;
    expect(saved.profit).toBe(200000);
    expect(saved.approvedById).toBeNull();
    if (mode === "local") {
      expect(store.products[0].stock).toBe(8);
      await createPosSale(saleInput());
      expect(store.products[0].stock).toBe(8);
      expect(store.sales).toHaveLength(1);
    } else {
      expect(mocks.updateProduct.mock.calls[0][0].data.stock).toBe(8);
      mocks.findSale.mockResolvedValue({ ...saved, id: "sale1", createdAt: now, updatedAt: now });
      await createPosSale(saleInput());
      expect(mocks.createSale).toHaveBeenCalledTimes(1);
    }
  });
  it("rejects stale or forged quotes before recording a sale or changing stock", async () => {
    const { createPosSale } = await import("./pos.action");
    expect(await createPosSale({ ...saleInput(), pricingKey: "forged" })).toMatchObject({ ok: false, priceChanged: true });
    expect(await createPosSale({ ...saleInput(), expectedNetAmount: 1 })).toMatchObject({ ok: false, priceChanged: true });
    expect(await createPosSale({ ...saleInput(), pricingKey: undefined })).toMatchObject({ ok: false, priceChanged: true });
    store.promotions[0].isActive = false;
    expect(await createPosSale(saleInput())).toMatchObject({ ok: false, priceChanged: true });
    store.promotions[0].isActive = true;
    vi.setSystemTime(new Date(now.getTime() + 3600000));
    expect(await createPosSale(saleInput())).toMatchObject({ ok: false, priceChanged: true });
    expect(store.sales).toHaveLength(0); expect(mocks.createSale).not.toHaveBeenCalled();
    expect(mocks.updateProduct).not.toHaveBeenCalled(); expect(store.products[0].stock).toBe(10);
  });
  it("does not give staff manual-discount rights and does not stack owner bill discounts", async () => {
    const { createPosSale } = await import("./pos.action");
    expect((await createPosSale({ ...saleInput(), discount: 1 })).ok).toBe(false);
    mocks.user.mockResolvedValue(owner);
    expect((await createPosSale({ ...saleInput(), discount: 10000 })).ok).toBe(false);
    expect(mocks.createSale).not.toHaveBeenCalled(); expect(store.sales).toHaveLength(0);
  });
  it("charges a percentage discount and restores normal pricing after the end time", async () => {
    store.promotions[0] = { ...promotion, kind: "PERCENT", value: 10 };
    const { createPosSale } = await import("./pos.action");
    const percentKey = getPricingKey([{ productId, variantId: "default", quantity: 2,
      ...resolvePromotionPrice(productId, "default", 250000, store.promotions, now.getTime()) }]);
    const discounted = await createPosSale({ ...saleInput(), pricingKey: percentKey, expectedNetAmount: 450000 });
    expect(discounted).toMatchObject({ ok: true, sale: { discount: 50000, netAmount: 450000 } });
    const later = now.getTime() + 3600000;
    vi.setSystemTime(new Date(later));
    const normalKey = getPricingKey([{ productId, variantId: "default", quantity: 2,
      ...resolvePromotionPrice(productId, "default", 250000, store.promotions, later) }]);
    expect(await createPosSale({ ...saleInput(), idempotencyKey: "next-sale", pricingKey: normalKey, expectedNetAmount: 500000 }))
      .toMatchObject({ ok: true, sale: { discount: 0, netAmount: 500000 } });
    expect(discounted.sale?.items[0]).toMatchObject({ price: 225000, originalPrice: 250000, promotionName: "New Year" });
  });
});
