import { clsx, type ClassValue } from "clsx";
import { twMerge } from "tailwind-merge";
import type { OrderItem, OrderStatus, Product, ProductVariant } from "@/types";

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

export function formatCurrency(value: number) {
  return `₭${formatNumber(value)}`;
}

export function formatDate(value: Date) {
  const date = new Date(value);
  const months = [
    "ມ.ກ.",
    "ກ.ພ.",
    "ມ.ນ.",
    "ມ.ສ.",
    "ພ.ພ.",
    "ມິ.ຖ.",
    "ກ.ລ.",
    "ສ.ຫ.",
    "ກ.ຍ.",
    "ຕ.ລ.",
    "ພ.ຈ.",
    "ທ.ວ."
  ];
  const day = date.getDate();
  const month = months[date.getMonth()];
  const year = date.getFullYear();
  const hours = String(date.getHours()).padStart(2, "0");
  const minutes = String(date.getMinutes()).padStart(2, "0");

  return `${day} ${month} ${year}, ${hours}:${minutes}`;
}

export function formatNumber(value: number) {
  const rounded = Math.round(value);
  return String(rounded).replace(/\B(?=(\d{3})+(?!\d))/g, ",");
}

export const DEFAULT_VARIANT_NAME = "\u0ea1\u0eb2\u0e94\u0e95\u0eb0\u0e96\u0eb2\u0e99";

export function isDefaultVariantName(value?: string | null) {
  return (value ?? "").trim() === DEFAULT_VARIANT_NAME;
}

export function formatProductVariantName(
  productName: string,
  variantName?: string | null
) {
  if (!variantName || isDefaultVariantName(variantName)) {
    return productName;
  }

  return `${productName} - ${variantName}`;
}

export const statusConfig: Record<
  OrderStatus,
  { label: string; className: string; tone: string }
> = {
  PENDING_PACK: {
    label: "ລໍຖ້າແພັກ",
    className: "border-amber-200 bg-amber-100 text-amber-800",
    tone: "ເຫຼືອງ"
  },
  PACKED: {
    label: "ແພັກແລ້ວ",
    className: "border-sky-200 bg-sky-100 text-sky-800",
    tone: "ຟ້າ"
  },
  SHIPPED: {
    label: "ສົ່ງແລ້ວ",
    className: "border-emerald-200 bg-emerald-100 text-emerald-800",
    tone: "ຂຽວ"
  },
  CANCELLED: {
    label: "ຍົກເລີກ",
    className: "border-zinc-200 bg-zinc-100 text-zinc-700",
    tone: "ເທົາ"
  },
  RETURNED: {
    label: "ຕີກັບ",
    className: "border-rose-200 bg-rose-100 text-rose-800",
    tone: "ແດງ"
  }
};

export function calculateOrderTotals(items: OrderItem[]) {
  return items.reduce(
    (totals, item) => {
      const totalAmount = item.price * item.quantity;
      const totalCost = item.cost * item.quantity;

      return {
        totalAmount: totals.totalAmount + totalAmount,
        totalCost: totals.totalCost + totalCost,
        profit: totals.profit + totalAmount - totalCost
      };
    },
    { totalAmount: 0, totalCost: 0, profit: 0 }
  );
}

export function getProductVariants(product: Product): ProductVariant[] {
  if (product.variants?.length) {
    return product.variants;
  }

  return [
    {
      id: "default",
      name: "ມາດຕະຖານ",
      sku: product.sku,
      unit: "pcs",
      costPrice: product.costPrice,
      sellPrice: product.sellPrice,
      stock: product.stock,
      lowStockAlert: product.lowStockAlert
    }
  ];
}

export function getProductSummary(product: Product) {
  const variants = getProductVariants(product);
  const prices = variants.map((variant) => variant.sellPrice);
  const stocks = variants.map((variant) => variant.stock);
  const totalStock = stocks.reduce((sum, stock) => sum + stock, 0);
  const minPrice = Math.min(...prices);
  const maxPrice = Math.max(...prices);
  const lowStock = variants.some(
    (variant) => variant.stock <= variant.lowStockAlert
  );

  return {
    variants,
    totalStock,
    minPrice,
    maxPrice,
    lowStock,
    variantCount: variants.length
  };
}

export function productToOrderItem(
  product: Product,
  quantity: number,
  variant = getProductVariants(product)[0]
): OrderItem {
  return {
    productId: product.id,
    variantId: variant.id,
    name: product.name,
    variantName: variant.name,
    category: product.category,
    sku: variant.sku,
    quantity,
    price: variant.sellPrice,
    cost: variant.costPrice,
    imageUrl: product.imageUrl
  };
}
