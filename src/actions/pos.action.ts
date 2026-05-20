"use server";

import { revalidatePath } from "next/cache";
import { prisma } from "@/lib/prisma";
import { readLocalStore, updateLocalStore } from "@/lib/local-store";
import { buildClosingNumber, buildReadableNumber, formatDateInput } from "@/lib/document-number";
import { getCurrentUser } from "@/lib/auth";
import { buildMemberSummaries } from "@/lib/members";
import { calculateOrderTotals, getProductVariants, productToOrderItem } from "@/lib/utils";
import type {
  DailyClosing,
  PosPaymentSummary,
  Product,
  Sale,
  SaleItem,
  SalePaymentMethod,
  SaleStatus
} from "@/types";

const hasDatabase = Boolean(process.env.DATABASE_URL);

type PosSaleInput = {
  items: Array<{
    productId: string;
    variantId: string;
    quantity: number;
  }>;
  discount?: number;
  paymentMethod?: SalePaymentMethod;
  receivedAmount?: number;
  memberId?: string;
};

type PosSaleResult = {
  ok: boolean;
  message: string;
  sale?: Sale;
};

type PosSaleHistoryFilters = {
  search?: string;
  paymentMethod?: SalePaymentMethod | "ALL" | string;
  date?: string;
};

type StoreSnapshot = Awaited<ReturnType<typeof readLocalStore>>;

export async function getSales(options?: { includeInactive?: boolean }): Promise<Sale[]> {
  if (!hasDatabase) {
    const store = await readLocalStore();
    const sales = store.sales ?? [];

    return options?.includeInactive ? sales : sales.filter(isActiveSale);
  }

  const sales = (await prisma.sale.findMany({
    orderBy: { createdAt: "desc" }
  })) as unknown as Sale[];

  return options?.includeInactive ? sales : sales.filter(isActiveSale);
}

export async function getTodayPosPaymentSummary(): Promise<PosPaymentSummary> {
  const sales = await getSales({ includeInactive: true });
  const now = new Date();
  const todaySales = sales.filter((sale) => isSameDay(sale.createdAt, now));

  return summarizeSales(todaySales);
}

export async function getPosSaleHistory(filters?: PosSaleHistoryFilters): Promise<{
  sales: Sale[];
  summary: PosPaymentSummary;
  paymentMethod: SalePaymentMethod | "ALL";
}> {
  const sales = await getSales();
  const search = filters?.search?.trim().toLowerCase();
  const paymentMethod = parsePaymentFilter(filters?.paymentMethod);
  const dateRange = getDateRange(filters?.date);
  const filteredSales = sales.filter((sale) => {
    const matchesPayment =
      paymentMethod === "ALL" ? true : sale.paymentMethod === paymentMethod;
    const matchesDate = dateRange
      ? sale.createdAt >= dateRange.start && sale.createdAt < dateRange.end
      : true;
    const matchesSearch = search
      ? sale.id.toLowerCase().includes(search) ||
        sale.saleNo?.toLowerCase().includes(search) ||
        sale.memberName?.toLowerCase().includes(search) ||
        sale.memberPhone?.toLowerCase().includes(search) ||
        sale.items.some(
          (item) =>
            item.name.toLowerCase().includes(search) ||
            item.sku.toLowerCase().includes(search) ||
            item.variantName?.toLowerCase().includes(search)
        )
      : true;

    return matchesPayment && matchesDate && matchesSearch;
  });

  return {
    sales: filteredSales,
    summary: summarizeSales(filteredSales),
    paymentMethod
  };
}

function summarizeSales(sales: Sale[]): PosPaymentSummary {
  return sales.filter(isActiveSale).reduce(
    (summary, sale) => {
      const amount = sale.netAmount;

      if (sale.paymentMethod === "TRANSFER") {
        summary.transferAmount += amount;
      } else if (sale.paymentMethod === "OTHER") {
        summary.otherAmount += amount;
      } else {
        summary.cashAmount += amount;
      }

      summary.totalAmount += amount;
      summary.billCount += 1;
      summary.profit += sale.profit;

      return summary;
    },
    {
      cashAmount: 0,
      transferAmount: 0,
      otherAmount: 0,
      totalAmount: 0,
      billCount: 0,
      profit: 0
    }
  );
}

export async function voidPosSale(formData: FormData): Promise<void> {
  const saleId = String(formData.get("saleId") ?? "");
  const status = parseSaleStatus(formData.get("status"));
  const reason = String(formData.get("reason") ?? "").trim() || null;
  const note = String(formData.get("note") ?? "").trim() || null;

  if (!saleId || !status) {
    return;
  }

  const now = new Date();

  if (!hasDatabase) {
    await updateLocalStore((store) => {
      const sale = store.sales.find((item) => item.id === saleId);

      if (!sale || !isActiveSale(sale)) {
        return store;
      }

      return {
        ...store,
        sales: store.sales.map((item) =>
          item.id === saleId
            ? {
                ...item,
                status,
                voidReason: reason,
                voidNote: note,
                voidedAt: now,
                restockedAt: now,
                updatedAt: now
              }
            : item
        ),
        products: restockProducts(store.products, sale.items, now)
      };
    });
    revalidatePosPaths();
    return;
  }

  const sale = (await prisma.sale.findUnique({
    where: { id: saleId }
  })) as unknown as Sale | null;

  if (!sale || !isActiveSale(sale)) {
    return;
  }

  for (const item of sale.items) {
    const product = (await prisma.product.findUnique({
      where: { id: item.productId }
    })) as unknown as Product | null;

    if (!product) {
      continue;
    }

    const variants = getProductVariants(product).map((variant) =>
      variant.id === item.variantId
        ? { ...variant, stock: variant.stock + item.quantity }
        : variant
    );

    await prisma.product.update({
      where: { id: product.id },
      data: {
        variants,
        stock: variants.reduce((sum, variant) => sum + variant.stock, 0)
      }
    });
  }

  await prisma.sale.update({
    where: { id: saleId },
    data: {
      status,
      voidReason: reason,
      voidNote: note,
      voidedAt: now,
      restockedAt: now
    }
  });

  revalidatePosPaths();
}

export async function getDailyClosing(dateValue?: string): Promise<{
  date: string;
  summary: PosPaymentSummary;
  closing: DailyClosing | null;
}> {
  const date = dateValue || formatDateInput(new Date());
  const dateRange = getDateRange(date);
  const sales = (await getSales()).filter((sale) =>
    dateRange ? sale.createdAt >= dateRange.start && sale.createdAt < dateRange.end : true
  );

  const store = await readLocalStore();

  return {
    date,
    summary: summarizeSales(sales),
    closing: store.dailyClosings.find((closing) => closing.date === date) ?? null
  };
}

export async function getDailyClosings(): Promise<DailyClosing[]> {
  const store = await readLocalStore();

  return [...(store.dailyClosings ?? [])].sort(
    (a, b) => b.closedAt.getTime() - a.closedAt.getTime()
  );
}

export async function closeDailySales(formData: FormData): Promise<void> {
  const date = String(formData.get("date") ?? "") || formatDateInput(new Date());
  const countedCash = Math.max(0, Math.round(Number(formData.get("countedCash") ?? 0)));
  const note = String(formData.get("note") ?? "").trim() || null;
  const { summary } = await getDailyClosing(date);
  const now = new Date();
  const closing: DailyClosing = {
    id: crypto.randomUUID(),
    closingNo: buildClosingNumber(new Date(`${date}T00:00:00`)),
    date,
    cashAmount: summary.cashAmount,
    transferAmount: summary.transferAmount,
    otherAmount: summary.otherAmount,
    totalAmount: summary.totalAmount,
    billCount: summary.billCount,
    profit: summary.profit,
    countedCash,
    cashDifference: countedCash - summary.cashAmount,
    note,
    closedAt: now,
    createdAt: now,
    updatedAt: now
  };

  await updateLocalStore((store) => ({
    ...store,
    dailyClosings: [
      closing,
      ...(store.dailyClosings ?? []).filter((item) => item.date !== date)
    ]
  }));

  revalidatePosPaths();
  revalidatePath("/pos/closing");
}

export async function createPosSale(input: PosSaleInput): Promise<PosSaleResult> {
  const requestedItems = mergeRequestedItems(input.items);
  const discount = Math.max(0, Math.round(Number(input.discount ?? 0)));
  const paymentMethod = parseSalePaymentMethod(input.paymentMethod);
  const receivedAmount = Math.max(0, Math.round(Number(input.receivedAmount ?? 0)));
  const currentUser = await getCurrentUser();

  if (!requestedItems.length) {
    return { ok: false, message: "ກະລຸນາສະແກນ ຫຼືເລືອກສິນຄ້າກ່ອນ" };
  }

  if (!hasDatabase) {
    const store = await readLocalStore();
    const memberSnapshot = buildMemberSnapshot(input.memberId, store);
    const build = buildSaleFromProducts(store.products, requestedItems, {
      discount,
      paymentMethod,
      receivedAmount
    });

    if (!build.ok) {
      return { ok: false, message: build.message };
    }

    const now = new Date();
    const sale: Sale = {
      id: crypto.randomUUID(),
      saleNo: buildReadableNumber("POS", now, storeSaleSequence(store.sales ?? [], now)),
      cashierId: currentUser?.id ?? null,
      cashierName: currentUser?.name ?? null,
      ...memberSnapshot,
      status: "ACTIVE",
      ...build.saleData,
      createdAt: now,
      updatedAt: now
    };

    await updateLocalStore((current) => ({
      ...current,
      sales: [sale, ...(current.sales ?? [])],
      products: applyStockChanges(current.products, requestedItems, now)
    }));

    revalidatePosPaths();

    return { ok: true, message: "ບັນທຶກການຂາຍສໍາເລັດ", sale };
  }

  const products = (await prisma.product.findMany({
    where: { isActive: true }
  })) as unknown as Product[];
  const memberStore = await readLocalStore();
  const memberSnapshot = buildMemberSnapshot(input.memberId, memberStore);
  const build = buildSaleFromProducts(products, requestedItems, {
    discount,
    paymentMethod,
    receivedAmount
  });

  if (!build.ok) {
    return { ok: false, message: build.message };
  }

  const now = new Date();
  const saleNo = buildReadableNumber(
    "POS",
    now,
    (await prisma.sale.count({
      where: {
        createdAt: {
          gte: new Date(now.getFullYear(), now.getMonth(), now.getDate(), 0, 0, 0, 0),
          lt: new Date(now.getFullYear(), now.getMonth(), now.getDate() + 1, 0, 0, 0, 0)
        }
      }
    })) + 1
  );

  const sale = (await prisma.sale.create({
    data: {
      saleNo,
      cashierId: currentUser?.id ?? null,
      cashierName: currentUser?.name ?? null,
      ...memberSnapshot,
      status: "ACTIVE",
      ...build.saleData
    }
  })) as unknown as Sale;

  for (const item of requestedItems) {
    const product = products.find((current) => current.id === item.productId);

    if (!product) {
      continue;
    }

    const variants = getProductVariants(product).map((variant) =>
      variant.id === item.variantId
        ? { ...variant, stock: variant.stock - item.quantity }
        : variant
    );

    await prisma.product.update({
      where: { id: product.id },
      data: {
        variants,
        stock: variants.reduce((sum, variant) => sum + variant.stock, 0)
      }
    });
  }

  revalidatePosPaths();

  return { ok: true, message: "ບັນທຶກການຂາຍສໍາເລັດ", sale };
}

function buildMemberSnapshot(memberId: string | undefined, store: StoreSnapshot) {
  const id = String(memberId ?? "").trim();
  const emptySnapshot = {
    memberId: null,
    memberName: null,
    memberPhone: null,
    memberTierName: null,
    memberDiscount: null
  };

  if (!id) {
    return emptySnapshot;
  }

  const member = buildMemberSummaries(
    store.members ?? [],
    store.memberTiers ?? [],
    store.sales ?? []
  ).find((item) => item.id === id && item.isActive);

  if (!member) {
    return emptySnapshot;
  }

  return {
    memberId: member.id,
    memberName: member.name,
    memberPhone: member.phone,
    memberTierName: member.tier?.name ?? null,
    memberDiscount: member.tier?.discountPercent ?? 0
  };
}

function mergeRequestedItems(items: PosSaleInput["items"]) {
  const merged = new Map<string, { productId: string; variantId: string; quantity: number }>();

  for (const item of items) {
    const productId = String(item.productId ?? "").trim();
    const variantId = String(item.variantId ?? "").trim();
    const quantity = Math.max(0, Math.round(Number(item.quantity ?? 0)));

    if (!productId || !variantId || quantity <= 0) {
      continue;
    }

    const key = `${productId}::${variantId}`;
    const current = merged.get(key);

    merged.set(key, {
      productId,
      variantId,
      quantity: (current?.quantity ?? 0) + quantity
    });
  }

  return Array.from(merged.values());
}

function buildSaleFromProducts(
  products: Product[],
  requestedItems: ReturnType<typeof mergeRequestedItems>,
  options: {
    discount: number;
    paymentMethod: SalePaymentMethod;
    receivedAmount: number;
  }
):
  | { ok: true; saleData: Omit<Sale, "id" | "createdAt" | "updatedAt"> }
  | { ok: false; message: string } {
  const items: SaleItem[] = [];

  for (const requested of requestedItems) {
    const product = products.find((item) => item.id === requested.productId);

    if (!product || !product.isActive) {
      return { ok: false, message: "ບໍ່ພົບສິນຄ້າ ຫຼືສິນຄ້າຖືກປິດການຂາຍ" };
    }

    const variant = getProductVariants(product).find(
      (item) => item.id === requested.variantId
    );

    if (!variant) {
      return { ok: false, message: "ບໍ່ພົບຂະໜາດສິນຄ້າ" };
    }

    if (variant.stock < requested.quantity) {
      return {
        ok: false,
        message: `ສະຕ໋ອກ ${product.name} - ${variant.name} ບໍ່ພໍ`
      };
    }

    items.push(productToOrderItem(product, requested.quantity, variant));
  }

  const totals = calculateOrderTotals(items);
  const discount = Math.min(options.discount, totals.totalAmount);
  const netAmount = totals.totalAmount - discount;
  const profit = netAmount - totals.totalCost;
  const changeAmount =
    options.paymentMethod === "CASH"
      ? Math.max(0, options.receivedAmount - netAmount)
      : 0;

  return {
    ok: true,
    saleData: {
      items,
      ...totals,
      profit,
      discount,
      netAmount,
      paymentMethod: options.paymentMethod,
      receivedAmount:
        options.paymentMethod === "CASH" ? options.receivedAmount : null,
      changeAmount: options.paymentMethod === "CASH" ? changeAmount : null
    }
  };
}

function applyStockChanges(
  products: Product[],
  requestedItems: ReturnType<typeof mergeRequestedItems>,
  updatedAt: Date
) {
  return products.map((product) => {
    const changes = requestedItems.filter((item) => item.productId === product.id);

    if (!changes.length) {
      return product;
    }

    const variants = getProductVariants(product).map((variant) => {
      const change = changes.find((item) => item.variantId === variant.id);

      return change
        ? { ...variant, stock: variant.stock - change.quantity }
        : variant;
    });

    return {
      ...product,
      variants,
      stock: variants.reduce((sum, variant) => sum + variant.stock, 0),
      updatedAt
    };
  });
}

function restockProducts(products: Product[], items: SaleItem[], updatedAt: Date) {
  return products.map((product) => {
    const saleItems = items.filter((item) => item.productId === product.id);

    if (!saleItems.length) {
      return product;
    }

    const variants = getProductVariants(product).map((variant) => {
      const quantity = saleItems
        .filter((item) => item.variantId === variant.id)
        .reduce((sum, item) => sum + item.quantity, 0);

      return quantity ? { ...variant, stock: variant.stock + quantity } : variant;
    });

    return {
      ...product,
      variants,
      stock: variants.reduce((sum, variant) => sum + variant.stock, 0),
      updatedAt
    };
  });
}

function isActiveSale(sale: Sale) {
  return !sale.status || sale.status === "ACTIVE";
}

function storeSaleSequence(sales: Sale[], date: Date) {
  return (
    sales.filter(
      (sale) =>
        sale.createdAt.getFullYear() === date.getFullYear() &&
        sale.createdAt.getMonth() === date.getMonth() &&
        sale.createdAt.getDate() === date.getDate()
    ).length + 1
  );
}

function parseSalePaymentMethod(value?: SalePaymentMethod): SalePaymentMethod {
  return value === "TRANSFER" || value === "OTHER" ? value : "CASH";
}

function parseSaleStatus(value: FormDataEntryValue | null): SaleStatus | null {
  return value === "CANCELLED" || value === "RETURNED" ? value : null;
}

function parsePaymentFilter(value?: PosSaleHistoryFilters["paymentMethod"]) {
  return value === "CASH" || value === "TRANSFER" || value === "OTHER"
    ? value
    : "ALL";
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

function isSameDay(date: Date, target: Date) {
  const current = new Date(date);

  return (
    current.getFullYear() === target.getFullYear() &&
    current.getMonth() === target.getMonth() &&
    current.getDate() === target.getDate()
  );
}

function revalidatePosPaths() {
  revalidatePath("/pos");
  revalidatePath("/pos/history");
  revalidatePath("/pos/closing");
  revalidatePath("/alerts");
  revalidatePath("/products");
  revalidatePath("/stock-alerts");
  revalidatePath("/dashboard");
  revalidatePath("/reports");
  revalidatePath("/sold-products");
  revalidatePath("/exports");
  revalidatePath("/members");
}
