import { prisma } from "@/lib/prisma";
import { requireOwner } from "@/lib/auth";
import {
  defaultStoreSettings,
  readLocalStore,
  updateLocalStore,
  type LocalStore
} from "@/lib/local-store";

const hasDatabase = Boolean(process.env.DATABASE_URL);

export async function GET() {
  await requireOwner();
  const data = hasDatabase ? await readDatabaseBackup() : await readLocalStore();
  const payload = {
    version: 1,
    exportedAt: new Date().toISOString(),
    source: hasDatabase ? "mongodb" : "local",
    data
  };
  const date = new Date().toISOString().slice(0, 10);

  return Response.json(payload, {
    headers: {
      "content-disposition": `attachment; filename="vundy-pos-backup-${date}.json"`,
      "cache-control": "no-store"
    }
  });
}

export async function POST(request: Request) {
  await requireOwner();
  let payload: { version?: number; data?: unknown };

  try {
    payload = await request.json();
  } catch {
    return Response.json({ ok: false, message: "ໄຟລ໌ JSON ບໍ່ຖືກຕ້ອງ" }, { status: 400 });
  }

  if (payload.version !== 1 || !isBackupData(payload.data)) {
    return Response.json({ ok: false, message: "ຮູບແບບ Backup ບໍ່ຖືກຕ້ອງ" }, { status: 400 });
  }

  if (!hasDatabase) {
    await updateLocalStore(() => payload.data as LocalStore);
  } else {
    await restoreDatabase(payload.data);
  }

  return Response.json({ ok: true, message: "ກູ້ຄືນຂໍ້ມູນສໍາເລັດ" });
}

async function readDatabaseBackup() {
  const [
    products, orders, sales, dailyClosings, members, memberTiers, categories,
    settings, branches, registers, cashShifts, cashMovements, saleReturns,
    stockMovements, auditLogs, suppliers, purchaseOrders, expenses, promotions
  ] = await Promise.all([
    prisma.product.findMany(), prisma.order.findMany(), prisma.sale.findMany(),
    prisma.dailyClosing.findMany(), prisma.member.findMany(), prisma.memberTier.findMany(),
    prisma.category.findMany(), prisma.storeSettingsRecord.findUnique({ where: { id: "default" } }),
    prisma.branch.findMany(), prisma.register.findMany(), prisma.cashShift.findMany(),
    prisma.cashMovement.findMany(), prisma.saleReturn.findMany(), prisma.stockMovement.findMany(),
    prisma.auditLog.findMany(), prisma.supplier.findMany(), prisma.purchaseOrder.findMany(),
    prisma.expense.findMany(), prisma.promotion.findMany()
  ]);
  return {
    products, orders, sales, dailyClosings, members, memberTiers,
    categories: categories.filter((item) => item.isActive).map((item) => item.name),
    storeSettings: settings ?? defaultStoreSettings,
    branches, registers, cashShifts, cashMovements, saleReturns, stockMovements,
    auditLogs, suppliers, purchaseOrders, expenses, promotions
  };
}

async function restoreDatabase(data: LocalStore) {
  await prisma.$transaction(async (tx) => {
    await tx.promotion.deleteMany({});
    if (data.promotions?.length) await tx.promotion.createMany({ data: data.promotions as never });
    await tx.cashMovement.deleteMany({}); await tx.cashShift.deleteMany({});
    await tx.saleReturn.deleteMany({}); await tx.stockMovement.deleteMany({});
    await tx.auditLog.deleteMany({}); await tx.purchaseOrder.deleteMany({});
    await tx.expense.deleteMany({});
    await tx.supplier.deleteMany({}); await tx.register.deleteMany({});
    await tx.branch.deleteMany({}); await tx.dailyClosing.deleteMany({});
    await tx.member.deleteMany({}); await tx.order.deleteMany({});
    await tx.sale.deleteMany({}); await tx.product.deleteMany({});
    await tx.category.deleteMany({});

    if (data.products.length) await tx.product.createMany({ data: data.products as never });
    if (data.orders.length) await tx.order.createMany({ data: data.orders as never });
    if (data.sales.length) await tx.sale.createMany({ data: data.sales as never });
    if (data.dailyClosings.length) await tx.dailyClosing.createMany({ data: data.dailyClosings as never });
    if (data.members.length) await tx.member.createMany({ data: data.members as never });
    if (data.memberTiers.length) await tx.memberTier.createMany({ data: data.memberTiers as never });
    if (data.categories.length) await tx.category.createMany({ data: data.categories.map((name) => ({ name })) });
    if (data.branches.length) await tx.branch.createMany({ data: data.branches as never });
    if (data.registers.length) await tx.register.createMany({ data: data.registers as never });
    if (data.cashShifts.length) await tx.cashShift.createMany({ data: data.cashShifts as never });
    if (data.cashMovements.length) await tx.cashMovement.createMany({ data: data.cashMovements as never });
    if (data.saleReturns.length) await tx.saleReturn.createMany({ data: data.saleReturns as never });
    if (data.stockMovements.length) await tx.stockMovement.createMany({ data: data.stockMovements as never });
    if (data.auditLogs.length) await tx.auditLog.createMany({ data: data.auditLogs as never });
    if (data.suppliers.length) await tx.supplier.createMany({ data: data.suppliers as never });
    if (data.purchaseOrders.length) await tx.purchaseOrder.createMany({ data: data.purchaseOrders as never });
    if ((data.expenses ?? []).length) await tx.expense.createMany({ data: data.expenses as never });
    await tx.storeSettingsRecord.upsert({
      where: { id: "default" },
      update: data.storeSettings,
      create: { id: "default", ...data.storeSettings }
    });
  });
}

function isBackupData(value: unknown): value is LocalStore {
  if (!value || typeof value !== "object") return false;
  const data = value as Partial<LocalStore>;
  return Array.isArray(data.products) && Array.isArray(data.orders) &&
    Array.isArray(data.sales) && Array.isArray(data.members) &&
    Boolean(data.storeSettings && typeof data.storeSettings === "object");
}
