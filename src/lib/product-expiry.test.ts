import { describe, expect, it } from "vitest";
import { formatExpiryDate, getExpiryStatus, getProductExpiryAlerts, getShopDate, normalizeExpiryDateInput, parseExpiryDate } from "./product-expiry";
import type { Product, ProductVariant } from "../types";

describe("product expiry calendar rules", () => {
  it("uses the shop calendar day, even when the server is on UTC", () => {
    expect(getShopDate(new Date("2026-10-12T16:59:59Z"))).toBe("2026-10-12");
    expect(getShopDate(new Date("2026-10-12T17:00:00Z"))).toBe("2026-10-13");
  });

  it("distinguishes expired, today, 30-day warning and later dates", () => {
    const today = "2026-10-13";
    expect(getExpiryStatus("2026-10-12", today)).toMatchObject({ status: "EXPIRED", daysRemaining: -1 });
    expect(getExpiryStatus("2026-10-13", today)).toMatchObject({ status: "TODAY", daysRemaining: 0 });
    expect(getExpiryStatus("2026-11-12", today)).toMatchObject({ status: "SOON", daysRemaining: 30 });
    expect(getExpiryStatus("2026-11-13", today)).toMatchObject({ status: "OK", daysRemaining: 31 });
  });

  it("allows an empty date and validates real calendar dates including leap years", () => {
    expect(parseExpiryDate("")).toBeNull();
    expect(parseExpiryDate(undefined)).toBeNull();
    expect(getExpiryStatus(null)).toBeNull();
    expect(parseExpiryDate("2028-02-29")).toBe("2028-02-29");
    for (const value of ["2026-02-29", "2026-04-31", "2026-13-01", "2026-1-3", "not-a-date", "0000-01-01"]) {
      expect(() => parseExpiryDate(value)).toThrow();
      expect(getExpiryStatus(value)).toBeNull();
    }
  });

  it("normalizes typed day-first dates and eight digits without swapping day and month", () => {
    for (const value of ["31/12/2026", "31122026", "31-12-2026", "2026-12-31", " 31/12/2026 "]) {
      expect(normalizeExpiryDateInput(value)).toBe("2026-12-31");
      expect(parseExpiryDate(value)).toBe("2026-12-31");
      expect(formatExpiryDate(parseExpiryDate(value)!)).toBe("31/12/2026");
    }
    expect(parseExpiryDate("3/4/2026")).toBe("2026-04-03");
    expect(parseExpiryDate("03042026")).toBe("2026-04-03");
    expect(parseExpiryDate("29/02/2028")).toBe("2028-02-29");
  });

  it("rejects impossible, incomplete and ambiguous typed dates instead of clearing them", () => {
    for (const value of ["31/02/2026", "29/02/2026", "31042026", "12/31/2026", "00/01/2026", "01/00/2026", "01/01/0000", "31/12/26", "31/12/", "3112202", "31/12-2026", "abc"]) {
      expect(normalizeExpiryDateInput(value)).toBeNull();
      expect(() => parseExpiryDate(value)).toThrow();
    }
  });

  it("keeps a cleared optional field distinct from an invalid date", () => {
    expect(normalizeExpiryDateInput("")).toBe("");
    expect(normalizeExpiryDateInput("  ")).toBe("");
    expect(parseExpiryDate("  ")).toBeNull();
    expect(() => parseExpiryDate(new File(["2026-01-01"], "date.txt"))).toThrow();
  });

  it("sorts remaining stock by urgency, including inactive stock and excluding sold-out/undated stock", () => {
    const base: ProductVariant = { id: "base", name: "10ml", sku: "SKU", costPrice: 10, sellPrice: 20, stock: 4, lowStockAlert: 1 };
    const product: Product = {
      id: "product", name: "Perfume", sku: "SKU", category: "Perfume", costPrice: 10, sellPrice: 20,
      stock: 20, lowStockAlert: 1, isActive: false, createdAt: new Date(), updatedAt: new Date(),
      variants: [
        { ...base, id: "soon", expiryDate: "2026-11-01" },
        { ...base, id: "empty", stock: 0, expiryDate: "2026-01-01" },
        { ...base, id: "expired", expiryDate: "2026-10-01" },
        { ...base, id: "undated" },
        { ...base, id: "future", expiryDate: "2027-01-01" },
        { ...base, id: "today", expiryDate: "2026-10-13" }
      ]
    };
    expect(getProductExpiryAlerts([product], "2026-10-13").map(({ variant }) => variant.id))
      .toEqual(["expired", "today", "soon"]);
    expect(getProductExpiryAlerts([{ ...product, variants: undefined }])).toEqual([]);
  });
});
