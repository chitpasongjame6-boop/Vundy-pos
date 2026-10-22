import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import type { LocalStore } from "@/lib/local-store";
import type { Product, StoreSettings } from "@/types";

const mocks = vi.hoisted(() => ({ read: vi.fn(), update: vi.fn(), auth: vi.fn(), owner: vi.fn(), approval: vi.fn(), db: {} as Record<string, unknown> }));
vi.mock("next/cache", () => ({ revalidatePath: vi.fn() }));
vi.mock("@/lib/prisma", () => ({ prisma: mocks.db }));
vi.mock("@/lib/local-store", () => ({ readLocalStore: mocks.read, updateLocalStore: mocks.update }));
vi.mock("@/lib/auth", () => ({ requireAuthenticatedUser: mocks.auth, requireOwner: mocks.owner }));
vi.mock("@/lib/approval", () => ({ verifyOwnerApproval: mocks.approval }));

let store: LocalStore;
const owner = { id: "owner", name: "Owner", role: "OWNER" };
const now = new Date("2026-10-22T05:00:00Z");
const request = { items: [{ productId: "product", variantId: "small", quantity: 1 }], paymentMethod: "CASH" as const,
  tenderCurrency: "THB" as const, tenderAmountMinor: 50000, expectedExchangeRate: 6500000, idempotencyKey: "test-sale" };

function form(values: Record<string, string>) {
  const data = new FormData();
  for (const [key, value] of Object.entries(values)) data.set(key, value);
  return data;
}

// Prisma contract double: exercises both production and local branches without
// connecting to the shop's real database or writing any real sales.
function databaseDouble() {
  const models: Record<string, keyof LocalStore> = { product: "products", sale: "sales", cashShift: "cashShifts", cashMovement: "cashMovements",
    stockMovement: "stockMovements", auditLog: "auditLogs", saleReturn: "saleReturns", purchaseOrder: "purchaseOrders", supplier: "suppliers", dailyClosing: "dailyClosings", branch: "branches", register: "registers" };
  type Row = Record<string, unknown>;
  for (const [model, collection] of Object.entries(models)) {
    const rows = () => store[collection] as unknown as Row[];
    const matches = (row: Row, where: Row = {}) => Object.entries(where).every(([key, value]) => {
      if (value && typeof value === "object") {
        const filter = value as { in?: unknown[]; gte?: Date; lt?: Date };
        if (filter.in) return filter.in.includes(row[key]);
        if (filter.gte && filter.lt) return (row[key] as Date) >= filter.gte && (row[key] as Date) < filter.lt;
      }
      return value === undefined || row[key] === value;
    });
    const create = async ({ data }: { data: Row }) => {
      const row = { id: crypto.randomUUID(), createdAt: new Date(), updatedAt: new Date(), ...data };
      rows().unshift(row); return row;
    };
    mocks.db[model] = {
      findMany: async ({ where }: { where?: Row } = {}) => rows().filter(row => matches(row, where)),
      findUnique: async ({ where }: { where: Row }) => rows().find(row => matches(row, where)) ?? null,
      findFirst: async ({ where }: { where: Row }) => rows().find(row => matches(row, where)) ?? null,
      count: async () => rows().length, create,
      createMany: async ({ data }: { data: Row[] }) => Promise.all(data.map(item => create({ data: item }))),
      update: async ({ where, data }: { where: Row; data: Row }) => {
        const row = rows().find(row => matches(row, where));
        if (!row) throw new Error(`Missing ${model}`);
        Object.assign(row, data); return row;
      },
      deleteMany: async ({ where }: { where: Row }) => {
        const rowsToKeep = rows().filter(row => !matches(row, where));
        Object.assign(store, { [collection]: rowsToKeep });
      }
    };
  }
  mocks.db.storeSettingsRecord = { findUnique: async () => store.storeSettings,
    upsert: async ({ update }: { update: Partial<StoreSettings> }) => { Object.assign(store.storeSettings, update); return store.storeSettings; } };
  mocks.db.promotion = { findMany: async () => [] };
  mocks.db.$transaction = async (run: (tx: typeof mocks.db) => Promise<unknown>) => {
    const before = structuredClone(store);
    try { return await run(mocks.db); } catch (error) { store = before; throw error; }
  };
}

describe.each(["local", "mongodb"])("currency workflows (%s)", mode => {
  beforeEach(() => {
    vi.resetModules(); vi.clearAllMocks(); vi.useFakeTimers(); vi.setSystemTime(now);
    vi.stubEnv("DATABASE_URL", mode === "mongodb" ? "mongodb://test.invalid/test" : "");
    const product: Product = { id: "product", name: "Perfume", category: "Perfume", sku: "VL10", costPrice: 100000, sellPrice: 300000,
      stock: 10, lowStockAlert: 2, isActive: true, createdAt: now, updatedAt: now,
      variants: [{ id: "small", name: "10ml", sku: "VL10", costPrice: 100000, sellPrice: 300000, stock: 10, lowStockAlert: 2 }] };
    store = { products: [product], sales: [], orders: [], members: [], memberTiers: [], promotions: [], categories: [],
      cashShifts: [{ id: "shift", shiftNo: "S1", cashierId: owner.id, cashierName: owner.name, openingCash: 100000, openingThb: 0,
        status: "OPEN", openedAt: now, createdAt: now, updatedAt: now }], cashMovements: [], stockMovements: [], auditLogs: [], saleReturns: [],
      purchaseOrders: [], suppliers: [{ id: "supplier", code: "S", name: "Supplier", isActive: true, createdAt: now, updatedAt: now }],
      dailyClosings: [], branches: [], registers: [], expenses: [],
      storeSettings: { thbEnabled: true, thbPaymentRate: 6500000, thbPurchaseRate: 6500000, taxEnabled: false, taxRate: 0, requireShiftForSale: false } as StoreSettings };
    mocks.read.mockImplementation(async () => store);
    mocks.update.mockImplementation(async (update: (current: LocalStore) => LocalStore) => { store = update(store); });
    mocks.auth.mockResolvedValue(owner); mocks.owner.mockResolvedValue(owner); mocks.approval.mockReturnValue(owner);
    databaseDouble();
  });
  afterEach(() => { vi.unstubAllEnvs(); vi.useRealTimers(); });

  it("saves actual baht, rate and kip-equivalent totals, debits stock once and is idempotent", async () => {
    const { createPosSale } = await import("./pos.action");
    const result = await createPosSale(request);
    expect(result.ok).toBe(true);
    expect(result.sale).toMatchObject({ tenderCurrency: "THB", tenderAmountMinor: 50000, exchangeRate: 6500000,
      receivedAmount: 325000, changeAmount: 25000, netAmount: 300000, totalCost: 100000, profit: 200000 });
    expect(result.sale?.payments?.[0].amount).toBe(300000);
    await createPosSale(request);
    expect(store.sales).toHaveLength(1); expect(store.cashMovements).toHaveLength(2); expect(store.products[0].stock).toBe(9);
    const { getShiftWorkspace } = await import("./shift.action");
    const workspace = await getShiftWorkspace();
    expect(workspace.expectedCash).toBe(75000); expect(workspace.expectedThb).toBe(50000);
  });

  it("rejects stale rates, missing shifts, insufficient baht and invalid payment modes without writes", async () => {
    const { createPosSale } = await import("./pos.action");
    for (const patch of [{ expectedExchangeRate: 6400000 }, { tenderAmountMinor: 100 }, { tenderAmountMinor: 500.1 }, { paymentMethod: "SPLIT" as const }]) {
      expect((await createPosSale({ ...request, ...patch })).ok).toBe(false);
    }
    store.cashShifts = [];
    expect((await createPosSale(request)).ok).toBe(false);
    expect(store.sales).toHaveLength(0); expect(store.cashMovements).toHaveLength(0); expect(store.products[0].stock).toBe(10);
  });

  it("refunds original kip into the current shift without changing the original baht receipt", async () => {
    const { createPosSale, returnPosSaleItems, getDailyClosing } = await import("./pos.action");
    await createPosSale(request);
    const saleId = store.sales[0].id;
    store.cashShifts[0].status = "CLOSED";
    store.cashShifts.unshift({ ...store.cashShifts[0], id: "new-shift", status: "OPEN", openingCash: 400000 });
    store.storeSettings.thbPaymentRate = 7000000;
    const tomorrow = new Date("2026-10-23T05:00:00Z"); vi.setSystemTime(tomorrow);
    await returnPosSaleItems(form({ saleId, reason: "Return", "returnQty-0": "1", refundMethod: "CASH" }));
    expect(store.cashMovements.find(m => m.source === "THB_REFUND")).toMatchObject({ shiftId: "new-shift", currency: "LAK", amount: 300000 });
    expect(store.sales[0].exchangeRate).toBe(6500000); expect(store.products[0].stock).toBe(10);
    expect((await getDailyClosing("2026-10-22")).cashThb).toBe(50000);
    expect((await getDailyClosing("2026-10-23")).physicalCashLak).toBe(-300000);
  });

  it("voids once and records a kip refund without removing the actual baht", async () => {
    const { createPosSale, voidPosSale } = await import("./pos.action");
    await createPosSale(request);
    const data = form({ saleId: store.sales[0].id, status: "CANCELLED", reason: "Wrong bill" });
    await voidPosSale(data); await voidPosSale(data);
    expect(store.cashMovements.filter(m => m.source === "THB_REFUND")).toHaveLength(1);
    expect(store.cashMovements.find(m => m.source === "THB_REFUND")?.amount).toBe(300000);
    expect(store.products[0].stock).toBe(10);
  });

  it("snapshots a purchase in satang, averages on receipt and never reprices after a rate change", async () => {
    const { createPurchaseOrder, receivePurchaseOrder } = await import("./inventory.action");
    await createPurchaseOrder(form({ supplierId: "supplier", productVariant: "product::small", quantity: "5",
      purchaseCostCurrency: "THB", purchaseCostAmount: "200", purchaseCostRate: "650", unitCost: "1" }));
    expect(store.purchaseOrders[0].items[0]).toMatchObject({ unitCost: 130000, purchaseAmountMinor: 20000, purchaseRate: 6500000 });
    store.storeSettings.thbPurchaseRate = 7000000;
    const receive = form({ purchaseId: store.purchaseOrders[0].id });
    await receivePurchaseOrder(receive); await receivePurchaseOrder(receive);
    expect(store.products[0]).toMatchObject({ stock: 15, costPrice: 110000, sellPrice: 300000 });
    expect(store.stockMovements.filter(m => m.type === "PURCHASE_RECEIPT")).toHaveLength(1);
    expect(store.stockMovements[0]).toMatchObject({ unitCost: 130000, purchaseCurrency: "THB", purchaseAmountMinor: 20000, purchaseRate: 6500000 });
  });

  it("preserves the original sale cost after buying more and averages returned stock at its sale cost", async () => {
    const { createPosSale, returnPosSaleItems } = await import("./pos.action");
    const { createPurchaseOrder, receivePurchaseOrder } = await import("./inventory.action");
    await createPosSale(request); // 9 remaining at 100,000
    await createPurchaseOrder(form({ supplierId: "supplier", productVariant: "product::small", quantity: "9", unitCost: "200000" }));
    await receivePurchaseOrder(form({ purchaseId: store.purchaseOrders[0].id }));
    expect(store.products[0].costPrice).toBe(150000);
    expect(store.sales[0].items[0].cost).toBe(100000);
    await returnPosSaleItems(form({ saleId: store.sales[0].id, reason: "Return", "returnQty-0": "1", refundMethod: "CASH" }));
    expect(store.products[0].variants?.[0].costPrice).toBe(147368);
    expect(store.products[0].costPrice).toBe(147368);
  });

  it("closes daily cash in separate currencies, keeping revenue in kip", async () => {
    const { createPosSale, closeDailySales } = await import("./pos.action");
    await createPosSale(request);
    await closeDailySales(form({ date: "2026-10-22", countedCash: "-25000", countedThb: "500" }));
    expect(store.dailyClosings[0]).toMatchObject({ totalAmount: 300000, cashAmount: 300000, physicalCashLak: -25000,
      cashThb: 50000, countedThb: 50000, differenceThb: 0, cashDifference: 0 });
  });

  it("keeps ordinary kip checkout working and disallows a staff discount", async () => {
    const { createPosSale } = await import("./pos.action");
    mocks.auth.mockResolvedValue({ ...owner, role: "STAFF" });
    expect((await createPosSale({ ...request, discount: 100 })).ok).toBe(false);
    const result = await createPosSale({ ...request, tenderCurrency: "LAK", receivedAmount: 350000 });
    expect(result.ok).toBe(true); expect(store.sales[0].changeAmount).toBe(50000);
    expect(store.cashMovements).toHaveLength(0);
  });

  it("adds baht movements in satang and saves a separate baht closing difference", async () => {
    const { createPosSale } = await import("./pos.action");
    const { addCashMovement, closeCashShift } = await import("./shift.action");
    await createPosSale(request);
    await addCashMovement(form({ shiftId: "shift", type: "CASH_IN", currency: "THB", amount: "12.50", reason: "Float" }));
    await closeCashShift(form({ shiftId: "shift", countedCash: "75000", countedThb: "512.25" }));
    expect(store.cashShifts[0]).toMatchObject({ expectedCash: 75000, expectedThb: 51250, countedThb: 51225, differenceThb: -25, cashDifference: 0, status: "CLOSED" });
  });

  it("only the owner can change rates and changing them leaves saved bills untouched", async () => {
    const { createPosSale } = await import("./pos.action");
    const { updateCurrencySettings } = await import("./settings.action");
    await createPosSale(request);
    const data = form({ thbEnabled: "on", thbPaymentRate: "700.125", thbPurchaseRate: "690" });
    mocks.owner.mockRejectedValueOnce(new Error("Forbidden"));
    await expect(updateCurrencySettings({ ok: null, message: "" }, data)).rejects.toThrow("Forbidden");
    expect(store.storeSettings.thbPaymentRate).toBe(6500000);
    expect((await updateCurrencySettings({ ok: null, message: "" }, data)).ok).toBe(true);
    expect(store.storeSettings).toMatchObject({ thbPaymentRate: 7001250, thbPurchaseRate: 6900000 });
    expect(store.sales[0].exchangeRate).toBe(6500000);
    expect((await updateCurrencySettings({ ok: null, message: "" }, form({ thbEnabled: "on", thbPaymentRate: "0" }))).ok).toBe(false);
  });

  it("does not mark a purchase received if its variant was deleted", async () => {
    const { createPurchaseOrder, receivePurchaseOrder } = await import("./inventory.action");
    await createPurchaseOrder(form({ supplierId: "supplier", productVariant: "product::small", quantity: "1", unitCost: "100000" }));
    store.products[0].variants![0].id = "replacement";
    await expect(receivePurchaseOrder(form({ purchaseId: store.purchaseOrders[0].id }))).rejects.toThrow();
    expect(store.purchaseOrders[0].status).toBe("ORDERED");
    expect(store.stockMovements).toHaveLength(0);
  });

  it("shows a recoverable missing-shift refund message instead of crashing the page", async () => {
    const { createPosSale, submitReturnPosSaleItems } = await import("./pos.action");
    await createPosSale(request); store.cashShifts[0].status = "CLOSED";
    const result = await submitReturnPosSaleItems({ message: "" }, form({ saleId: store.sales[0].id, reason: "Return", "returnQty-0": "1", refundMethod: "CASH" }));
    expect(result.message).toContain("ເປີດກະ"); expect(store.sales[0].status).toBe("ACTIVE"); expect(store.saleReturns).toHaveLength(0);
  });
});
