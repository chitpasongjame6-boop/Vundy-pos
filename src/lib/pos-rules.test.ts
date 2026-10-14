import { describe, expect, it } from "vitest";
import {
  calculateInclusiveTax,
  validatePosDiscountPermission,
  validatePosPayment
} from "./pos-rules";

describe("POS payment rules", () => {
  it("rejects cash below the net amount", () => {
    expect(validatePosPayment({
      method: "CASH", netAmount: 100_000, receivedAmount: 90_000, payments: []
    })).toBeTruthy();
  });

  it("accepts sufficient cash and exact split payments", () => {
    expect(validatePosPayment({
      method: "CASH", netAmount: 100_000, receivedAmount: 100_000, payments: []
    })).toBeNull();
    expect(validatePosPayment({
      method: "SPLIT", netAmount: 100_000, receivedAmount: 0,
      payments: [
        { method: "CASH", amount: 40_000 },
        { method: "TRANSFER", amount: 60_000 }
      ]
    })).toBeNull();
  });

  it("rejects split payments with a mismatched total", () => {
    expect(validatePosPayment({
      method: "SPLIT", netAmount: 100_000, receivedAmount: 0,
      payments: [{ method: "CASH", amount: 99_000 }]
    })).toBeTruthy();
  });
});

describe("POS approval and tax rules", () => {
  it("allows discounts only for the owner", () => {
    expect(validatePosDiscountPermission({ role: "STAFF", discount: 1 })).toBeTruthy();
    expect(validatePosDiscountPermission({ role: "STAFF", discount: 0 })).toBeNull();
    expect(validatePosDiscountPermission({ role: "OWNER", discount: 99_000 })).toBeNull();
  });

  it("calculates the tax component of a tax-inclusive amount", () => {
    expect(calculateInclusiveTax(110_000, 10)).toBe(10_000);
  });
});
