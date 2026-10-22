import { describe, expect, it } from "vitest";
import { expectedDrawerCash, movementBalance, resolveThbTender, thbRefundMovement, thbSaleMovements } from "./cash-currency";
import type { CashShift, Sale } from "@/types";

const user = { id: "staff", name: "Staff" };
const shift = { id: "shift", cashierId: user.id, status: "OPEN", openingCash: 100000, openingThb: 10000 } as CashShift;
const sale = { id: "sale", shiftId: shift.id, paymentMethod: "CASH", tenderCurrency: "THB", tenderAmountMinor: 50000,
  exchangeRate: 6500000, netAmount: 300000, receivedAmount: 325000, changeAmount: 25000, status: "ACTIVE", createdAt: new Date() } as Sale;
const tender = { method: "CASH", satang: 50000, rate: 6500000, expectedRate: 6500000, enabled: true, hasShift: true };

describe("separate physical cash drawers", () => {
  it("checks the server rate and snapshots only an approved cash tender", () => {
    expect(resolveThbTender(tender)).toMatchObject({ receivedAmount: 325000, tenderAmountMinor: 50000 });
    for (const patch of [{ enabled: false }, { hasShift: false }, { expectedRate: 6400000 }, { method: "SPLIT" }, { satang: 1.2 }]) {
      expect(() => resolveThbTender({ ...tender, ...patch })).toThrow();
    }
  });
  it("counts actual baht and subtracts kip change, not equivalent revenue", () => {
    const movements = thbSaleMovements(sale, user);
    expect(expectedDrawerCash(shift, [sale], movements)).toEqual({ lak: 75000, thb: 60000 });
    expect(movementBalance(movements, "THB")).toBe(50000);
  });
  it("keeps received baht after a refund and pays the original kip amount in the refund shift", () => {
    const otherShift = { ...shift, id: "later-shift", openingCash: 400000, openingThb: 0 };
    const refund = thbRefundMovement(sale, 300000, otherShift, user, new Date());
    expect(expectedDrawerCash(otherShift, [], refund)).toEqual({ lak: 100000, thb: 0 });
    expect(expectedDrawerCash(shift, [{ ...sale, status: "RETURNED" }], thbSaleMovements(sale, user))).toEqual({ lak: 75000, thb: 60000 });
    expect(() => thbRefundMovement(sale, 300000, null, user, new Date())).toThrow();
  });
  it("treats older records as kip and keeps manual currency movements separate", () => {
    const legacy = { ...sale, tenderCurrency: undefined, netAmount: 1000, refundAmount: 100 };
    const movements = thbSaleMovements(sale, user);
    expect(expectedDrawerCash(shift, [sale, legacy], movements)).toEqual({ lak: 75900, thb: 60000 });
    expect(thbSaleMovements(legacy, user)).toEqual([]);
  });
});
