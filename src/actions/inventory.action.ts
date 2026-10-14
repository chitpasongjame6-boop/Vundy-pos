"use server";

import { revalidatePath } from "next/cache";
import type { Prisma } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import { readLocalStore, updateLocalStore } from "@/lib/local-store";
import { requireOwner } from "@/lib/auth";
import { buildReadableNumber } from "@/lib/document-number";
import { getProductVariants } from "@/lib/utils";
import type {
  AuditLog,
  Branch,
  Expense,
  Product,
  PurchaseOrder,
  PurchaseOrderItem,
  Register,
  StockMovement,
  StockMovementType,
  Supplier
} from "@/types";

const hasDatabase = Boolean(process.env.DATABASE_URL);

export async function getInventoryWorkspace() {
  await requireOwner();

  if (!hasDatabase) {
    const store = await readLocalStore();
    return {
      products: store.products,
      suppliers: store.suppliers,
      purchaseOrders: store.purchaseOrders.slice(0, 50),
      movements: store.stockMovements.slice(0, 100),
      auditLogs: store.auditLogs.slice(0, 100),
      branches: store.branches,
      registers: store.registers,
      expenses: store.expenses.slice(0, 50)
    };
  }

  const [products, suppliers, purchaseOrders, movements, auditLogs, branches, registers, expenses] =
    await Promise.all([
      prisma.product.findMany({ orderBy: { updatedAt: "desc" } }),
      prisma.supplier.findMany({ orderBy: { updatedAt: "desc" } }),
      prisma.purchaseOrder.findMany({ orderBy: { createdAt: "desc" }, take: 50 }),
      prisma.stockMovement.findMany({ orderBy: { createdAt: "desc" }, take: 100 }),
      prisma.auditLog.findMany({ orderBy: { createdAt: "desc" }, take: 100 }),
      prisma.branch.findMany({ orderBy: { name: "asc" } }),
      prisma.register.findMany({ orderBy: { name: "asc" } }),
      prisma.expense.findMany({ orderBy: { expenseAt: "desc" }, take: 50 })
    ]);

  return {
    products: products as unknown as Product[],
    suppliers: suppliers as unknown as Supplier[],
    purchaseOrders: purchaseOrders as unknown as PurchaseOrder[],
    movements: movements as unknown as StockMovement[],
    auditLogs: auditLogs as unknown as AuditLog[],
    branches: branches as unknown as Branch[],
    registers: registers as unknown as Register[],
    expenses: expenses as unknown as Expense[]
  };
}

export async function createExpense(formData: FormData): Promise<void> {
  const user = await requireOwner();
  const category = String(formData.get("category") ?? "").trim();
  const description = String(formData.get("description") ?? "").trim();
  const amount = parsePositive(formData.get("amount"));
  const paymentMethod = formData.get("paymentMethod") === "TRANSFER" ? "TRANSFER" : formData.get("paymentMethod") === "OTHER" ? "OTHER" : "CASH";
  if (!category || !description || !amount) return;
  const now = new Date();

  if (!hasDatabase) {
    await updateLocalStore((store) => {
      const shift = store.cashShifts.find((item) => item.cashierId === user.id && item.status === "OPEN");
      const expense: Expense = {
        id: crypto.randomUUID(), expenseNo: buildReadableNumber("EXP", now, store.expenses.length + 1),
        category, amount, paymentMethod, description,
        note: String(formData.get("note") ?? "").trim() || null,
        shiftId: shift?.id ?? null, userId: user.id, userName: user.name,
        expenseAt: now, createdAt: now, updatedAt: now
      };
      return {
        ...store,
        expenses: [expense, ...store.expenses],
        cashMovements: paymentMethod === "CASH" && shift ? [{
          id: crypto.randomUUID(), shiftId: shift.id, type: "CASH_OUT", amount,
          reason: `ຄ່າໃຊ້ຈ່າຍ: ${description}`, note: expense.note,
          userId: user.id, userName: user.name, createdAt: now
        }, ...store.cashMovements] : store.cashMovements,
        auditLogs: [makeAudit(user, "EXPENSE_CREATED", "EXPENSE", expense.id, expense.expenseNo, description, { amount, category, paymentMethod }), ...store.auditLogs]
      };
    });
  } else {
    await prisma.$transaction(async (tx) => {
      const shift = await tx.cashShift.findFirst({ where: { cashierId: user.id, status: "OPEN" }, orderBy: { openedAt: "desc" } });
      const expenseNo = buildReadableNumber("EXP", now, (await tx.expense.count()) + 1);
      const expense = await tx.expense.create({ data: {
        expenseNo, category, amount, paymentMethod, description,
        note: String(formData.get("note") ?? "").trim() || null,
        shiftId: shift?.id ?? null, userId: user.id, userName: user.name, expenseAt: now
      } });
      if (paymentMethod === "CASH" && shift) {
        await tx.cashMovement.create({ data: {
          shiftId: shift.id, type: "CASH_OUT", amount,
          reason: `ຄ່າໃຊ້ຈ່າຍ: ${description}`, note: expense.note,
          userId: user.id, userName: user.name
        } });
      }
      await tx.auditLog.create({ data: makeAuditData(user, "EXPENSE_CREATED", "EXPENSE", expense.id, expenseNo, description, { amount, category, paymentMethod }) });
    });
  }
  revalidateInventoryPaths();
  revalidatePath("/reports");
}

export async function getExpenses() {
  await requireOwner();
  if (!hasDatabase) return (await readLocalStore()).expenses;
  return (await prisma.expense.findMany({ orderBy: { expenseAt: "desc" } })) as unknown as Expense[];
}

export async function createSupplier(formData: FormData): Promise<void> {
  const user = await requireOwner();
  const name = String(formData.get("name") ?? "").trim();
  if (!name) return;
  const now = new Date();
  const code = String(formData.get("code") ?? "").trim() || `SUP-${Date.now().toString().slice(-8)}`;
  const supplier: Supplier = {
    id: crypto.randomUUID(), code, name,
    phone: String(formData.get("phone") ?? "").trim() || null,
    address: String(formData.get("address") ?? "").trim() || null,
    note: String(formData.get("note") ?? "").trim() || null,
    isActive: true, createdAt: now, updatedAt: now
  };

  if (!hasDatabase) {
    await updateLocalStore((store) => ({ ...store, suppliers: [supplier, ...store.suppliers] }));
  } else {
    await prisma.supplier.create({ data: { ...supplier, id: undefined } });
  }
  await writeSimpleAudit(user, "SUPPLIER_CREATED", "SUPPLIER", supplier.id, code, `ເພີ່ມຜູ້ສະໜອງ ${name}`);
  revalidateInventoryPaths();
}

export async function createPurchaseOrder(formData: FormData): Promise<void> {
  const user = await requireOwner();
  const supplierId = String(formData.get("supplierId") ?? "").trim();
  const [productId, variantId] = String(formData.get("productVariant") ?? "").split("::");
  const quantity = parsePositive(formData.get("quantity"));
  const unitCost = parsePositive(formData.get("unitCost"));
  if (!supplierId || !productId || !variantId || !quantity) return;
  const now = new Date();

  if (!hasDatabase) {
    await updateLocalStore((store) => {
      const supplier = store.suppliers.find((item) => item.id === supplierId && item.isActive);
      const product = store.products.find((item) => item.id === productId);
      const variant = product ? getProductVariants(product).find((item) => item.id === variantId) : null;
      if (!supplier || !product || !variant) return store;
      const item = buildPurchaseItem(product, variant, quantity, unitCost || variant.costPrice);
      const purchase: PurchaseOrder = {
        id: crypto.randomUUID(),
        purchaseNo: buildReadableNumber("PO", now, store.purchaseOrders.length + 1),
        supplierId, supplierName: supplier.name, status: "ORDERED", items: [item],
        totalCost: item.quantityOrdered * item.unitCost,
        note: String(formData.get("note") ?? "").trim() || null,
        orderedAt: now, createdById: user.id, createdByName: user.name,
        createdAt: now, updatedAt: now
      };
      return {
        ...store,
        purchaseOrders: [purchase, ...store.purchaseOrders],
        auditLogs: [makeAudit(user, "PURCHASE_CREATED", "PURCHASE_ORDER", purchase.id, purchase.purchaseNo, `ສ້າງໃບສັ່ງຊື້ ${supplier.name}`, { totalCost: purchase.totalCost }), ...store.auditLogs]
      };
    });
  } else {
    await prisma.$transaction(async (tx) => {
      const [supplier, product] = await Promise.all([
        tx.supplier.findUnique({ where: { id: supplierId } }),
        tx.product.findUnique({ where: { id: productId } })
      ]);
      const typedProduct = product as unknown as Product | null;
      const variant = typedProduct ? getProductVariants(typedProduct).find((item) => item.id === variantId) : null;
      if (!supplier || !typedProduct || !variant) return;
      const item = buildPurchaseItem(typedProduct, variant, quantity, unitCost || variant.costPrice);
      const purchaseNo = buildReadableNumber("PO", now, (await tx.purchaseOrder.count()) + 1);
      const purchase = await tx.purchaseOrder.create({
        data: {
          purchaseNo, supplierId, supplierName: supplier.name, status: "ORDERED",
          items: [item], totalCost: item.quantityOrdered * item.unitCost,
          note: String(formData.get("note") ?? "").trim() || null,
          orderedAt: now, createdById: user.id, createdByName: user.name
        }
      });
      await tx.auditLog.create({ data: makeAuditData(user, "PURCHASE_CREATED", "PURCHASE_ORDER", purchase.id, purchaseNo, `ສ້າງໃບສັ່ງຊື້ ${supplier.name}`, { totalCost: purchase.totalCost }) });
    });
  }
  revalidateInventoryPaths();
}

export async function receivePurchaseOrder(formData: FormData): Promise<void> {
  const user = await requireOwner();
  const purchaseId = String(formData.get("purchaseId") ?? "").trim();
  if (!purchaseId) return;
  const now = new Date();

  if (!hasDatabase) {
    await updateLocalStore((store) => {
      const purchase = store.purchaseOrders.find((item) => item.id === purchaseId);
      if (!purchase || purchase.status === "RECEIVED" || purchase.status === "CANCELLED") return store;
      const { products, movements } = receiveItemsLocally(store.products, purchase, user, now);
      return {
        ...store,
        products,
        stockMovements: [...movements, ...store.stockMovements],
        purchaseOrders: store.purchaseOrders.map((item) => item.id === purchase.id ? {
          ...item, status: "RECEIVED", items: item.items.map((line) => ({ ...line, quantityReceived: line.quantityOrdered })),
          receivedAt: now, receivedById: user.id, receivedByName: user.name, updatedAt: now
        } : item),
        auditLogs: [makeAudit(user, "PURCHASE_RECEIVED", "PURCHASE_ORDER", purchase.id, purchase.purchaseNo, `ຮັບສິນຄ້າ ${purchase.purchaseNo}`, { itemCount: purchase.items.length }), ...store.auditLogs]
      };
    });
  } else {
    await prisma.$transaction(async (tx) => {
      const purchase = (await tx.purchaseOrder.findUnique({ where: { id: purchaseId } })) as unknown as PurchaseOrder | null;
      if (!purchase || purchase.status === "RECEIVED" || purchase.status === "CANCELLED") return;
      for (const line of purchase.items) {
        const product = (await tx.product.findUnique({ where: { id: line.productId } })) as unknown as Product | null;
        if (!product) continue;
        const before = getProductVariants(product).find((variant) => variant.id === line.variantId);
        if (!before) continue;
        const received = Math.max(0, line.quantityOrdered - line.quantityReceived);
        if (!received) continue;
        const variants = getProductVariants(product).map((variant) => variant.id === line.variantId ? {
          ...variant, stock: variant.stock + received, costPrice: line.unitCost
        } : variant);
        await tx.product.update({
          where: { id: product.id },
          data: {
            variants, stock: variants.reduce((sum, variant) => sum + variant.stock, 0),
            costPrice: variants[0]?.costPrice ?? product.costPrice
          }
        });
        await tx.stockMovement.create({ data: {
          productId: product.id, variantId: line.variantId, sku: line.sku,
          productName: line.name, variantName: line.variantName,
          type: "PURCHASE_RECEIPT", quantity: received,
          stockBefore: before.stock, stockAfter: before.stock + received, unitCost: line.unitCost,
          referenceType: "PURCHASE_ORDER", referenceId: purchase.id,
          referenceNo: purchase.purchaseNo, userId: user.id, userName: user.name
        } });
      }
      await tx.purchaseOrder.update({ where: { id: purchase.id }, data: {
        status: "RECEIVED", items: purchase.items.map((line) => ({ ...line, quantityReceived: line.quantityOrdered })),
        receivedAt: now, receivedById: user.id, receivedByName: user.name
      } });
      await tx.auditLog.create({ data: makeAuditData(user, "PURCHASE_RECEIVED", "PURCHASE_ORDER", purchase.id, purchase.purchaseNo, `ຮັບສິນຄ້າ ${purchase.purchaseNo}`, { itemCount: purchase.items.length }) });
    });
  }
  revalidateInventoryPaths();
}

export async function adjustInventory(formData: FormData): Promise<void> {
  const user = await requireOwner();
  const [productId, variantId] = String(formData.get("productVariant") ?? "").split("::");
  const operation = String(formData.get("operation") ?? "ADJUSTMENT_IN") as StockMovementType;
  const quantity = parsePositive(formData.get("quantity"));
  const reason = String(formData.get("reason") ?? "").trim();
  const note = String(formData.get("note") ?? "").trim() || null;
  const allowed: StockMovementType[] = ["ADJUSTMENT_IN", "ADJUSTMENT_OUT", "DAMAGED"];
  if (!productId || !variantId || !quantity || !reason || !allowed.includes(operation)) return;
  const direction = operation === "ADJUSTMENT_IN" ? 1 : -1;
  const now = new Date();

  if (!hasDatabase) {
    await updateLocalStore((store) => {
      const product = store.products.find((item) => item.id === productId);
      const variant = product ? getProductVariants(product).find((item) => item.id === variantId) : null;
      if (!product || !variant || variant.stock + direction * quantity < 0) return store;
      const movement = buildMovement(product, variant, operation, direction * quantity, reason, note, user, now);
      return {
        ...store,
        products: store.products.map((item) => item.id === product.id ? updateVariantStock(item, variantId, direction * quantity) : item),
        stockMovements: [movement, ...store.stockMovements],
        auditLogs: [makeAudit(user, "STOCK_ADJUSTED", "PRODUCT", product.id, variant.sku, reason, { quantity: direction * quantity, operation }), ...store.auditLogs]
      };
    });
  } else {
    await prisma.$transaction(async (tx) => {
      const product = (await tx.product.findUnique({ where: { id: productId } })) as unknown as Product | null;
      const variant = product ? getProductVariants(product).find((item) => item.id === variantId) : null;
      if (!product || !variant || variant.stock + direction * quantity < 0) return;
      const updated = updateVariantStock(product, variantId, direction * quantity);
      await tx.product.update({ where: { id: product.id }, data: { variants: updated.variants, stock: updated.stock } });
      const movement = buildMovement(product, variant, operation, direction * quantity, reason, note, user, now);
      await tx.stockMovement.create({ data: { ...movement, id: undefined, createdAt: undefined } });
      await tx.auditLog.create({ data: makeAuditData(user, "STOCK_ADJUSTED", "PRODUCT", product.id, variant.sku, reason, { quantity: direction * quantity, operation }) });
    });
  }
  revalidateInventoryPaths();
}

export async function createBranch(formData: FormData): Promise<void> {
  const user = await requireOwner();
  const name = String(formData.get("name") ?? "").trim();
  const code = String(formData.get("code") ?? "").trim().toUpperCase();
  if (!name || !code) return;
  const now = new Date();
  const branch: Branch = { id: crypto.randomUUID(), code, name, address: String(formData.get("address") ?? "").trim() || null, phone: String(formData.get("phone") ?? "").trim() || null, isActive: true, createdAt: now, updatedAt: now };
  if (!hasDatabase) await updateLocalStore((store) => ({ ...store, branches: [branch, ...store.branches] }));
  else await prisma.branch.create({ data: { ...branch, id: undefined } });
  await writeSimpleAudit(user, "BRANCH_CREATED", "BRANCH", branch.id, code, `ເພີ່ມສາຂາ ${name}`);
  revalidateInventoryPaths();
}

export async function createRegister(formData: FormData): Promise<void> {
  const user = await requireOwner();
  const branchId = String(formData.get("branchId") ?? "").trim();
  const name = String(formData.get("name") ?? "").trim();
  const code = String(formData.get("code") ?? "").trim().toUpperCase();
  if (!branchId || !name || !code) return;
  const now = new Date();
  const register: Register = { id: crypto.randomUUID(), branchId, code, name, isActive: true, createdAt: now, updatedAt: now };
  if (!hasDatabase) await updateLocalStore((store) => ({ ...store, registers: [register, ...store.registers] }));
  else await prisma.register.create({ data: { ...register, id: undefined } });
  await writeSimpleAudit(user, "REGISTER_CREATED", "REGISTER", register.id, code, `ເພີ່ມເຄື່ອງ POS ${name}`);
  revalidateInventoryPaths();
}

function buildPurchaseItem(product: Product, variant: ReturnType<typeof getProductVariants>[number], quantity: number, unitCost: number): PurchaseOrderItem {
  return { productId: product.id, variantId: variant.id, name: product.name, variantName: variant.name, sku: variant.sku, quantityOrdered: quantity, quantityReceived: 0, unitCost };
}

function receiveItemsLocally(products: Product[], purchase: PurchaseOrder, user: { id: string; name: string }, now: Date) {
  const movements: StockMovement[] = [];
  let nextProducts = products;
  for (const line of purchase.items) {
    const product = nextProducts.find((item) => item.id === line.productId);
    const variant = product ? getProductVariants(product).find((item) => item.id === line.variantId) : null;
    const received = Math.max(0, line.quantityOrdered - line.quantityReceived);
    if (!product || !variant || !received) continue;
    movements.push({
      id: crypto.randomUUID(), productId: product.id, variantId: variant.id, sku: variant.sku,
      productName: product.name, variantName: variant.name, type: "PURCHASE_RECEIPT",
      quantity: received, stockBefore: variant.stock, stockAfter: variant.stock + received,
      unitCost: line.unitCost, referenceType: "PURCHASE_ORDER", referenceId: purchase.id,
      referenceNo: purchase.purchaseNo, userId: user.id, userName: user.name, createdAt: now
    });
    nextProducts = nextProducts.map((item) => item.id === product.id ? updateVariantStock(item, variant.id, received, line.unitCost) : item);
  }
  return { products: nextProducts, movements };
}

function updateVariantStock(product: Product, variantId: string, delta: number, newCost?: number): Product {
  const variants = getProductVariants(product).map((variant) => variant.id === variantId ? { ...variant, stock: variant.stock + delta, costPrice: newCost ?? variant.costPrice } : variant);
  return { ...product, variants, stock: variants.reduce((sum, variant) => sum + variant.stock, 0), costPrice: variants[0]?.costPrice ?? product.costPrice, updatedAt: new Date() };
}

function buildMovement(product: Product, variant: ReturnType<typeof getProductVariants>[number], type: StockMovementType, quantity: number, reason: string, note: string | null, user: { id: string; name: string }, now: Date): StockMovement {
  return { id: crypto.randomUUID(), productId: product.id, variantId: variant.id, sku: variant.sku, productName: product.name, variantName: variant.name, type, quantity, stockBefore: variant.stock, stockAfter: variant.stock + quantity, unitCost: variant.costPrice, referenceType: "ADJUSTMENT", reason, note, userId: user.id, userName: user.name, createdAt: now };
}

function makeAudit(user: { id: string; name: string; role: string }, action: string, entityType: string, entityId: string, entityNo: string | null | undefined, description: string, metadata?: Record<string, unknown>): AuditLog {
  return {
    id: crypto.randomUUID(), action, entityType, entityId, entityNo: entityNo ?? null,
    description, userId: user.id, userName: user.name, userRole: user.role,
    metadata: metadata ?? null, createdAt: new Date()
  };
}

function makeAuditData(user: { id: string; name: string; role: string }, action: string, entityType: string, entityId: string, entityNo: string | null | undefined, description: string, metadata?: Record<string, unknown>): Prisma.AuditLogCreateInput {
  return {
    action, entityType, entityId, entityNo: entityNo ?? null, description,
    userId: user.id, userName: user.name, userRole: user.role,
    metadata: metadata as Prisma.InputJsonObject | undefined
  };
}

async function writeSimpleAudit(user: { id: string; name: string; role: string }, action: string, entityType: string, entityId: string, entityNo: string, description: string) {
  if (!hasDatabase) {
    await updateLocalStore((store) => ({ ...store, auditLogs: [makeAudit(user, action, entityType, entityId, entityNo, description), ...store.auditLogs] }));
  } else {
    await prisma.auditLog.create({ data: makeAuditData(user, action, entityType, entityId, entityNo, description) });
  }
}

function parsePositive(value: FormDataEntryValue | null) {
  return Math.max(0, Math.round(Number(String(value ?? "0").replace(/[^\d.-]/g, "")) || 0));
}

function revalidateInventoryPaths() {
  revalidatePath("/inventory"); revalidatePath("/products"); revalidatePath("/stock-alerts");
  revalidatePath("/alerts"); revalidatePath("/dashboard"); revalidatePath("/pos");
}
