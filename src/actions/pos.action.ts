"use server";

import { revalidatePath } from "next/cache";
import type { Prisma } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import { readLocalStore, updateLocalStore } from "@/lib/local-store";
import { buildClosingNumber, buildReadableNumber, formatLaoDateInput } from "@/lib/document-number";
import { requireAuthenticatedUser } from "@/lib/auth";
import { verifyOwnerApproval } from "@/lib/approval";
import {
  calculateInclusiveTax,
  validatePosDiscountPermission,
  validatePosPayment
} from "@/lib/pos-rules";
import { buildMemberSummaries } from "@/lib/members";
import { getPricingKey, getPromotionDiscount, resolvePromotionPrice } from "@/lib/promotions";
import { calculateSaleRefund } from "@/lib/sales";
import { averageCost, CurrencyError, moneyInteger, parseDecimal } from "@/lib/currency";
import { movementBalance, resolveThbTender, thbRefundMovement, thbSaleMovements } from "@/lib/cash-currency";
import {
  calculateOrderTotals,
  formatProductVariantName,
  getProductVariants,
  productToOrderItem
} from "@/lib/utils";
import type {
  DailyClosing,
  CashMovement,
  CashShift,
  Member,
  MemberTier,
  PosPaymentSummary,
  Product,
  Promotion,
  Sale,
  SaleItem,
  SalePayment,
  SalePaymentMethod,
  SaleReturn,
  SaleReturnItem,
  SaleStatus,
  StockMovement
} from "@/types";

const hasDatabase = Boolean(process.env.DATABASE_URL);

type PosSaleInput = {
  items: Array<{
    productId: string;
    variantId: string;
    quantity: number;
  }>;
  discount?: number;
  pricingKey?: string;
  expectedNetAmount?: number;
  paymentMethod?: SalePaymentMethod;
  receivedAmount?: number;
  tenderCurrency?: "LAK" | "THB";
  tenderAmountMinor?: number;
  expectedExchangeRate?: number;
  memberId?: string;
  paymentReference?: string;
  payments?: SalePayment[];
  idempotencyKey?: string;
};

type PosSaleResult = {
  ok: boolean;
  message: string;
  sale?: Sale;
  priceChanged?: boolean;
};

type PosSaleHistoryFilters = {
  search?: string;
  paymentMethod?: SalePaymentMethod | "ALL" | string;
  date?: string;
  limit?: number;
};

type StoreSnapshot = Awaited<ReturnType<typeof readLocalStore>>;

export async function getSales(options?: { includeInactive?: boolean }): Promise<Sale[]> {
  await requireAuthenticatedUser();
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
  await requireAuthenticatedUser();
  const search = filters?.search?.trim().toLowerCase();
  const paymentMethod = parsePaymentFilter(filters?.paymentMethod);
  const dateRange = getDateRange(filters?.date);
  const limit = normalizeLimit(filters?.limit) ?? 100;

  if (hasDatabase && !search) {
    const filteredSales = (await prisma.sale.findMany({
      where: {
        status: { in: ["ACTIVE", "PARTIALLY_RETURNED"] },
        paymentMethod: paymentMethod === "ALL" ? undefined : paymentMethod,
        createdAt: dateRange
          ? {
              gte: dateRange.start,
              lt: dateRange.end
            }
          : undefined
      },
      orderBy: { createdAt: "desc" },
      take: limit
    })) as unknown as Sale[];

    return {
      sales: await enrichSaleItemImages(filteredSales),
      summary: summarizeSales(filteredSales),
      paymentMethod
    };
  }

  const sales = await getSales();
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
    sales: await enrichSaleItemImages(filteredSales.slice(0, limit)),
    summary: summarizeSales(filteredSales),
    paymentMethod
  };
}

function normalizeLimit(value?: number) {
  if (!value) {
    return undefined;
  }

  return Math.min(Math.max(Math.floor(value), 1), 200);
}

async function enrichSaleItemImages(sales: Sale[]) {
  const missingProductIds = [
    ...new Set(
      sales
        .flatMap((sale) => sale.items)
        .filter((item) => !item.imageUrl)
        .map((item) => item.productId)
    )
  ];

  if (!missingProductIds.length) {
    return sales;
  }

  const products = hasDatabase
    ? ((await prisma.product.findMany({
        where: { id: { in: missingProductIds } },
        select: { id: true, imageUrl: true }
      })) as unknown as Pick<Product, "id" | "imageUrl">[])
    : (await readLocalStore()).products;
  const imageByProductId = new Map(
    products
      .filter((product) => product.imageUrl)
      .map((product) => [product.id, product.imageUrl])
  );

  if (!imageByProductId.size) {
    return sales;
  }

  return sales.map((sale) => ({
    ...sale,
    items: sale.items.map((item) => ({
      ...item,
      imageUrl: item.imageUrl ?? imageByProductId.get(item.productId) ?? null
    }))
  }));
}

function summarizeSales(sales: Sale[]): PosPaymentSummary {
  return sales.filter(isCountedSale).reduce(
    (summary, sale) => {
      const amount = effectiveSaleAmount(sale);

      if (sale.paymentMethod === "SPLIT" && sale.payments?.length) {
        let remainingRefund = sale.refundAmount ?? 0;
        for (const payment of sale.payments) {
          const paidAfterRefund = Math.max(0, payment.amount - remainingRefund);
          remainingRefund = Math.max(0, remainingRefund - payment.amount);
          if (payment.method === "TRANSFER") summary.transferAmount += paidAfterRefund;
          else if (payment.method === "OTHER") summary.otherAmount += paidAfterRefund;
          else summary.cashAmount += paidAfterRefund;
        }
      } else if (sale.paymentMethod === "TRANSFER") {
        summary.transferAmount += amount;
      } else if (sale.paymentMethod === "OTHER") {
        summary.otherAmount += amount;
      } else {
        summary.cashAmount += amount;
      }

      summary.totalAmount += amount;
      summary.billCount += 1;
      summary.profit += sale.profit - (sale.refundAmount ?? 0) + (sale.returnedCost ?? 0);

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

export async function submitVoidPosSale(_state: { message: string }, formData: FormData): Promise<{ message: string }> {
  await requireAuthenticatedUser();
  try { await voidPosSale(formData); return { message: "" }; }
  catch (error) { return { message: error instanceof CurrencyError ? error.message : "ບັນທຶກບໍ່ສໍາເລັດ ກະລຸນາໂຫຼດໜ້າໃໝ່ ແລະ ກວດສະຖານະບິນກ່ອນລອງອີກຄັ້ງ" }; }
}

export async function submitReturnPosSaleItems(_state: { message: string }, formData: FormData): Promise<{ message: string }> {
  await requireAuthenticatedUser();
  try { await returnPosSaleItems(formData); return { message: "" }; }
  catch (error) { return { message: error instanceof CurrencyError ? error.message : "ບັນທຶກບໍ່ສໍາເລັດ ກະລຸນາໂຫຼດໜ້າໃໝ່ ແລະ ກວດສະຖານະບິນກ່ອນລອງອີກຄັ້ງ" }; }
}

export async function voidPosSale(formData: FormData): Promise<void> {
  const currentUser = await requireAuthenticatedUser();
  const saleId = String(formData.get("saleId") ?? "");
  const status = parseSaleStatus(formData.get("status"));
  const reason = String(formData.get("reason") ?? "").trim() || null;
  const note = String(formData.get("note") ?? "").trim() || null;
  const approval = verifyOwnerApproval(
    currentUser,
    String(formData.get("approvalPin") ?? "")
  );

  if (!saleId || !status || !approval) {
    return;
  }

  const now = new Date();

  if (!hasDatabase) {
    await updateLocalStore((store) => {
      const sale = store.sales.find((item) => item.id === saleId);

      if (!sale || !isFullyActiveSale(sale)) {
        return store;
      }

      const refundMovements = thbRefundMovement(sale, sale.netAmount,
        store.cashShifts.find(shift => shift.cashierId === currentUser.id && shift.status === "OPEN"), currentUser, now);

      return {
        ...store,
        cashMovements: [...refundMovements, ...store.cashMovements],
        sales: store.sales.map((item) =>
          item.id === saleId
            ? {
                ...item,
                status,
                voidReason: reason,
                voidNote: note,
                approvedById: approval.id,
                approvedByName: approval.name,
                voidedAt: now,
                restockedAt: now,
                updatedAt: now
              }
            : item
        ),
        products: restockProducts(store.products, sale.items, now),
        stockMovements: [
          ...buildLocalRestockMovements(store.products, sale.items, {
            type: reason === "ປ່ຽນສິນຄ້າ" ? "EXCHANGE" : "SALE_RETURN",
            referenceType: "SALE",
            referenceId: sale.id,
            referenceNo: sale.saleNo,
            reason,
            userId: currentUser.id,
            userName: currentUser.name,
            createdAt: now
          }),
          ...(store.stockMovements ?? [])
        ],
        auditLogs: [
          {
            id: crypto.randomUUID(),
            action: status === "RETURNED" ? "SALE_RETURNED" : "SALE_CANCELLED",
            entityType: "SALE",
            entityId: sale.id,
            entityNo: sale.saleNo,
            description: reason ?? "ຍົກເລີກ/ຄືນບິນ",
            userId: currentUser.id,
            userName: currentUser.name,
            userRole: currentUser.role,
            approvedById: approval.id,
            approvedByName: approval.name,
            metadata: { note, status },
            createdAt: now
          },
          ...(store.auditLogs ?? [])
        ]
      };
    });
    revalidatePosPaths();
    return;
  }

  await prisma.$transaction(async (tx) => {
    const sale = (await tx.sale.findUnique({
      where: { id: saleId }
    })) as unknown as Sale | null;

    if (!sale || !isFullyActiveSale(sale)) {
      return;
    }

    if (sale.tenderCurrency === "THB") {
      const shift = await tx.cashShift.findFirst({ where: { cashierId: currentUser.id, status: "OPEN" } }) as unknown as CashShift | null;
      for (const movement of thbRefundMovement(sale, sale.netAmount, shift, currentUser, now)) {
        await tx.cashShift.update({ where: { id: movement.shiftId, status: "OPEN" }, data: { updatedAt: now } });
        await tx.cashMovement.create({ data: { ...movement, id: undefined } });
      }
    }

    await restockSaleItemsInDatabase(tx, sale.items, {
      type: reason === "ປ່ຽນສິນຄ້າ" ? "EXCHANGE" : "SALE_RETURN",
      referenceType: "SALE",
      referenceId: sale.id,
      referenceNo: sale.saleNo,
      reason,
      userId: currentUser.id,
      userName: currentUser.name
    });
    await tx.sale.update({
      where: { id: saleId },
      data: {
        status,
        voidReason: reason,
        voidNote: note,
        approvedById: approval.id,
        approvedByName: approval.name,
        voidedAt: now,
        restockedAt: now
      }
    });
    await tx.auditLog.create({
      data: {
        action: status === "RETURNED" ? "SALE_RETURNED" : "SALE_CANCELLED",
        entityType: "SALE",
        entityId: sale.id,
        entityNo: sale.saleNo,
        description: reason ?? "ຍົກເລີກ/ຄືນບິນ",
        userId: currentUser.id,
        userName: currentUser.name,
        userRole: currentUser.role,
        approvedById: approval.id,
        approvedByName: approval.name,
        metadata: { note, status }
      }
    });
  });

  revalidatePosPaths();
}

export async function returnPosSaleItems(formData: FormData): Promise<void> {
  const currentUser = await requireAuthenticatedUser();
  const saleId = String(formData.get("saleId") ?? "").trim();
  const reason = String(formData.get("reason") ?? "").trim();
  const note = String(formData.get("note") ?? "").trim() || null;
  const refundMethod = parseSalePaymentMethod(
    String(formData.get("refundMethod") ?? "CASH") as SalePaymentMethod
  );
  const approval = verifyOwnerApproval(
    currentUser,
    String(formData.get("approvalPin") ?? "")
  );

  if (!saleId || !reason || !approval) return;

  if (!hasDatabase) {
    await updateLocalStore((store) => {
      const sale = store.sales.find((item) => item.id === saleId);
      if (!sale || !isCountedSale(sale)) return store;

      const previousReturns = (store.saleReturns ?? []).filter(
        (item) => item.saleId === saleId
      );
      const returnItems = buildRequestedReturnItems(sale, previousReturns, formData);
      if (!returnItems.length) return store;

      const now = new Date();
      const refundAmount = calculateRefundAmount(sale, returnItems);
      if (sale.tenderCurrency === "THB" && refundMethod !== "CASH") throw new Error("ບິນຮັບບາດ ຄືນເງິນເປັນເງິນສົດກີບເທົ່ານັ້ນ");
      const refundMovements = thbRefundMovement(sale, refundAmount,
        store.cashShifts.find(shift => shift.cashierId === currentUser.id && shift.status === "OPEN"), currentUser, now);
      const returnedCost = returnItems.reduce(
        (sum, item) => sum + item.cost * item.quantity,
        0
      );
      const saleReturn: SaleReturn = {
        id: crypto.randomUUID(),
        returnNo: buildReadableNumber(
          "RET",
          now,
          (store.saleReturns ?? []).filter((item) => isSameDay(item.createdAt, now)).length + 1
        ),
        saleId: sale.id,
        saleNo: sale.saleNo,
        items: returnItems,
        refundAmount,
        returnedCost,
        paymentMethod: refundMethod === "SPLIT" ? "CASH" : refundMethod,
        reason,
        note,
        processedById: currentUser.id,
        processedByName: currentUser.name,
        approvedById: approval.id,
        approvedByName: approval.name,
        createdAt: now
      };
      const allReturns = [...previousReturns, saleReturn];
      const fullyReturned = isSaleFullyReturned(sale, allReturns);

      return {
        ...store,
        sales: store.sales.map((item) =>
          item.id === sale.id
            ? {
                ...item,
                status: fullyReturned ? "RETURNED" : "PARTIALLY_RETURNED",
                refundAmount: (item.refundAmount ?? 0) + refundAmount,
                returnedCost: (item.returnedCost ?? 0) + returnedCost,
                approvedById: approval.id,
                approvedByName: approval.name,
                updatedAt: now
              }
            : item
        ),
        products: restockProducts(store.products, returnItems, now),
        saleReturns: [saleReturn, ...(store.saleReturns ?? [])],
        cashMovements: [...refundMovements, ...store.cashMovements],
        stockMovements: [
          ...buildLocalRestockMovements(store.products, returnItems, {
            type: reason === "ປ່ຽນສິນຄ້າ" ? "EXCHANGE" : "SALE_RETURN",
            referenceType: "SALE_RETURN",
            referenceId: saleReturn.id,
            referenceNo: saleReturn.returnNo,
            reason,
            userId: currentUser.id,
            userName: currentUser.name,
            createdAt: now
          }),
          ...(store.stockMovements ?? [])
        ],
        auditLogs: [
          {
            id: crypto.randomUUID(),
            action: "PARTIAL_SALE_RETURN",
            entityType: "SALE_RETURN",
            entityId: saleReturn.id,
            entityNo: saleReturn.returnNo,
            description: `ຄືນສິນຄ້າຈາກ ${sale.saleNo ?? sale.id}`,
            userId: currentUser.id,
            userName: currentUser.name,
            userRole: currentUser.role,
            approvedById: approval.id,
            approvedByName: approval.name,
            metadata: { saleId, refundAmount, reason },
            createdAt: now
          },
          ...(store.auditLogs ?? [])
        ]
      };
    });
    revalidatePosPaths();
    return;
  }

  await prisma.$transaction(async (tx) => {
    const sale = (await tx.sale.findUnique({ where: { id: saleId } })) as unknown as Sale | null;
    if (!sale || !isCountedSale(sale)) return;

    const previousReturns = (await tx.saleReturn.findMany({
      where: { saleId }
    })) as unknown as SaleReturn[];
    const returnItems = buildRequestedReturnItems(sale, previousReturns, formData);
    if (!returnItems.length) return;

    const now = new Date();
    const refundAmount = calculateRefundAmount(sale, returnItems);
    if (sale.tenderCurrency === "THB") {
      if (refundMethod !== "CASH") throw new Error("ບິນຮັບບາດ ຄືນເງິນເປັນເງິນສົດກີບເທົ່ານັ້ນ");
      const shift = await tx.cashShift.findFirst({ where: { cashierId: currentUser.id, status: "OPEN" } }) as unknown as CashShift | null;
      for (const movement of thbRefundMovement(sale, refundAmount, shift, currentUser, now)) {
        await tx.cashShift.update({ where: { id: movement.shiftId, status: "OPEN" }, data: { updatedAt: now } });
        await tx.cashMovement.create({ data: { ...movement, id: undefined } });
      }
    }
    const returnedCost = returnItems.reduce(
      (sum, item) => sum + item.cost * item.quantity,
      0
    );
    const returnNo = buildReadableNumber(
      "RET",
      now,
      (await tx.saleReturn.count({
        where: {
          createdAt: {
            gte: new Date(now.getFullYear(), now.getMonth(), now.getDate()),
            lt: new Date(now.getFullYear(), now.getMonth(), now.getDate() + 1)
          }
        }
      })) + 1
    );
    const created = await tx.saleReturn.create({
      data: {
        returnNo,
        saleId,
        saleNo: sale.saleNo,
        items: returnItems,
        refundAmount,
        returnedCost,
        paymentMethod: refundMethod === "SPLIT" ? "CASH" : refundMethod,
        reason,
        note,
        processedById: currentUser.id,
        processedByName: currentUser.name,
        approvedById: approval.id,
        approvedByName: approval.name
      }
    });

    await restockSaleItemsInDatabase(tx, returnItems, {
      type: reason === "ປ່ຽນສິນຄ້າ" ? "EXCHANGE" : "SALE_RETURN",
      referenceType: "SALE_RETURN",
      referenceId: created.id,
      referenceNo: returnNo,
      reason,
      userId: currentUser.id,
      userName: currentUser.name
    });
    const fullyReturned = isSaleFullyReturned(sale, [
      ...previousReturns,
      { ...created, createdAt: now } as unknown as SaleReturn
    ]);
    await tx.sale.update({
      where: { id: saleId },
      data: {
        status: fullyReturned ? "RETURNED" : "PARTIALLY_RETURNED",
        refundAmount: (sale.refundAmount ?? 0) + refundAmount,
        returnedCost: (sale.returnedCost ?? 0) + returnedCost,
        approvedById: approval.id,
        approvedByName: approval.name
      }
    });
    await tx.auditLog.create({
      data: {
        action: "PARTIAL_SALE_RETURN",
        entityType: "SALE_RETURN",
        entityId: created.id,
        entityNo: returnNo,
        description: `ຄືນສິນຄ້າຈາກ ${sale.saleNo ?? sale.id}`,
        userId: currentUser.id,
        userName: currentUser.name,
        userRole: currentUser.role,
        approvedById: approval.id,
        approvedByName: approval.name,
        metadata: { saleId, refundAmount, reason }
      }
    });
  });

  revalidatePosPaths();
}

export async function getDailyClosing(dateValue?: string): Promise<{
  date: string;
  summary: PosPaymentSummary;
  closing: DailyClosing | null;
  physicalCashLak: number;
  cashThb: number;
}> {
  const date = dateValue && getDateRange(dateValue) ? dateValue : formatLaoDateInput(new Date());
  const dateRange = getDateRange(date);
  const sales = (await getSales()).filter((sale) =>
    dateRange ? sale.createdAt >= dateRange.start && sale.createdAt < dateRange.end : true
  );

  const closing = hasDatabase
    ? ((await prisma.dailyClosing.findFirst({
        where: { date },
        orderBy: { closedAt: "desc" }
      })) as unknown as DailyClosing | null)
    : (await readLocalStore()).dailyClosings.find((item) => item.date === date) ?? null;

  const currencyMovements = hasDatabase
    ? await prisma.cashMovement.findMany({ where: { source: { in: ["THB_SALE", "THB_CHANGE", "THB_REFUND"] },
        createdAt: dateRange ? { gte: dateRange.start, lt: dateRange.end } : undefined } }) as unknown as CashMovement[]
    : (await readLocalStore()).cashMovements.filter(m => m.source?.startsWith("THB_") && (!dateRange || (m.createdAt >= dateRange.start && m.createdAt < dateRange.end)));

  return {
    date,
    summary: summarizeSales(sales),
    physicalCashLak: summarizeSales(sales.filter(sale => sale.tenderCurrency !== "THB")).cashAmount + movementBalance(currencyMovements, "LAK"),
    cashThb: movementBalance(currencyMovements, "THB"),
    closing
  };
}

export async function getDailyClosings(): Promise<DailyClosing[]> {
  await requireAuthenticatedUser();

  if (hasDatabase) {
    return (await prisma.dailyClosing.findMany({
      orderBy: { closedAt: "desc" }
    })) as unknown as DailyClosing[];
  }

  const store = await readLocalStore();

  return [...(store.dailyClosings ?? [])].sort(
    (a, b) => b.closedAt.getTime() - a.closedAt.getTime()
  );
}

export async function closeDailySales(formData: FormData): Promise<void> {
  const currentUser = await requireAuthenticatedUser();
  const approval = verifyOwnerApproval(
    currentUser,
    String(formData.get("approvalPin") ?? "")
  );

  if (!approval) {
    return;
  }
  const date = String(formData.get("date") ?? "") || formatLaoDateInput(new Date());
  if (!getDateRange(date)) throw new Error("ວັນທີປິດຍອດບໍ່ຖືກຕ້ອງ");
  const countedCash = Number(formData.get("countedCash") ?? 0);
  moneyInteger(Math.abs(countedCash));
  const countedThb = parseDecimal(formData.get("countedThb") || "0", 2);
  const note = String(formData.get("note") ?? "").trim() || null;
  const { summary, physicalCashLak, cashThb } = await getDailyClosing(date);
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
    cashDifference: countedCash - physicalCashLak,
    physicalCashLak, cashThb, countedThb, differenceThb: countedThb - cashThb,
    note,
    closedById: currentUser.id,
    closedByName: currentUser.name,
    approvedById: approval.id,
    approvedByName: approval.name,
    closedAt: now,
    createdAt: now,
    updatedAt: now
  };

  if (hasDatabase) {
    await prisma.$transaction(async (tx) => {
      await tx.dailyClosing.deleteMany({ where: { date } });
      await tx.dailyClosing.create({
        data: {
          closingNo: closing.closingNo,
          date: closing.date,
          cashAmount: closing.cashAmount,
          transferAmount: closing.transferAmount,
          otherAmount: closing.otherAmount,
          totalAmount: closing.totalAmount,
          billCount: closing.billCount,
          profit: closing.profit,
          countedCash: closing.countedCash,
          cashDifference: closing.cashDifference,
          physicalCashLak, cashThb, countedThb, differenceThb: closing.differenceThb,
          note: closing.note,
          closedById: closing.closedById,
          closedByName: closing.closedByName,
          approvedById: closing.approvedById,
          approvedByName: closing.approvedByName,
          closedAt: closing.closedAt
        }
      });
      await tx.auditLog.create({
        data: {
          action: "DAILY_CLOSING_SAVED",
          entityType: "DAILY_CLOSING",
          entityId: closing.id,
          entityNo: closing.closingNo,
          description: `ປິດຍອດ ${date}`,
          userId: currentUser.id,
          userName: currentUser.name,
          userRole: currentUser.role,
          approvedById: approval.id,
          approvedByName: approval.name,
          metadata: {
            countedCash,
            cashDifference: closing.cashDifference
          }
        }
      });
    });
  } else {
    await updateLocalStore((store) => ({
      ...store,
      dailyClosings: [
        closing,
        ...(store.dailyClosings ?? []).filter((item) => item.date !== date)
      ],
      auditLogs: [
        {
          id: crypto.randomUUID(),
          action: "DAILY_CLOSING_SAVED",
          entityType: "DAILY_CLOSING",
          entityId: closing.id,
          entityNo: closing.closingNo,
          description: `ປິດຍອດ ${date}`,
          userId: currentUser.id,
          userName: currentUser.name,
          userRole: currentUser.role,
          approvedById: approval.id,
          approvedByName: approval.name,
          metadata: { countedCash, cashDifference: closing.cashDifference },
          createdAt: now
        },
        ...(store.auditLogs ?? [])
      ]
    }));
  }

  revalidatePosPaths();
  revalidatePath("/pos/closing");
}

export async function createPosSale(input: PosSaleInput): Promise<PosSaleResult> {
  if (input.tenderCurrency && !["LAK", "THB"].includes(input.tenderCurrency)) return { ok: false, message: "ສະກຸນເງິນບໍ່ຖືກຕ້ອງ" };
  const requestedItems = mergeRequestedItems(input.items);
  const discount = Math.max(0, Math.round(Number(input.discount ?? 0)));
  const paymentMethod = parseSalePaymentMethod(input.paymentMethod);
  const receivedAmount = Math.max(0, Math.round(Number(input.receivedAmount ?? 0)));
  const payments = normalizePayments(input.payments);
  const paymentReference = String(input.paymentReference ?? "").trim() || null;
  const idempotencyKey =
    String(input.idempotencyKey ?? "").trim().slice(0, 100) || crypto.randomUUID();
  const currentUser = await requireAuthenticatedUser();
  const discountPermissionError = validatePosDiscountPermission({
    role: currentUser.role,
    discount
  });
  const requestedProductIds = [
    ...new Set(requestedItems.map((item) => item.productId))
  ];

  if (discountPermissionError) {
    return { ok: false, message: discountPermissionError };
  }

  if (!requestedItems.length) {
    return { ok: false, message: "ກະລຸນາສະແກນ ຫຼືເລືອກສິນຄ້າກ່ອນ" };
  }

  if (!hasDatabase) {
    const localResult: { value: PosSaleResult | null } = { value: null };

    await updateLocalStore((store) => {
      const existingSale = (store.sales ?? []).find(
        (sale) => sale.idempotencyKey === idempotencyKey
      );

      if (existingSale) {
        localResult.value = {
          ok: true,
          message: "ບິນນີ້ຖືກບັນທຶກແລ້ວ",
          sale: currentUser.role === "STAFF" ? hideSaleCosts(existingSale) : existingSale
        };
        return store;
      }

      const openShift = (store.cashShifts ?? []).find(
        (shift) => shift.cashierId === currentUser.id && shift.status === "OPEN"
      );

      if (store.storeSettings.requireShiftForSale && !openShift) {
        localResult.value = {
          ok: false,
          message: "ກະລຸນາເປີດກະຂາຍກ່ອນບັນທຶກບິນ"
        };
        return store;
      }

      const memberSnapshot = input.memberId
        ? buildMemberSnapshot(input.memberId, store)
        : emptyMemberSnapshot();
      const build = buildSaleFromProducts(store.products, requestedItems, {
        promotions: store.promotions ?? [],
        now: Date.now(),
        pricingKey: input.pricingKey,
        expectedNetAmount: input.expectedNetAmount,
        discount,
        paymentMethod,
        receivedAmount,
        payments,
        paymentReference,
        taxEnabled: store.storeSettings.taxEnabled,
        taxRate: store.storeSettings.taxRate,
        tenderCurrency: input.tenderCurrency,
        tenderAmountMinor: input.tenderAmountMinor,
        expectedExchangeRate: input.expectedExchangeRate,
        thbEnabled: store.storeSettings.thbEnabled ?? false,
        thbRate: store.storeSettings.thbPaymentRate ?? 0,
        hasShift: Boolean(openShift)
      });

      if (!build.ok) {
        localResult.value = { ok: false, message: build.message, priceChanged: build.priceChanged };
        return store;
      }

      const approval = discount > 0
        ? { id: currentUser.id, name: currentUser.name }
        : null;

      const now = new Date();
      const sale: Sale = {
        id: crypto.randomUUID(),
        saleNo: buildUniqueSaleNumber(
          now,
          storeSaleSequence(store.sales ?? [], now),
          idempotencyKey
        ),
        cashierId: currentUser.id,
        cashierName: currentUser.name,
        idempotencyKey,
        branchName: store.storeSettings.defaultBranchName || null,
        registerName: store.storeSettings.defaultRegisterName || null,
        shiftId: openShift?.id ?? null,
        approvedById: approval?.id ?? null,
        approvedByName: approval?.name ?? null,
        ...memberSnapshot,
        status: "ACTIVE",
        ...build.saleData,
        createdAt: now,
        updatedAt: now
      };

      localResult.value = {
        ok: true,
        message: "ບັນທຶກການຂາຍສໍາເລັດ",
        sale: currentUser.role === "STAFF" ? hideSaleCosts(sale) : sale
      };

      return {
        ...store,
        sales: [sale, ...(store.sales ?? [])],
        cashMovements: [...thbSaleMovements(sale, currentUser), ...(store.cashMovements ?? [])],
        products: applyStockChanges(store.products, requestedItems, now),
        stockMovements: [
          ...buildLocalSaleStockMovements(store.products, requestedItems, sale, currentUser),
          ...(store.stockMovements ?? [])
        ],
        auditLogs: [
          {
            id: crypto.randomUUID(),
            action: "POS_SALE_CREATED",
            entityType: "SALE",
            entityId: sale.id,
            entityNo: sale.saleNo,
            description: `ຂາຍສິນຄ້າ ${sale.items.length} ລາຍການ`,
            userId: currentUser.id,
            userName: currentUser.name,
            userRole: currentUser.role,
            approvedById: approval?.id ?? null,
            approvedByName: approval?.name ?? null,
            metadata: { netAmount: sale.netAmount, discount: sale.discount },
            createdAt: now
          },
          ...(store.auditLogs ?? [])
        ]
      };
    });

    if (!localResult.value) {
      throw new Error("Local POS transaction did not return a result");
    }

    revalidatePosSalePaths();

    return localResult.value;
  }

  const memberSnapshot = input.memberId
    ? await buildDatabaseMemberSnapshot(input.memberId)
    : emptyMemberSnapshot();
  const transactionResult = await prisma.$transaction(async (tx) => {
    const existingSale = (await tx.sale.findUnique({
      where: { idempotencyKey }
    })) as unknown as Sale | null;

    if (existingSale) {
      return { ok: true as const, sale: existingSale, duplicate: true as const };
    }

    const [settings, openShift] = await Promise.all([
      tx.storeSettingsRecord.findUnique({ where: { id: "default" } }),
      tx.cashShift.findFirst({
        where: { cashierId: currentUser.id, status: "OPEN" },
        orderBy: { openedAt: "desc" }
      })
    ]);

    if (settings?.requireShiftForSale && !openShift) {
      return { ok: false as const, message: "ກະລຸນາເປີດກະຂາຍກ່ອນບັນທຶກບິນ" };
    }

    const products = (await tx.product.findMany({
      where: {
        id: { in: requestedProductIds },
        isActive: true
      }
    })) as unknown as Product[];
    const build = buildSaleFromProducts(products, requestedItems, {
      promotions: await tx.promotion.findMany({ where: { isActive: true } }) as Promotion[],
      now: Date.now(),
      pricingKey: input.pricingKey,
      expectedNetAmount: input.expectedNetAmount,
      discount,
      paymentMethod,
      receivedAmount,
      payments,
      paymentReference,
      taxEnabled: settings?.taxEnabled ?? false,
      taxRate: settings?.taxRate ?? 0,
      tenderCurrency: input.tenderCurrency,
      tenderAmountMinor: input.tenderAmountMinor,
      expectedExchangeRate: input.expectedExchangeRate,
      thbEnabled: settings?.thbEnabled ?? false,
      thbRate: settings?.thbPaymentRate ?? 0,
      hasShift: Boolean(openShift)
    });

    if (!build.ok) {
      return { ok: false as const, message: build.message, priceChanged: build.priceChanged };
    }

    const approval = discount > 0
      ? { id: currentUser.id, name: currentUser.name }
      : null;

    const now = new Date();
    const saleNo = buildUniqueSaleNumber(
      now,
      (await tx.sale.count({
        where: {
          createdAt: {
            gte: new Date(now.getFullYear(), now.getMonth(), now.getDate(), 0, 0, 0, 0),
            lt: new Date(now.getFullYear(), now.getMonth(), now.getDate() + 1, 0, 0, 0, 0)
          }
        }
      })) + 1,
      idempotencyKey
    );

    const sale = (await tx.sale.create({
      data: {
        saleNo,
        cashierId: currentUser.id,
        cashierName: currentUser.name,
        idempotencyKey,
        branchId: openShift?.branchId ?? null,
        branchName: openShift?.branchName ?? settings?.defaultBranchName ?? null,
        registerId: openShift?.registerId ?? null,
        registerName: openShift?.registerName ?? settings?.defaultRegisterName ?? null,
        shiftId: openShift?.id ?? null,
        approvedById: approval?.id ?? null,
        approvedByName: approval?.name ?? null,
        ...memberSnapshot,
        status: "ACTIVE",
        ...build.saleData
      }
    })) as unknown as Sale;

    // Touch the shift so a concurrent close conflicts rather than omitting cash.
    if (sale.tenderCurrency === "THB" && openShift) {
      await tx.cashShift.update({ where: { id: openShift.id, status: "OPEN" }, data: { updatedAt: now } });
    }
    for (const movement of thbSaleMovements(sale, currentUser)) {
      await tx.cashMovement.create({ data: { ...movement, id: undefined } });
    }

    for (const product of products) {
      const changes = requestedItems.filter((item) => item.productId === product.id);

      if (!changes.length) {
        continue;
      }

      const variants = getProductVariants(product).map((variant) => {
        const change = changes.find((item) => item.variantId === variant.id);

        return change
          ? { ...variant, stock: variant.stock - change.quantity }
          : variant;
      });

      await tx.product.update({
        where: { id: product.id },
        data: {
          variants,
          stock: variants.reduce((sum, variant) => sum + variant.stock, 0)
        }
      });

      for (const change of changes) {
        const beforeVariant = getProductVariants(product).find(
          (variant) => variant.id === change.variantId
        );
        const saleItem = build.saleData.items.find(
          (item) => item.productId === product.id && item.variantId === change.variantId
        );
        if (!beforeVariant || !saleItem) continue;
        await tx.stockMovement.create({
          data: {
            productId: product.id,
            variantId: change.variantId,
            sku: beforeVariant.sku,
            productName: product.name,
            variantName: beforeVariant.name,
            type: "SALE",
            quantity: -change.quantity,
            stockBefore: beforeVariant.stock,
            stockAfter: beforeVariant.stock - change.quantity,
            unitCost: saleItem.cost,
            referenceType: "SALE",
            referenceId: sale.id,
            referenceNo: sale.saleNo,
            userId: currentUser.id,
            userName: currentUser.name,
            branchId: openShift?.branchId ?? null
          }
        });
      }
    }

    await tx.auditLog.create({
      data: {
        action: "POS_SALE_CREATED",
        entityType: "SALE",
        entityId: sale.id,
        entityNo: sale.saleNo,
        description: `ຂາຍສິນຄ້າ ${sale.items.length} ລາຍການ`,
        userId: currentUser.id,
        userName: currentUser.name,
        userRole: currentUser.role,
        approvedById: approval?.id ?? null,
        approvedByName: approval?.name ?? null,
        metadata: { netAmount: sale.netAmount, discount: sale.discount }
      }
    });

    return { ok: true as const, sale, duplicate: false as const };
  });

  if (!transactionResult.ok) {
    return transactionResult;
  }

  const sale = transactionResult.sale;

  revalidatePosSalePaths();

  return {
    ok: true,
    message: "ບັນທຶກການຂາຍສໍາເລັດ",
    sale: currentUser.role === "STAFF" ? hideSaleCosts(sale) : sale
  };
}

async function restockSaleItemsInDatabase(
  tx: Prisma.TransactionClient,
  items: SaleItem[],
  context: {
    type: "SALE_RETURN" | "EXCHANGE";
    referenceType: string;
    referenceId: string;
    referenceNo?: string | null;
    reason?: string | null;
    userId: string;
    userName: string;
  }
) {
  for (const item of items) {
    const product = (await tx.product.findUnique({
      where: { id: item.productId }
    })) as unknown as Product | null;

    if (!product) {
      continue;
    }

    const variants = getProductVariants(product).map((variant) =>
      variant.id === item.variantId
        ? { ...variant, stock: variant.stock + item.quantity, costPrice: averageCost(variant.stock, variant.costPrice, item.quantity, item.cost) }
        : variant
    );

    await tx.product.update({
      where: { id: product.id },
      data: {
        variants,
        stock: variants.reduce((sum, variant) => sum + variant.stock, 0),
        costPrice: variants[0]?.costPrice ?? product.costPrice
      }
    });

    {
      const beforeVariant = getProductVariants(product).find(
        (variant) => variant.id === item.variantId
      );
      if (!beforeVariant) continue;
      await tx.stockMovement.create({
        data: {
          productId: product.id,
          variantId: item.variantId,
          sku: item.sku,
          productName: item.name,
          variantName: item.variantName,
          type: context.type,
          quantity: item.quantity,
          stockBefore: beforeVariant.stock,
          stockAfter: beforeVariant.stock + item.quantity,
          unitCost: item.cost,
          referenceType: context.referenceType,
          referenceId: context.referenceId,
          referenceNo: context.referenceNo,
          reason: context.reason,
          userId: context.userId,
          userName: context.userName
        }
      });
    }
  }
}

function hideSaleCosts(sale: Sale): Sale {
  return {
    ...sale,
    totalCost: 0,
    profit: 0,
    items: sale.items.map((item) => ({
      ...item,
      cost: 0
    }))
  };
}

function emptyMemberSnapshot() {
  return {
    memberId: null,
    memberName: null,
    memberPhone: null,
    memberTierName: null,
    memberDiscount: null
  };
}

function buildMemberSnapshot(memberId: string | undefined, store: StoreSnapshot) {
  const id = String(memberId ?? "").trim();

  if (!id) {
    return emptyMemberSnapshot();
  }

  const member = buildMemberSummaries(
    store.members ?? [],
    store.memberTiers ?? [],
    store.sales ?? []
  ).find((item) => item.id === id && item.isActive);

  if (!member) {
    return emptyMemberSnapshot();
  }

  return {
    memberId: member.id,
    memberName: member.name,
    memberPhone: member.phone,
    memberTierName: member.tier?.name ?? null,
    memberDiscount: member.tier?.discountPercent ?? 0
  };
}

async function buildDatabaseMemberSnapshot(memberId: string) {
  const [member, tiers, sales] = await Promise.all([
    prisma.member.findUnique({ where: { id: memberId } }) as unknown as Promise<Member | null>,
    prisma.memberTier.findMany({
      where: { isActive: true },
      orderBy: { minSpend: "asc" }
    }) as unknown as Promise<MemberTier[]>,
    prisma.sale.findMany({
      where: { memberId, status: "ACTIVE" },
      orderBy: { createdAt: "desc" }
    }) as unknown as Promise<Sale[]>
  ]);

  if (!member || !member.isActive) {
    return emptyMemberSnapshot();
  }

  const summary = buildMemberSummaries([member], tiers, sales)[0];

  return {
    memberId: member.id,
    memberName: member.name,
    memberPhone: member.phone,
    memberTierName: summary.tier?.name ?? null,
    memberDiscount: summary.tier?.discountPercent ?? 0
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
    promotions: Promotion[];
    now: number;
    pricingKey?: string;
    expectedNetAmount?: number;
    discount: number;
    paymentMethod: SalePaymentMethod;
    receivedAmount: number;
    payments: SalePayment[];
    paymentReference: string | null;
    taxEnabled: boolean;
    taxRate: number;
    tenderCurrency?: "LAK" | "THB";
    tenderAmountMinor?: number;
    expectedExchangeRate?: number;
    thbEnabled: boolean;
    thbRate: number;
    hasShift: boolean;
  }
):
  | { ok: true; saleData: Omit<Sale, "id" | "createdAt" | "updatedAt"> }
  | { ok: false; message: string; priceChanged?: boolean } {
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
        message: `ສະຕ໋ອກ ${formatProductVariantName(product.name, variant.name)} ບໍ່ພໍ`
      };
    }

    items.push({ ...productToOrderItem(product, requested.quantity, variant),
      ...resolvePromotionPrice(product.id, variant.id, variant.sellPrice, options.promotions, options.now) });
  }

  const totals = calculateOrderTotals(items);
  const promotionDiscount = getPromotionDiscount(items);
  if (promotionDiscount > 0 && options.discount > 0) {
    return { ok: false, priceChanged: true, message: "ບິນທີ່ມີໂປຣບໍ່ສາມາດຫຼຸດທ້າຍບິນຊໍ້າໄດ້ ກະລຸນາກວດຍອດໃໝ່" };
  }
  const manualDiscount = Math.min(options.discount, totals.totalAmount);
  const discount = promotionDiscount + manualDiscount;
  const netAmount = totals.totalAmount - manualDiscount;
  if ((options.pricingKey !== undefined && options.pricingKey !== getPricingKey(items)) ||
    (options.expectedNetAmount !== undefined && options.expectedNetAmount !== netAmount) ||
    (promotionDiscount > 0 && options.pricingKey === undefined)) {
    return { ok: false, priceChanged: true, message: "ລາຄາ ຫຼື ໂປຣໂມຊັນປ່ຽນແລ້ວ ກະລຸນາກວດຍອດ ແລະ ກົດບັນທຶກອີກຄັ້ງ" };
  }
  const profit = netAmount - totals.totalCost;
  let tender: { tenderCurrency: "THB"; tenderAmountMinor: number; exchangeRate: number; receivedAmount: number } | undefined;
  try {
    moneyInteger(netAmount);
    moneyInteger(totals.totalCost);
    moneyInteger(options.receivedAmount);
    if (options.tenderCurrency === "THB") tender = resolveThbTender({ method: options.paymentMethod,
      satang: options.tenderAmountMinor ?? 0, rate: options.thbRate, expectedRate: options.expectedExchangeRate,
      enabled: options.thbEnabled, hasShift: options.hasShift });
  } catch (error) {
    return { ok: false, priceChanged: true, message: error instanceof Error ? error.message : "ຈໍານວນເງິນບໍ່ຖືກຕ້ອງ" };
  }
  const receivedLak = tender?.receivedAmount ?? options.receivedAmount;
  const normalizedPayments =
    options.paymentMethod === "SPLIT"
      ? options.payments
      : [
          {
            method: options.paymentMethod as Exclude<SalePaymentMethod, "SPLIT">,
            amount: netAmount,
            reference: options.paymentReference
          }
        ];
  const paymentError = validatePosPayment({
    method: options.paymentMethod,
    netAmount,
    receivedAmount: receivedLak,
    payments: normalizedPayments
  });
  if (paymentError) return { ok: false, message: paymentError };

  const taxRate = options.taxEnabled
    ? Math.min(100, Math.max(0, Math.round(options.taxRate)))
    : 0;
  const taxAmount = calculateInclusiveTax(netAmount, taxRate);
  const changeAmount =
    options.paymentMethod === "CASH"
      ? Math.max(0, receivedLak - netAmount)
      : 0;

  return {
    ok: true,
    saleData: {
      items,
      ...totals,
      totalAmount: totals.totalAmount + promotionDiscount,
      profit,
      discount,
      netAmount,
      paymentMethod: options.paymentMethod,
      payments: normalizedPayments,
      paymentReference: options.paymentReference,
      taxRate,
      taxAmount,
      refundAmount: 0,
      returnedCost: 0,
      receivedAmount:
        options.paymentMethod === "CASH" ? receivedLak : null,
      tenderCurrency: tender?.tenderCurrency ?? "LAK",
      tenderAmountMinor: tender?.tenderAmountMinor ?? null,
      exchangeRate: tender?.exchangeRate ?? null,
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

      const returnedCost = saleItems.filter(item => item.variantId === variant.id).reduce((sum, item) => sum + item.cost * item.quantity, 0);
      return quantity ? { ...variant, stock: variant.stock + quantity,
        costPrice: averageCost(variant.stock, variant.costPrice, quantity, Math.round(returnedCost / quantity)) } : variant;
    });

    return {
      ...product,
      variants,
      stock: variants.reduce((sum, variant) => sum + variant.stock, 0),
      costPrice: variants[0]?.costPrice ?? product.costPrice,
      updatedAt
    };
  });
}

function isActiveSale(sale: Sale) {
  return !sale.status || sale.status === "ACTIVE" || sale.status === "PARTIALLY_RETURNED";
}

function isFullyActiveSale(sale: Sale) {
  return !sale.status || sale.status === "ACTIVE";
}

function buildLocalSaleStockMovements(
  products: Product[],
  requestedItems: ReturnType<typeof mergeRequestedItems>,
  sale: Sale,
  user: { id: string; name: string }
): StockMovement[] {
  return requestedItems.flatMap((requested) => {
    const product = products.find((item) => item.id === requested.productId);
    const variant = product
      ? getProductVariants(product).find((item) => item.id === requested.variantId)
      : null;
    const saleItem = sale.items.find(
      (item) => item.productId === requested.productId && item.variantId === requested.variantId
    );

    if (!product || !variant || !saleItem) return [];

    return [{
      id: crypto.randomUUID(),
      productId: product.id,
      variantId: variant.id,
      sku: variant.sku,
      productName: product.name,
      variantName: variant.name,
      type: "SALE" as const,
      quantity: -requested.quantity,
      stockBefore: variant.stock,
      stockAfter: variant.stock - requested.quantity,
      unitCost: saleItem.cost,
      referenceType: "SALE",
      referenceId: sale.id,
      referenceNo: sale.saleNo,
      userId: user.id,
      userName: user.name,
      branchId: sale.branchId,
      createdAt: sale.createdAt
    }];
  });
}

function buildRequestedReturnItems(
  sale: Sale,
  previousReturns: SaleReturn[],
  formData: FormData
): SaleReturnItem[] {
  return sale.items.flatMap((item, index) => {
    const alreadyReturned = previousReturns
      .flatMap((saleReturn) => saleReturn.items)
      .filter(
        (returned) =>
          returned.productId === item.productId && returned.variantId === item.variantId
      )
      .reduce((sum, returned) => sum + returned.quantity, 0);
    const available = Math.max(0, item.quantity - alreadyReturned);
    const requested = Math.min(
      available,
      Math.max(0, Math.round(Number(formData.get(`returnQty-${index}`) ?? 0)))
    );

    if (!requested) return [];

    return [{
      productId: item.productId,
      variantId: item.variantId,
      name: item.name,
      variantName: item.variantName,
      sku: item.sku,
      quantity: requested,
      price: item.price,
      cost: item.cost
    }];
  });
}

function calculateRefundAmount(sale: Sale, items: SaleReturnItem[]) {
  return calculateSaleRefund(sale, items);
}

function isSaleFullyReturned(sale: Sale, saleReturns: SaleReturn[]) {
  return sale.items.every((item) => {
    const returned = saleReturns
      .flatMap((saleReturn) => saleReturn.items)
      .filter(
        (entry) =>
          entry.productId === item.productId && entry.variantId === item.variantId
      )
      .reduce((sum, entry) => sum + entry.quantity, 0);

    return returned >= item.quantity;
  });
}

function buildLocalRestockMovements(
  products: Product[],
  items: SaleItem[],
  context: {
    type: "SALE_RETURN" | "EXCHANGE";
    referenceType: string;
    referenceId: string;
    referenceNo?: string | null;
    reason?: string | null;
    userId: string;
    userName: string;
    createdAt: Date;
  }
): StockMovement[] {
  return items.flatMap((item) => {
    const product = products.find((entry) => entry.id === item.productId);
    const variant = product
      ? getProductVariants(product).find((entry) => entry.id === item.variantId)
      : null;
    if (!product || !variant) return [];

    return [{
      id: crypto.randomUUID(),
      productId: product.id,
      variantId: item.variantId,
      sku: item.sku,
      productName: item.name,
      variantName: item.variantName,
      type: context.type,
      quantity: item.quantity,
      stockBefore: variant.stock,
      stockAfter: variant.stock + item.quantity,
      unitCost: item.cost,
      referenceType: context.referenceType,
      referenceId: context.referenceId,
      referenceNo: context.referenceNo,
      reason: context.reason,
      userId: context.userId,
      userName: context.userName,
      createdAt: context.createdAt
    }];
  });
}

function isCountedSale(sale: Sale) {
  return isActiveSale(sale);
}

function effectiveSaleAmount(sale: Sale) {
  return Math.max(0, sale.netAmount - (sale.refundAmount ?? 0));
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
  return value === "TRANSFER" || value === "OTHER" || value === "SPLIT"
    ? value
    : "CASH";
}

function parseSaleStatus(value: FormDataEntryValue | null): SaleStatus | null {
  return value === "CANCELLED" || value === "RETURNED" ? value : null;
}

function parsePaymentFilter(value?: PosSaleHistoryFilters["paymentMethod"]) {
  return value === "CASH" || value === "TRANSFER" || value === "OTHER" || value === "SPLIT"
    ? value
    : "ALL";
}

function buildUniqueSaleNumber(date: Date, sequence: number, idempotencyKey: string) {
  const suffix = idempotencyKey.replace(/[^a-z0-9]/gi, "").slice(-4).toUpperCase();
  return `${buildReadableNumber("POS", date, sequence)}-${suffix}`;
}

function normalizePayments(payments?: SalePayment[]): SalePayment[] {
  if (!Array.isArray(payments)) return [];

  return payments
    .map((payment) => ({
      method:
        payment.method === "TRANSFER" || payment.method === "OTHER"
          ? payment.method
          : "CASH" as const,
      amount: Math.max(0, Math.round(Number(payment.amount ?? 0))),
      reference: String(payment.reference ?? "").trim() || null
    }))
    .filter((payment) => payment.amount > 0)
    .slice(0, 3);
}

function getDateRange(value?: string) {
  if (!value) {
    return null;
  }

  const match = /^(\d{4})-(\d{2})-(\d{2})$/.exec(value);

  if (!match) {
    return null;
  }

  const start = new Date(`${value}T00:00:00+07:00`);
  if (Number.isNaN(start.getTime()) || formatLaoDateInput(start) !== value) return null;
  const end = new Date(start.getTime() + 86_400_000);

  return { start, end };
}

function isSameDay(date: Date, target: Date) {
  return formatLaoDateInput(new Date(date)) === formatLaoDateInput(target);
}

function revalidatePosPaths() {
  revalidatePath("/pos/shifts");
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

function revalidatePosSalePaths() {
  revalidatePath("/pos/shifts");
  revalidatePath("/pos/closing");
  revalidatePath("/pos");
  revalidatePath("/pos/history");
  revalidatePath("/products");
  revalidatePath("/stock-alerts");
  revalidatePath("/alerts");
}
