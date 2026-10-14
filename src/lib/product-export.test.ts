import { describe, expect, it } from "vitest";
import type { Product } from "@/types";
import { buildProductPriceCsv, PRODUCT_EXPORT_HEADERS } from "./product-export";
import { DEFAULT_VARIANT_NAME } from "./utils";

const product: Product = {
  id: "product", name: "ນ້ຳຫອມ", sku: "00123", category: "Perfume",
  costPrice: 100000, sellPrice: 150000, stock: 10, lowStockAlert: 2,
  isActive: true, createdAt: new Date(), updatedAt: new Date()
};

describe("five-column product price CSV", () => {
  it("has only the requested five columns in order and supports legacy products", () => {
    const csv = buildProductPriceCsv([product]);
    const lines = csv.slice(1).trimEnd().split("\r\n");
    expect(lines[0]).toBe(PRODUCT_EXPORT_HEADERS.join(","));
    expect(lines[0].split(",")).toHaveLength(5);
    expect(lines[1]).toBe("ນ້ຳຫອມ,00123,100000,150000,50000");
    expect(csv).not.toContain("category");
    expect(csv).not.toContain("stock");
    expect(csv.charCodeAt(0)).toBe(0xfeff);
  });

  it("exports one row per SKU, including inactive and zero-stock variants", () => {
    const csv = buildProductPriceCsv([{
      ...product, isActive: false,
      variants: [
        { id: "small", name: "10ml", sku: "P-10", costPrice: 50, sellPrice: 90, stock: 0, lowStockAlert: 2 },
        { id: "large", name: "20ml", sku: "P-20", costPrice: 100, sellPrice: 180, stock: 5, lowStockAlert: 2 }
      ]
    }]);
    expect(csv).toContain("ນ້ຳຫອມ - 10ml,P-10,50,90,40\r\n");
    expect(csv).toContain("ນ້ຳຫອມ - 20ml,P-20,100,180,80\r\n");
    expect(csv.trimEnd().split("\r\n")).toHaveLength(3);
  });

  it("does not append the standard variant name", () => {
    expect(buildProductPriceCsv([{
      ...product,
      variants: [{ id: "standard", name: DEFAULT_VARIANT_NAME, sku: "P", costPrice: 1, sellPrice: 2, stock: 1, lowStockAlert: 0 }]
    }])).toContain("ນ້ຳຫອມ,P,1,2,1\r\n");
  });

  it("keeps negative and decimal unit profits numeric, without multiplying by stock", () => {
    expect(buildProductPriceCsv([{ ...product, costPrice: 200, sellPrice: 150, stock: 999 }]))
      .toContain(",200,150,-50\r\n");
    expect(buildProductPriceCsv([{ ...product, costPrice: 0.1, sellPrice: 0.3 }]))
      .toContain(",0.1,0.3,0.2\r\n");
  });

  it("escapes commas, quotes and line breaks without damaging Lao/Thai names", () => {
    const csv = buildProductPriceCsv([{ ...product, name: 'น้ำหอม, "ຫອມ"\nใหม่', sku: 'SKU,"1"' }]);
    expect(csv).toContain('"น้ำหอม, ""ຫອມ""\nใหม่","SKU,""1""",100000,150000,50000\r\n');
  });

  it("neutralizes formula-like names and SKUs", () => {
    for (const text of ["=1+1", "+SUM(A1)", "-1+1", "@SUM(A1)", "  =1+1", "\t=1+1", "\r=1+1"]) {
      const csv = buildProductPriceCsv([{ ...product, name: text, sku: text }]);
      expect(csv).toContain(`'${text}`);
    }
  });

  it("still includes all five headers when the catalogue is empty", () => {
    expect(buildProductPriceCsv([])).toBe(`\uFEFF${PRODUCT_EXPORT_HEADERS.join(",")}\r\n`);
  });
});
