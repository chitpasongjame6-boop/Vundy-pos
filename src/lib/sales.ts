import type { Sale, SaleReturnItem } from "@/types";

export function calculateSaleRefund(sale: Sale, items: SaleReturnItem[]) {
  const returned = items.reduce((sum, item) => sum + item.price * item.quantity, 0);
  // Item prices already include promotions. Only allocate any additional bill discount.
  const pricedTotal = sale.items.reduce((sum, item) => sum + item.price * item.quantity, 0);
  if (!pricedTotal) return 0;
  return Math.min(effectiveSaleAmount(sale), Math.max(0, Math.round(returned * sale.netAmount / pricedTotal)));
}

export function isRevenueSale(sale: Sale) {
  return !sale.status || sale.status === "ACTIVE" || sale.status === "PARTIALLY_RETURNED";
}

export function effectiveSaleAmount(sale: Sale) {
  return Math.max(0, sale.netAmount - (sale.refundAmount ?? 0));
}

export function effectiveSaleProfit(sale: Sale) {
  return sale.profit - (sale.refundAmount ?? 0) + (sale.returnedCost ?? 0);
}
