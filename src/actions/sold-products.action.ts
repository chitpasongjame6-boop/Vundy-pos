"use server";

import { getOrders } from "@/actions/order.action";
import { getSales } from "@/actions/pos.action";
import type {
  DashboardChannel,
  OrderItem,
  SaleItem,
  SoldProductSummary
} from "@/types";

type SoldProductsFilters = {
  channel?: string;
  search?: string;
  date?: string;
};

type SoldItemSource = {
  item: OrderItem | SaleItem;
  soldAt: Date;
};

export async function getSoldProducts(
  filters?: SoldProductsFilters
): Promise<{
  channel: DashboardChannel;
  items: SoldProductSummary[];
  totalQuantity: number;
  totalAmount: number;
  totalProfit: number;
}> {
  const channel = parseChannel(filters?.channel);
  const search = filters?.search?.trim().toLowerCase();
  const dateRange = getDateRange(filters?.date);
  const [orders, sales] = await Promise.all([getOrders(), getSales()]);
  const onlineItems: SoldItemSource[] =
    channel === "POS"
      ? []
      : orders
          .filter((order) => order.status === "SHIPPED")
          .flatMap((order) =>
            order.items.map((item) => ({
              item,
              soldAt: order.createdAt
            }))
          );
  const posItems: SoldItemSource[] =
    channel === "ONLINE"
      ? []
      : sales.flatMap((sale) =>
          sale.items.map((item) => ({
            item,
            soldAt: sale.createdAt
          }))
        );
  const items = [...onlineItems, ...posItems].filter(({ item, soldAt }) => {
    if (dateRange && (soldAt < dateRange.start || soldAt >= dateRange.end)) {
      return false;
    }

    if (!search) {
      return true;
    }

    return (
      item.name.toLowerCase().includes(search) ||
      item.sku.toLowerCase().includes(search) ||
      item.variantName?.toLowerCase().includes(search)
    );
  });
  const productMap = new Map<string, SoldProductSummary>();

  for (const { item, soldAt } of items) {
    const key = `${item.productId}::${item.variantId ?? item.sku}`;
    const current = productMap.get(key);
    const totalAmount = item.price * item.quantity;
    const totalCost = item.cost * item.quantity;

    productMap.set(key, {
      productId: item.productId,
      variantId: item.variantId,
      sku: item.sku,
      name: item.name,
      variantName: item.variantName,
      imageUrl: item.imageUrl,
      quantity: (current?.quantity ?? 0) + item.quantity,
      latestPrice:
        !current || soldAt.getTime() >= current.lastSoldAt.getTime()
          ? item.price
          : current.latestPrice,
      totalAmount: (current?.totalAmount ?? 0) + totalAmount,
      totalCost: (current?.totalCost ?? 0) + totalCost,
      profit: (current?.profit ?? 0) + totalAmount - totalCost,
      lastSoldAt:
        !current || soldAt.getTime() >= current.lastSoldAt.getTime()
          ? soldAt
          : current.lastSoldAt
    });
  }

  const soldProducts = [...productMap.values()].sort((a, b) => {
    if (b.quantity !== a.quantity) {
      return b.quantity - a.quantity;
    }

    return b.lastSoldAt.getTime() - a.lastSoldAt.getTime();
  });

  return {
    channel,
    items: soldProducts,
    totalQuantity: soldProducts.reduce((sum, item) => sum + item.quantity, 0),
    totalAmount: soldProducts.reduce((sum, item) => sum + item.totalAmount, 0),
    totalProfit: soldProducts.reduce((sum, item) => sum + item.profit, 0)
  };
}

function parseChannel(value?: string): DashboardChannel {
  return value === "ONLINE" || value === "POS" ? value : "ALL";
}

function getDateRange(value?: string) {
  if (!value) {
    return null;
  }

  const match = /^(\d{4})-(\d{2})-(\d{2})$/.exec(value);

  if (!match) {
    return null;
  }

  const [, year, month, day] = match;
  const start = new Date(Number(year), Number(month) - 1, Number(day), 0, 0, 0, 0);
  const end = new Date(start);
  end.setDate(start.getDate() + 1);

  return { start, end };
}
