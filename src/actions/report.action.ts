"use server";

import { getOrders } from "@/actions/order.action";
import { getSales } from "@/actions/pos.action";
import { formatDateInput } from "@/lib/document-number";
import { formatProductVariantName } from "@/lib/utils";
import type { Order, Sale, SalePaymentMethod } from "@/types";

export type ReportPeriod = "DAY" | "MONTH";

export type DetailedReport = {
  period: ReportPeriod;
  date: string;
  rangeLabel: string;
  onlineSales: number;
  onlineProfit: number;
  posSales: number;
  posProfit: number;
  totalSales: number;
  totalProfit: number;
  cashAmount: number;
  transferAmount: number;
  otherAmount: number;
  codAmount: number;
  shippedOrders: number;
  posBills: number;
  returnedOrders: number;
  returnedSales: number;
  cancelledOrders: number;
  cancelledSales: number;
  topProducts: Array<{
    name: string;
    sku: string;
    quantity: number;
    amount: number;
  }>;
};

export async function getDetailedReport(input?: {
  period?: string;
  date?: string;
}): Promise<DetailedReport> {
  const period = input?.period === "MONTH" ? "MONTH" : "DAY";
  const date = normalizeDate(input?.date, period);
  const range = getReportRange(date, period);
  const [orders, sales] = await Promise.all([
    getOrders(),
    getSales({ includeInactive: true })
  ]);
  const rangeOrders = orders.filter((order) => inRange(order.createdAt, range));
  const rangeSales = sales.filter((sale) => inRange(sale.createdAt, range));
  const shippedOrders = rangeOrders.filter((order) => order.status === "SHIPPED");
  const activeSales = rangeSales.filter((sale) => !sale.status || sale.status === "ACTIVE");
  const payment = summarizePayments(activeSales);
  const codAmount = shippedOrders
    .filter((order) => order.paymentStatus === "COD")
    .reduce((sum, order) => sum + order.totalAmount, 0);
  const topProducts = buildTopProducts(shippedOrders, activeSales);
  const onlineSales = shippedOrders.reduce((sum, order) => sum + order.totalAmount, 0);
  const onlineProfit = shippedOrders.reduce((sum, order) => sum + order.profit, 0);
  const posSales = activeSales.reduce((sum, sale) => sum + sale.netAmount, 0);
  const posProfit = activeSales.reduce((sum, sale) => sum + sale.profit, 0);

  return {
    period,
    date,
    rangeLabel: period === "MONTH" ? date.slice(0, 7) : date,
    onlineSales,
    onlineProfit,
    posSales,
    posProfit,
    totalSales: onlineSales + posSales,
    totalProfit: onlineProfit + posProfit,
    cashAmount: payment.CASH,
    transferAmount: payment.TRANSFER,
    otherAmount: payment.OTHER,
    codAmount,
    shippedOrders: shippedOrders.length,
    posBills: activeSales.length,
    returnedOrders: rangeOrders.filter((order) => order.status === "RETURNED").length,
    returnedSales: rangeSales.filter((sale) => sale.status === "RETURNED").length,
    cancelledOrders: rangeOrders.filter((order) => order.status === "CANCELLED").length,
    cancelledSales: rangeSales.filter((sale) => sale.status === "CANCELLED").length,
    topProducts
  };
}

function normalizeDate(value: string | undefined, period: ReportPeriod) {
  if (period === "MONTH") {
    const match = /^(\d{4})-(\d{2})/.exec(value ?? "");
    const now = new Date();

    return match
      ? `${match[1]}-${match[2]}-01`
      : `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}-01`;
  }

  return /^\d{4}-\d{2}-\d{2}$/.test(value ?? "")
    ? (value as string)
    : formatDateInput(new Date());
}

function getReportRange(dateValue: string, period: ReportPeriod) {
  const [year, month, day] = dateValue.split("-").map(Number);
  const start = new Date(year, month - 1, period === "MONTH" ? 1 : day, 0, 0, 0, 0);
  const end =
    period === "MONTH"
      ? new Date(year, month, 1, 0, 0, 0, 0)
      : new Date(year, month - 1, day + 1, 0, 0, 0, 0);

  return { start, end };
}

function inRange(date: Date, range: { start: Date; end: Date }) {
  return date >= range.start && date < range.end;
}

function summarizePayments(sales: Sale[]) {
  return sales.reduce<Record<SalePaymentMethod, number>>(
    (summary, sale) => {
      summary[sale.paymentMethod] += sale.netAmount;
      return summary;
    },
    { CASH: 0, TRANSFER: 0, OTHER: 0 }
  );
}

function buildTopProducts(orders: Order[], sales: Sale[]) {
  const map = new Map<string, { name: string; sku: string; quantity: number; amount: number }>();

  [...orders.flatMap((order) => order.items), ...sales.flatMap((sale) => sale.items)].forEach(
    (item) => {
      const key = `${item.productId}-${item.variantId ?? item.sku}`;
      const current = map.get(key) ?? {
        name: formatProductVariantName(item.name, item.variantName),
        sku: item.sku,
        quantity: 0,
        amount: 0
      };

      map.set(key, {
        ...current,
        quantity: current.quantity + item.quantity,
        amount: current.amount + item.price * item.quantity
      });
    }
  );

  return [...map.values()]
    .sort((a, b) => b.quantity - a.quantity)
    .slice(0, 5);
}
