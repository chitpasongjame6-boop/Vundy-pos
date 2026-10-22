import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => ({ owner: vi.fn(), read: vi.fn(), update: vi.fn() }));
vi.mock("@/lib/prisma", () => ({ prisma: {} }));
vi.mock("@/lib/auth", () => ({ requireOwner: mocks.owner }));
vi.mock("@/lib/local-store", () => ({ readLocalStore: mocks.read, updateLocalStore: mocks.update,
  defaultStoreSettings: { thbEnabled: false, thbPaymentRate: 0, thbPurchaseRate: 0 } }));

const legacy = { products: [], orders: [], sales: [], members: [], storeSettings: { storeName: "Shop" } };
describe("currency backup compatibility", () => {
  beforeEach(() => { vi.resetModules(); vi.clearAllMocks(); vi.stubEnv("DATABASE_URL", ""); mocks.owner.mockResolvedValue({ role: "OWNER" }); });
  afterEach(() => vi.unstubAllEnvs());
  it("exports version 2 with untouched rate, satang and cash-ledger snapshots", async () => {
    mocks.read.mockResolvedValue({ ...legacy, sales: [{ tenderCurrency: "THB", tenderAmountMinor: 12350, exchangeRate: 6500000 }],
      cashMovements: [{ currency: "THB", amount: 12350, source: "THB_SALE" }] });
    const { GET } = await import("./route");
    const result = await (await GET()).json();
    expect(result.version).toBe(2);
    expect(result.data.sales[0]).toEqual({ tenderCurrency: "THB", tenderAmountMinor: 12350, exchangeRate: 6500000 });
    expect(result.data.cashMovements[0].amount).toBe(12350);
  });
  it("accepts version 1 without inventing a rate or missing collections", async () => {
    const { POST } = await import("./route");
    const response = await POST(new Request("http://localhost/api/backup", { method: "POST", body: JSON.stringify({ version: 1, data: legacy }) }));
    expect(response.status).toBe(200);
    const restored = mocks.update.mock.calls[0][0]();
    expect(restored.storeSettings).toMatchObject({ thbEnabled: false, thbPaymentRate: 0 });
    expect(restored.cashMovements).toEqual([]); expect(restored.purchaseOrders).toEqual([]);
  });
  it("preserves version 2 monetary units on restore and rejects unknown versions", async () => {
    const { POST } = await import("./route");
    const data = { ...legacy, cashShifts: [{ openingThb: 12350 }], storeSettings: { ...legacy.storeSettings, thbEnabled: true, thbPaymentRate: 6500000 } };
    expect((await POST(new Request("http://localhost/api/backup", { method: "POST", body: JSON.stringify({ version: 2, data }) }))).status).toBe(200);
    expect(mocks.update.mock.calls[0][0]().cashShifts[0].openingThb).toBe(12350);
    expect((await POST(new Request("http://localhost/api/backup", { method: "POST", body: JSON.stringify({ version: 99, data }) }))).status).toBe(400);
    expect(mocks.update).toHaveBeenCalledTimes(1);
  });
  it("requires owner authentication before reading or restoring", async () => {
    mocks.owner.mockRejectedValue(new Error("Forbidden"));
    const { GET, POST } = await import("./route");
    await expect(GET()).rejects.toThrow("Forbidden");
    await expect(POST(new Request("http://localhost/api/backup", { method: "POST", body: "{}" }))).rejects.toThrow("Forbidden");
    expect(mocks.read).not.toHaveBeenCalled(); expect(mocks.update).not.toHaveBeenCalled();
  });
});
