import { describe, expect, it } from "vitest";
import { getPricingKey, getPromotionDiscount, parseLaoDateTime, promotionPrice, promotionStatus, resolvePromotionPrice, toLaoDateTimeInput, validatePromotion } from "./promotions";
import { calculateSaleRefund } from "./sales";
import type { Product, Promotion, PromotionInput, Sale } from "@/types";

const now = new Date("2026-10-14T03:00:00Z").getTime();
const product: Product = { id: "p1", name: "Perfume", sku: "P", category: "Perfume", costPrice: 100000,
  sellPrice: 250000, stock: 10, lowStockAlert: 1, isActive: true, createdAt: new Date(now), updatedAt: new Date(now) };
const promotion: Promotion = { id: "promo1", name: "ປີໃໝ່", kind: "FIXED_PRICE", value: 200000,
  targets: [{ productId: "p1", variantId: "default" }], startsAt: "2026-10-14T03:00:00Z", endsAt: "2026-10-14T05:00:00Z",
  isActive: true, createdAt: new Date(now), updatedAt: new Date(now) };
const input: PromotionInput = { ...promotion, startsAt: "2026-10-14T10:00", endsAt: "2026-10-14T12:00" };

describe("promotion rules", () => {
  it("parses Lao wall-clock time independently of the machine timezone", () => {
    expect(parseLaoDateTime("2026-10-14T00:00")?.toISOString()).toBe("2026-10-13T17:00:00.000Z");
    expect(toLaoDateTimeInput("2026-10-13T17:30:00Z")).toBe("2026-10-14T00:30");
    for (const value of ["2026-02-30T10:00", "2026-10-14T24:30", "bad", "2026-10-14T10:00Z", "2026-13-01T10:00"]) expect(parseLaoDateTime(value)).toBeNull();
    expect(parseLaoDateTime("2028-02-29T10:00")).not.toBeNull();
  });
  it("includes the start instant and excludes the end instant", () => {
    expect(promotionStatus(promotion, now - 1)).toBe("SCHEDULED");
    expect(promotionStatus(promotion, now)).toBe("ACTIVE");
    expect(promotionStatus(promotion, now + 7200000)).toBe("EXPIRED");
    expect(promotionStatus({ ...promotion, isActive: false }, now)).toBe("PAUSED");
  });
  it("only discounts the selected product and size", () => {
    expect(resolvePromotionPrice("p1", "default", 250000, [promotion], now).price).toBe(200000);
    expect(resolvePromotionPrice("p1", "100ml", 250000, [promotion], now).price).toBe(250000);
    expect(resolvePromotionPrice("p2", "default", 250000, [promotion], now).price).toBe(250000);
    for (const time of [now - 1, now + 7200000]) expect(resolvePromotionPrice("p1", "default", 250000, [promotion], time).promotionId).toBeNull();
  });
  it("selects the lowest overlapping offer without stacking, with a stable tie break", () => {
    const percent: Promotion = { ...promotion, id: "promo0", kind: "PERCENT", value: 20 };
    for (const rules of [[promotion, percent], [percent, promotion]]) {
      expect(resolvePromotionPrice("p1", "default", 250000, rules, now)).toMatchObject({ price: 200000, promotionId: "promo0" });
    }
    expect(resolvePromotionPrice("p1", "default", 250000, [promotion, { ...percent, value: 30 }], now).price).toBe(175000);
    expect(resolvePromotionPrice("p1", "default", 150000, [promotion], now)).toMatchObject({ price: 150000, promotionId: null });
  });
  it("rounds per-unit percent discounts to whole kip and supports a free promotion", () => {
    expect(promotionPrice(999, "PERCENT", 10)).toBe(899);
    expect(promotionPrice(250000, "PERCENT", 100)).toBe(0);
    expect(promotionPrice(250000, "FIXED_PRICE", 0)).toBe(0);
  });
  it("validates values, targets and date ranges before saving", () => {
    expect(validatePromotion(input, [product])).toBeNull();
    for (const invalid of [
      { name: " " }, { value: NaN }, { value: -1 }, { value: 1.5 }, { value: 250000 },
      { kind: "PERCENT" as const, value: 101 }, { kind: "PERCENT" as const, value: 0 },
      { targets: [] }, { targets: [...input.targets, ...input.targets] },
      { targets: [{ productId: "p1", variantId: "missing" }] },
      { endsAt: input.startsAt }, { startsAt: "2026-02-30T10:00" }
    ]) expect(validatePromotion({ ...input, ...invalid }, [product])).not.toBeNull();
    expect(validatePromotion(input, [{ ...product, isActive: false }])).not.toBeNull();
  });
  it("fingerprints quantity and server price snapshots independently of cart order", () => {
    const a = { productId: "p1", variantId: "default", quantity: 2, ...resolvePromotionPrice("p1", "default", 250000, [promotion], now) };
    const b = { productId: "p2", quantity: 1, price: 50000 };
    expect(getPricingKey([a, b])).toBe(getPricingKey([b, a]));
    expect(getPricingKey([a])).not.toBe(getPricingKey([{ ...a, price: 199999 }]));
    expect(getPricingKey([a])).not.toBe(getPricingKey([{ ...a, quantity: 3 }]));
    expect(getPromotionDiscount([a, b])).toBe(100000);
  });
  it("refunds the actual promotional price, leaving non-promotional items at full price", () => {
    const perfume = { productId: "p1", name: "Perfume", sku: "P", price: 200000, originalPrice: 250000, cost: 100000, quantity: 2 };
    const soap = { productId: "p2", name: "Soap", sku: "S", price: 50000, cost: 20000, quantity: 1 };
    const sale = { items: [perfume, soap], totalAmount: 550000, discount: 100000, netAmount: 450000 } as Sale;
    expect(calculateSaleRefund(sale, [{ ...perfume, quantity: 1 }])).toBe(200000);
    expect(calculateSaleRefund(sale, [soap])).toBe(50000);
    expect(calculateSaleRefund(sale, [perfume, soap])).toBe(450000);
    expect(calculateSaleRefund({ ...sale, refundAmount: 400000 }, [soap])).toBe(50000);
    const legacy = { ...sale, items: [{ ...soap, quantity: 2 }], totalAmount: 100000, discount: 10000, netAmount: 90000 };
    expect(calculateSaleRefund(legacy, [soap])).toBe(45000);
  });
});
