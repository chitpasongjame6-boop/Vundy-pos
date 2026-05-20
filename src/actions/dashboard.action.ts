"use server";

import { getOrders } from "@/actions/order.action";
import { getDailyClosing, getSales } from "@/actions/pos.action";
import { getProducts } from "@/actions/product.action";
import { getProductSummary } from "@/lib/utils";
import type {
  DashboardChannel,
  DashboardRecentItem,
  DashboardStats,
  Order,
  Sale,
  SalesBreakdown,
  TopProduct
} from "@/types";

const shippedRevenueStatuses = new Set(["SHIPPED"]);
const excludedStatuses = new Set(["CANCELLED", "RETURNED"]);

function isSameDay(date: Date, target: Date) {
  return (
    date.getFullYear() === target.getFullYear() &&
    date.getMonth() === target.getMonth() &&
    date.getDate() === target.getDate()
  );
}

function isSameMonth(date: Date, target: Date) {
  return (
    date.getFullYear() === target.getFullYear() &&
    date.getMonth() === target.getMonth()
  );
}

function buildDailyChart(orders: Order[], sales: Sale[]) {
  const today = new Date();

  return Array.from({ length: 7 }, (_, index) => {
    const day = new Date(
      today.getFullYear(),
      today.getMonth(),
      today.getDate() - (6 - index)
    );
    const shippedOrders = orders.filter(
      (order) =>
        shippedRevenueStatuses.has(order.status) && isSameDay(order.createdAt, day)
    );
    const daySales = sales.filter((sale) => isSameDay(sale.createdAt, day));

    return {
      date: new Intl.DateTimeFormat("lo-LA", {
        month: "short",
        day: "numeric"
      }).format(day),
      sales:
        shippedOrders.reduce((sum, order) => sum + order.totalAmount, 0) +
        daySales.reduce((sum, sale) => sum + sale.netAmount, 0),
      profit:
        shippedOrders.reduce((sum, order) => sum + order.profit, 0) +
        daySales.reduce((sum, sale) => sum + sale.profit, 0)
    };
  });
}

function buildTopProducts(orders: Order[], sales: Sale[]) {
  const productMap = new Map<string, TopProduct>();

  const soldItems = [
    ...orders
      .filter((order) => shippedRevenueStatuses.has(order.status))
      .flatMap((order) => order.items),
    ...sales.flatMap((sale) => sale.items)
  ];

  soldItems.forEach((item) => {
    const current = productMap.get(item.productId) ?? {
      productId: item.productId,
      name: item.name,
      quantity: 0,
      totalAmount: 0
    };

    productMap.set(item.productId, {
      ...current,
      quantity: current.quantity + item.quantity,
      totalAmount: current.totalAmount + item.price * item.quantity
    });
  });

  return [...productMap.values()]
    .sort((a, b) => b.quantity - a.quantity)
    .slice(0, 5);
}

function buildSalesBreakdown(orders: Order[], sales: Sale[]): SalesBreakdown {
  const onlineSales = orders.reduce((sum, order) => sum + order.totalAmount, 0);
  const onlineProfit = orders.reduce((sum, order) => sum + order.profit, 0);
  const posSales = sales.reduce((sum, sale) => sum + sale.netAmount, 0);
  const posProfit = sales.reduce((sum, sale) => sum + sale.profit, 0);

  return {
    onlineSales,
    onlineProfit,
    posSales,
    posProfit,
    totalSales: onlineSales + posSales,
    totalProfit: onlineProfit + posProfit
  };
}

function parseDashboardChannel(value?: string): DashboardChannel {
  return value === "ONLINE" || value === "POS" ? value : "ALL";
}

function filterOrdersByChannel(orders: Order[], channel: DashboardChannel) {
  return channel === "POS" ? [] : orders;
}

function filterSalesByChannel(sales: Sale[], channel: DashboardChannel) {
  return channel === "ONLINE" ? [] : sales;
}

function buildRecentActivity(
  orders: Order[],
  sales: Sale[],
  channel: DashboardChannel
): DashboardRecentItem[] {
  const orderItems: DashboardRecentItem[] =
    channel === "POS"
      ? []
      : orders.map((order) => ({
          id: order.id,
          type: "ONLINE",
          title: order.customerName,
          description: order.shippingCompany,
          amount: order.totalAmount,
          status: order.status,
          createdAt: order.createdAt
        }));
  const saleItems: DashboardRecentItem[] =
    channel === "ONLINE"
      ? []
      : sales.map((sale) => ({
          id: sale.id,
          type: "POS",
          title: "ຂາຍໜ້າຮ້ານ",
          description: `${sale.items.length} ລາຍການ`,
          amount: sale.netAmount,
          createdAt: sale.createdAt
        }));

  return [...orderItems, ...saleItems]
    .sort((a, b) => b.createdAt.getTime() - a.createdAt.getTime())
    .slice(0, 5);
}

export async function getDashboardStats(
  channelValue?: string
): Promise<DashboardStats> {
  const [orders, sales, products] = await Promise.all([
    getOrders(),
    getSales(),
    getProducts()
  ]);
  const todayClosing = await getDailyClosing();
  const channel = parseDashboardChannel(channelValue);
  const channelOrders = filterOrdersByChannel(orders, channel);
  const channelSales = filterSalesByChannel(sales, channel);
  const now = new Date();
  const shippedOrders = channelOrders.filter((order) =>
    shippedRevenueStatuses.has(order.status)
  );
  const todayShippedOrders = shippedOrders.filter((order) =>
    isSameDay(order.createdAt, now)
  );
  const monthShippedOrders = shippedOrders.filter((order) =>
    isSameMonth(order.createdAt, now)
  );
  const todaySales = channelSales.filter((sale) => isSameDay(sale.createdAt, now));
  const monthSales = channelSales.filter((sale) => isSameMonth(sale.createdAt, now));
  const todayBreakdown = buildSalesBreakdown(todayShippedOrders, todaySales);
  const monthBreakdown = buildSalesBreakdown(monthShippedOrders, monthSales);

  const activeProducts = products.filter((product) => product.isActive);
  const stockVariants = activeProducts.flatMap((product) =>
    getProductSummary(product).variants
  );

  return {
    channel,
    todaySales: todayBreakdown.totalSales,
    todayProfit: todayBreakdown.totalProfit,
    todayOrders:
      channelOrders.filter(
        (order) =>
          isSameDay(order.createdAt, now) && !excludedStatuses.has(order.status)
      ).length + todaySales.length,
    monthSales: monthBreakdown.totalSales,
    monthProfit: monthBreakdown.totalProfit,
    todayBreakdown,
    monthBreakdown,
    dailyChart: buildDailyChart(channelOrders, channelSales),
    lowStockProducts: products.filter(
      (product) => getProductSummary(product).lowStock && product.isActive
    ),
    topProducts: buildTopProducts(channelOrders, channelSales),
    recentOrders: channelOrders.slice(0, 5),
    recentSales: channelSales.slice(0, 5),
    recentActivity: buildRecentActivity(channelOrders, channelSales, channel),
    tasks: {
      pendingPackOrders: orders.filter((order) => order.status === "PENDING_PACK").length,
      codToShipOrders: orders.filter(
        (order) =>
          order.paymentStatus === "COD" &&
          order.status !== "SHIPPED" &&
          !excludedStatuses.has(order.status)
      ).length,
      outOfStockVariants: stockVariants.filter((variant) => variant.stock <= 0).length,
      lowStockVariants: stockVariants.filter(
        (variant) => variant.stock > 0 && variant.stock <= variant.lowStockAlert
      ).length,
      todayClosingDone: Boolean(todayClosing.closing)
    }
  };
}
