import { describe, expect, it } from "vitest";
import { averageCost, formatThb, lakToThbDue, parseDecimal, parsePurchaseCost, thbToLak } from "./currency";

describe("integer money and historical purchase rates", () => {
  it("preserves satang, four-decimal rates and rounds converted kip once", () => {
    expect(parseDecimal("125.50", 2)).toBe(12550);
    expect(parseDecimal("650.1234", 4)).toBe(6501234);
    expect(thbToLak(20050, 6500000)).toBe(130325);
    expect(thbToLak(1, 6500000)).toBe(7);
    expect(formatThb(12550)).toBe("฿125.50");
    expect(parsePurchaseCost("THB", "200", "650")).toEqual({ costPrice: 130000, purchaseCurrency: "THB", purchaseAmountMinor: 20000, purchaseRate: 6500000 });
    expect(parsePurchaseCost(undefined, 130000, undefined)).toEqual({ costPrice: 130000, purchaseCurrency: "LAK", purchaseAmountMinor: 130000, purchaseRate: null });
  });
  it.each(["", "-1", "Infinity", "NaN", "1e3", "1,000", "1.001", "9999999999999999999"])("rejects ambiguous/invalid baht %s", value => {
    expect(() => parseDecimal(value, 2)).toThrow();
  });
  it("rejects zero rates, unknown currency and overflow", () => {
    expect(() => thbToLak(100, 0)).toThrow();
    expect(() => thbToLak(2147483647, 6500000)).toThrow();
    expect(() => parsePurchaseCost("USD", 100, 1)).toThrow();
  });
  it("rounds the baht amount due up to a satang", () => {
    expect(lakToThbDue(200000, 6500000)).toBe(30770);
    expect(thbToLak(lakToThbDue(200000, 6500000), 6500000)).toBeGreaterThanOrEqual(200000);
  });
  it("weights remaining units, not the number of purchases, and handles zero cost", () => {
    expect(averageCost(10, 100000, 5, 130000)).toBe(110000);
    expect(averageCost(0, 900000, 5, 130000)).toBe(130000);
    expect(averageCost(5, 100000, 5, 0)).toBe(50000);
    expect(averageCost(5, 100000, 0, 0)).toBe(100000);
    expect(() => averageCost(-1, 0, 1, 2)).toThrow();
  });
});
