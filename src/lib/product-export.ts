import type { Product } from "@/types";
import { formatProductVariantName, getProductVariants } from "@/lib/utils";

export const PRODUCT_EXPORT_HEADERS = [
  "ຊື່ສິນຄ້າ",
  "ລະຫັດສິນຄ້າ",
  "ລາຄາຕົ້ນທຶນ (ກີບ)",
  "ລາຄາຂາຍ (ກີບ)",
  "ກຳໄລຕໍ່ໜ່ວຍ (ກີບ)"
] as const;

function escapeCsv(value: string | number) {
  let text = String(value);
  // User-entered names/SKUs must not execute as spreadsheet formulas.
  // Actual numbers, including a negative profit, remain numeric.
  if (typeof value === "string" && /^[\s\uFEFF]*[=+@\-\t\r\n]/.test(text)) {
    text = `'${text}`;
  }
  return /[",\r\n]/.test(text) ? `"${text.replaceAll('"', '""')}"` : text;
}

export function buildProductPriceCsv(products: Product[]) {
  const rows: Array<ReadonlyArray<string | number>> = [PRODUCT_EXPORT_HEADERS];
  for (const product of products) {
    for (const variant of getProductVariants(product)) {
      rows.push([
        formatProductVariantName(product.name, variant.name),
        variant.sku,
        variant.costPrice,
        variant.sellPrice,
        Number((variant.sellPrice - variant.costPrice).toFixed(2))
      ]);
    }
  }
  // BOM preserves Lao/Thai text when the CSV is opened in Excel.
  return `\uFEFF${rows.map((row) => row.map(escapeCsv).join(",")).join("\r\n")}\r\n`;
}
