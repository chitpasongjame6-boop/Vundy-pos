import { mkdir, readFile, rename, writeFile } from "fs/promises";
import { dirname, join } from "path";
import { mockOrders, mockProducts } from "@/lib/mock-data";
import type {
  AuditLog,
  Branch,
  CashMovement,
  CashShift,
  DailyClosing,
  Expense,
  Member,
  MemberTier,
  Order,
  Product,
  Promotion,
  PurchaseOrder,
  Register,
  Sale,
  SaleReturn,
  StockMovement,
  StoreSettings,
  Supplier
} from "@/types";

export type LocalStore = {
  promotions: Promotion[];
  products: Product[];
  orders: Order[];
  sales: Sale[];
  dailyClosings: DailyClosing[];
  members: Member[];
  memberTiers: MemberTier[];
  categories: string[];
  storeSettings: StoreSettings;
  branches: Branch[];
  registers: Register[];
  cashShifts: CashShift[];
  cashMovements: CashMovement[];
  saleReturns: SaleReturn[];
  stockMovements: StockMovement[];
  auditLogs: AuditLog[];
  suppliers: Supplier[];
  purchaseOrders: PurchaseOrder[];
  expenses: Expense[];
};

const storePath = process.env.VERCEL
  ? join("/tmp", "stock-order-store.json")
  : join(process.cwd(), ".local-data", "stock-order-store.json");
let updateQueue: Promise<void> = Promise.resolve();
const defaultCategories = ["ເຄື່ອງດື່ມ", "ອາຫານ", "ຂອງຂວັນ", "ຊຸດສິນຄ້າ"];
const defaultShippingCompanies = ["ຮຸ່ງອາລຸນ", "ອານຸສິດ", "ມີໄຊ", "Unitel"];
export const defaultStoreSettings: StoreSettings = {
  storeName: "VUNDY Beauty & Cosmetice",
  storeSubtitle: "",
  storeNote: "",
  logoUrl: "/vundy-logo.png",
  posReceiptName: "VUNDY Beauty & Cosmetice",
  posReceiptSubtitle: "",
  posReceiptNote: "",
  posReceiptLogoUrl: "/vundy-logo.png",
  orderBillSize: "LABEL_100X150",
  posReceiptSize: "POS_80MM",
  shippingCompanies: defaultShippingCompanies,
  taxEnabled: false,
  taxRate: 0,
  taxId: "",
  receiptAddress: "",
  defaultBranchName: "ຮ້ານຫຼັກ",
  defaultRegisterName: "ເຄື່ອງ 1",
  staffMaxDiscountPercent: 0,
  requireShiftForSale: false
};
export const defaultMemberTiers: MemberTier[] = [
  {
    id: "tier-general",
    name: "ທົ່ວໄປ",
    minSpend: 0,
    discountPercent: 0,
    isActive: true
  },
  {
    id: "tier-vip",
    name: "VIP",
    minSpend: 500000,
    discountPercent: 5,
    isActive: true
  },
  {
    id: "tier-vvip",
    name: "VVIP",
    minSpend: 2000000,
    discountPercent: 10,
    isActive: true
  }
];

function cloneWithDates<T>(value: T): T {
  return JSON.parse(JSON.stringify(value));
}

function hydrateStore(store: LocalStore): LocalStore {
  return {
    promotions: store.promotions ?? [],
    products: store.products.map((product) => ({
      ...product,
      createdAt: new Date(product.createdAt),
      updatedAt: new Date(product.updatedAt)
    })),
    orders: store.orders.map((order) => ({
      ...order,
      orderNo: order.orderNo ?? null,
      paymentStatus: order.paymentStatus ?? "PAID",
      returnReason: order.returnReason ?? null,
      returnNote: order.returnNote ?? null,
      returnedAt: order.returnedAt ? new Date(order.returnedAt) : null,
      restockedAt: order.restockedAt ? new Date(order.restockedAt) : null,
      createdAt: new Date(order.createdAt),
      updatedAt: new Date(order.updatedAt)
    })),
    sales: (store.sales ?? []).map((sale) => ({
      ...sale,
      saleNo: sale.saleNo ?? null,
      cashierId: sale.cashierId ?? null,
      cashierName: sale.cashierName ?? null,
      memberId: sale.memberId ?? null,
      memberName: sale.memberName ?? null,
      memberPhone: sale.memberPhone ?? null,
      memberTierName: sale.memberTierName ?? null,
      memberDiscount: sale.memberDiscount ?? null,
      status: sale.status ?? "ACTIVE",
      paymentMethod: sale.paymentMethod ?? "CASH",
      payments: sale.payments ?? [],
      paymentReference: sale.paymentReference ?? null,
      discount: sale.discount ?? 0,
      netAmount: sale.netAmount ?? sale.totalAmount,
      taxRate: sale.taxRate ?? 0,
      taxAmount: sale.taxAmount ?? 0,
      refundAmount: sale.refundAmount ?? 0,
      returnedCost: sale.returnedCost ?? 0,
      voidReason: sale.voidReason ?? null,
      voidNote: sale.voidNote ?? null,
      voidedAt: sale.voidedAt ? new Date(sale.voidedAt) : null,
      restockedAt: sale.restockedAt ? new Date(sale.restockedAt) : null,
      createdAt: new Date(sale.createdAt),
      updatedAt: new Date(sale.updatedAt)
    })),
    dailyClosings: (store.dailyClosings ?? []).map((closing) => ({
      ...closing,
      closingNo: closing.closingNo ?? null,
      closedAt: new Date(closing.closedAt),
      createdAt: new Date(closing.createdAt),
      updatedAt: new Date(closing.updatedAt)
    })),
    branches: (store.branches ?? []).map(hydrateCreatedUpdated),
    registers: (store.registers ?? []).map(hydrateCreatedUpdated),
    cashShifts: (store.cashShifts ?? []).map((shift) => ({
      ...hydrateCreatedUpdated(shift),
      openedAt: new Date(shift.openedAt),
      closedAt: shift.closedAt ? new Date(shift.closedAt) : null
    })),
    cashMovements: (store.cashMovements ?? []).map((movement) => ({
      ...movement,
      createdAt: new Date(movement.createdAt)
    })),
    expenses: (store.expenses ?? []).map((expense) => ({
      ...hydrateCreatedUpdated(expense),
      expenseAt: new Date(expense.expenseAt)
    })),
    saleReturns: (store.saleReturns ?? []).map((saleReturn) => ({
      ...saleReturn,
      createdAt: new Date(saleReturn.createdAt)
    })),
    stockMovements: (store.stockMovements ?? []).map((movement) => ({
      ...movement,
      createdAt: new Date(movement.createdAt)
    })),
    auditLogs: (store.auditLogs ?? []).map((log) => ({
      ...log,
      createdAt: new Date(log.createdAt)
    })),
    suppliers: (store.suppliers ?? []).map(hydrateCreatedUpdated),
    purchaseOrders: (store.purchaseOrders ?? []).map((purchase) => ({
      ...hydrateCreatedUpdated(purchase),
      orderedAt: purchase.orderedAt ? new Date(purchase.orderedAt) : null,
      receivedAt: purchase.receivedAt ? new Date(purchase.receivedAt) : null
    })),
    members: (store.members ?? []).map((member) => ({
      ...member,
      isActive: member.isActive ?? true,
      createdAt: new Date(member.createdAt),
      updatedAt: new Date(member.updatedAt)
    })),
    memberTiers: (store.memberTiers ?? defaultMemberTiers).map((tier) => ({
      ...tier,
      isActive: tier.isActive ?? true,
      minSpend: Math.max(0, Math.round(Number(tier.minSpend ?? 0))),
      discountPercent: Math.max(0, Math.round(Number(tier.discountPercent ?? 0)))
    })),
    categories: store.categories,
    storeSettings: {
      ...defaultStoreSettings,
      ...store.storeSettings,
      shippingCompanies:
        store.storeSettings?.shippingCompanies?.filter(Boolean) ??
        defaultShippingCompanies,
      taxEnabled: store.storeSettings?.taxEnabled ?? false,
      taxRate: Math.min(100, Math.max(0, Math.round(store.storeSettings?.taxRate ?? 0))),
      staffMaxDiscountPercent: Math.min(
        100,
        Math.max(0, Math.round(store.storeSettings?.staffMaxDiscountPercent ?? 0))
      ),
      requireShiftForSale: store.storeSettings?.requireShiftForSale ?? false
    }
  };
}

function hydrateCreatedUpdated<T extends { createdAt: Date; updatedAt: Date }>(value: T): T {
  return {
    ...value,
    createdAt: new Date(value.createdAt),
    updatedAt: new Date(value.updatedAt)
  };
}

function initialStore(): LocalStore {
  const products = cloneWithDates(mockProducts);
  const orders = cloneWithDates(mockOrders);
  const categories = [
    ...new Set([...defaultCategories, ...mockProducts.map((product) => product.category)])
  ].filter(Boolean);

  return hydrateStore({
    promotions: [],
    products,
    orders,
    sales: [],
    dailyClosings: [],
    members: [],
    memberTiers: defaultMemberTiers,
    categories,
    storeSettings: defaultStoreSettings,
    branches: [],
    registers: [],
    cashShifts: [],
    cashMovements: [],
    saleReturns: [],
    stockMovements: [],
    auditLogs: [],
    suppliers: [],
    purchaseOrders: [],
    expenses: []
  });
}

export async function readLocalStore(): Promise<LocalStore> {
  try {
    const raw = await readFile(storePath, "utf8");
    return hydrateStore(JSON.parse(raw) as LocalStore);
  } catch (error) {
    if ((error as NodeJS.ErrnoException).code !== "ENOENT") {
      throw error;
    }

    const store = initialStore();

    try {
      await writeLocalStore(store);
    } catch {
      // Some serverless filesystems are read-only outside /tmp. The app can still
      // continue with defaults when the local fallback store cannot be persisted.
    }

    return store;
  }
}

export async function writeLocalStore(store: LocalStore) {
  await mkdir(dirname(storePath), { recursive: true });
  const temporaryPath = `${storePath}.${crypto.randomUUID()}.tmp`;

  await writeFile(temporaryPath, JSON.stringify(store, null, 2), "utf8");
  await rename(temporaryPath, storePath);
}

export function updateLocalStore(
  updater: (store: LocalStore) => LocalStore | Promise<LocalStore>
) {
  const update = updateQueue.then(async () => {
    const current = await readLocalStore();
    const next = await updater(current);

    try {
      await writeLocalStore(next);
    } catch (error) {
      if (!process.env.VERCEL) {
        throw error;
      }
    }

    return next;
  });

  updateQueue = update.then(
    () => undefined,
    () => undefined
  );

  return update;
}
