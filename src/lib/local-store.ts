import { mkdir, readFile, writeFile } from "fs/promises";
import { dirname, join } from "path";
import { mockOrders, mockProducts } from "@/lib/mock-data";
import type {
  DailyClosing,
  Member,
  MemberTier,
  Order,
  Product,
  Sale,
  StoreSettings
} from "@/types";

type LocalStore = {
  products: Product[];
  orders: Order[];
  sales: Sale[];
  dailyClosings: DailyClosing[];
  members: Member[];
  memberTiers: MemberTier[];
  categories: string[];
  storeSettings: StoreSettings;
};

const storePath = join(process.cwd(), ".local-data", "stock-order-store.json");
const defaultCategories = ["ເຄື່ອງດື່ມ", "ອາຫານ", "ຂອງຂວັນ", "ຊຸດສິນຄ້າ"];
const defaultShippingCompanies = ["ຮຸ່ງອາລຸນ", "ອານຸສິດ", "ມີໄຊ", "Unitel"];
const defaultStoreSettings: StoreSettings = {
  storeName: "VUNDY Beauty & Cosmetice",
  storeSubtitle: "",
  storeNote: "",
  logoUrl: "/vundy-logo.jpeg",
  posReceiptName: "VUNDY Beauty & Cosmetice",
  posReceiptSubtitle: "",
  posReceiptNote: "",
  posReceiptLogoUrl: "/vundy-logo.jpeg",
  orderBillSize: "LABEL_100X150",
  posReceiptSize: "POS_80MM",
  shippingCompanies: defaultShippingCompanies
};
const defaultMemberTiers: MemberTier[] = [
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
      discount: sale.discount ?? 0,
      netAmount: sale.netAmount ?? sale.totalAmount,
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
        defaultShippingCompanies
    }
  };
}

function initialStore(): LocalStore {
  const products = cloneWithDates(mockProducts);
  const orders = cloneWithDates(mockOrders);
  const categories = [
    ...new Set([...defaultCategories, ...mockProducts.map((product) => product.category)])
  ].filter(Boolean);

  return hydrateStore({
    products,
    orders,
    sales: [],
    dailyClosings: [],
    members: [],
    memberTiers: defaultMemberTiers,
    categories,
    storeSettings: defaultStoreSettings
  });
}

export async function readLocalStore(): Promise<LocalStore> {
  try {
    const raw = await readFile(storePath, "utf8");
    return hydrateStore(JSON.parse(raw) as LocalStore);
  } catch {
    const store = initialStore();
    await writeLocalStore(store);
    return store;
  }
}

export async function writeLocalStore(store: LocalStore) {
  await mkdir(dirname(storePath), { recursive: true });
  await writeFile(storePath, JSON.stringify(store, null, 2), "utf8");
}

export async function updateLocalStore(
  updater: (store: LocalStore) => LocalStore | Promise<LocalStore>
) {
  const current = await readLocalStore();
  const next = await updater(current);
  await writeLocalStore(next);
  return next;
}
