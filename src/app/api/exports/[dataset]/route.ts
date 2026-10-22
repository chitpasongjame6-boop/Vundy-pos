import { getSales } from "@/actions/pos.action";
import { getProducts } from "@/actions/product.action";
import { getInventoryWorkspace } from "@/actions/inventory.action";
import { requireOwner } from "@/lib/auth";
import { getProductVariants } from "@/lib/utils";
import { RATE_SCALE } from "@/lib/currency";

export async function GET(
  _request: Request,
  context: { params: Promise<{ dataset: string }> }
) {
  await requireOwner();
  const { dataset } = await context.params;
  const rows = await buildRows(dataset);

  if (!rows) {
    return Response.json({ message: "Unknown dataset" }, { status: 404 });
  }

  const csv = toCsv(rows);
  const date = new Date().toISOString().slice(0, 10);

  return new Response(`\uFEFF${csv}`, {
    headers: {
      "content-type": "text/csv; charset=utf-8",
      "content-disposition": `attachment; filename="${dataset}-${date}.csv"`,
      "cache-control": "no-store"
    }
  });
}

async function buildRows(dataset: string): Promise<Array<Record<string, unknown>> | null> {
  if (dataset === "sales") {
    const sales = await getSales({ includeInactive: true });
    return sales.flatMap((sale) => sale.items.map((item) => ({
      saleNo: sale.saleNo ?? sale.id,
      date: new Date(sale.createdAt).toISOString(),
      status: sale.status ?? "ACTIVE",
      cashier: sale.cashierName ?? "",
      member: sale.memberName ?? "",
      sku: item.sku,
      product: item.name,
      variant: item.variantName ?? "",
      quantity: item.quantity,
      unitPrice: item.price,
      total: item.price * item.quantity,
      discount: sale.discount,
      netAmount: sale.netAmount,
      refundAmount: sale.refundAmount ?? 0,
      paymentMethod: sale.paymentMethod,
      tenderCurrency: sale.tenderCurrency ?? "LAK",
      receivedBaht: sale.tenderCurrency === "THB" ? (sale.tenderAmountMinor ?? 0) / 100 : "",
      kipPerBaht: sale.exchangeRate ? sale.exchangeRate / RATE_SCALE : "",
      receivedKipEquivalent: sale.receivedAmount ?? "",
      changeKip: sale.changeAmount ?? "",
      paymentReference: sale.paymentReference ?? "",
      taxAmount: sale.taxAmount ?? 0
    })));
  }

  if (dataset === "products") {
    const products = await getProducts();
    return products.flatMap((product) => getProductVariants(product).map((variant) => ({
      sku: variant.sku,
      product: product.name,
      variant: variant.name,
      category: product.category,
      unit: variant.unit ?? "",
      costPrice: variant.costPrice,
      purchaseCurrency: variant.purchaseCurrency ?? "LAK",
      purchaseUnitAmount: variant.purchaseCurrency === "THB" ? (variant.purchaseAmountMinor ?? 0) / 100 : variant.purchaseAmountMinor ?? variant.costPrice,
      purchaseKipPerBaht: variant.purchaseRate ? variant.purchaseRate / RATE_SCALE : "",
      sellPrice: variant.sellPrice,
      stock: variant.stock,
      lowStockAlert: variant.lowStockAlert,
      active: product.isActive,
      catalogSource: product.catalogSource?.sourceUrl ?? "",
      catalogBarcode: product.catalogSource?.barcode ?? "",
      catalogRetrievedAt: product.catalogSource?.retrievedAt ?? "",
      catalogDataLicense: product.catalogSource ? "ODbL 1.0 / Database Contents License" : "",
      catalogImageLicense: product.catalogSource?.imageImported ? "CC BY-SA 3.0; resized/converted to WebP" : ""
    })));
  }

  if (dataset === "stock-movements") {
    const data = await getInventoryWorkspace();
    return data.movements.map((movement) => ({
      date: new Date(movement.createdAt).toISOString(),
      sku: movement.sku,
      product: movement.productName,
      variant: movement.variantName ?? "",
      type: movement.type,
      quantity: movement.quantity,
      stockBefore: movement.stockBefore,
      stockAfter: movement.stockAfter,
      unitCostKip: movement.unitCost ?? "",
      purchaseCurrency: movement.purchaseCurrency ?? "",
      purchaseUnitAmount: movement.purchaseCurrency === "THB" ? (movement.purchaseAmountMinor ?? 0) / 100 : movement.purchaseAmountMinor ?? "",
      purchaseKipPerBaht: movement.purchaseRate ? movement.purchaseRate / RATE_SCALE : "",
      reference: movement.referenceNo ?? "",
      reason: movement.reason ?? "",
      user: movement.userName
    }));
  }

  return null;
}

function toCsv(rows: Array<Record<string, unknown>>) {
  if (!rows.length) return "";
  const headers = Object.keys(rows[0]);
  return [
    headers.map(escapeCsv).join(","),
    ...rows.map((row) => headers.map((header) => escapeCsv(row[header])).join(","))
  ].join("\r\n");
}

function escapeCsv(value: unknown) {
  let text = value == null ? "" : String(value);
  // Catalog/user text must not become an executable spreadsheet formula.
  if (typeof value === "string" && /^[\s\uFEFF]*[=+@\-\t\r\n]/.test(text)) text = `'${text}`;
  return /[",\r\n]/.test(text) ? `"${text.replaceAll('"', '""')}"` : text;
}
