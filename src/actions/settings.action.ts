"use server";

import { revalidatePath } from "next/cache";
import { prisma } from "@/lib/prisma";
import {
  defaultStoreSettings,
  readLocalStore,
  updateLocalStore
} from "@/lib/local-store";
import { saveUploadedImage } from "@/lib/object-storage";
import { requireAuthenticatedUser, requireOwner } from "@/lib/auth";
import type { StoreSettings } from "@/types";
import { parseDecimal } from "@/lib/currency";

const hasDatabase = Boolean(process.env.DATABASE_URL);

export async function updateCurrencySettings(_state: { ok: boolean | null; message: string }, formData: FormData) {
  const owner = await requireOwner();
  let rates;
  try {
    rates = {
      thbEnabled: formData.get("thbEnabled") === "on",
      thbPaymentRate: parseDecimal(formData.get("thbPaymentRate") || "0", 4),
      thbPurchaseRate: parseDecimal(formData.get("thbPurchaseRate") || "0", 4)
    };
    if (rates.thbEnabled && !rates.thbPaymentRate) throw new Error("ກະລຸນາກໍານົດເຣດຮັບເງິນບາດກ່ອນເປີດໃຊ້");
  } catch (error) {
    return { ok: false, message: error instanceof Error ? error.message : "ເຣດບໍ່ຖືກຕ້ອງ" };
  }
  const audit = {
    action: "CURRENCY_SETTINGS_UPDATED", entityType: "SETTINGS", entityId: "default",
    description: "ປ່ຽນເຣດເງິນບາດ", userId: owner.id, userName: owner.name,
    userRole: owner.role, metadata: rates
  };
  if (hasDatabase) {
    const current = await getStoreSettings();
    await prisma.$transaction(async tx => {
      await tx.storeSettingsRecord.upsert({ where: { id: "default" }, update: rates, create: { id: "default", ...current, ...rates } });
      await tx.auditLog.create({ data: audit });
    });
  } else {
    await updateLocalStore(store => ({ ...store, storeSettings: { ...store.storeSettings, ...rates },
      auditLogs: [{ ...audit, id: crypto.randomUUID(), createdAt: new Date() }, ...store.auditLogs] }));
  }
  for (const path of ["/settings", "/pos", "/products/new", "/inventory"]) revalidatePath(path);
  return { ok: true, message: "ບັນທຶກເຣດແລ້ວ · ບໍ່ປ່ຽນບິນ ແລະ ຕົ້ນທຶນຍ້ອນຫຼັງ" };
}

export async function getCategories() {
  await requireAuthenticatedUser();
  if (!hasDatabase) {
    const store = await readLocalStore();

    return [...new Set(store.categories)]
      .filter(Boolean)
      .sort((a, b) => a.localeCompare(b));
  }

  const categories = await prisma.category.findMany({
    orderBy: { name: "asc" }
  });

  return categories
    .filter((category) => category.isActive)
    .map((category) => category.name);
}

export async function createCategory(formData: FormData): Promise<void> {
  await requireOwner();
  const name = String(formData.get("name") ?? "").trim();

  if (!name) {
    return;
  }

  if (hasDatabase) {
    await prisma.category.upsert({
      where: { name },
      update: { isActive: true },
      create: { name }
    });
  } else {
    await updateLocalStore((store) => ({
      ...store,
      categories: [...new Set([...store.categories, name])]
    }));
  }

  revalidatePath("/settings");
  revalidatePath("/products");
  revalidatePath("/products/new");
  revalidatePath("/orders");
  revalidatePath("/orders/new");
}

export async function deleteCategory(formData: FormData): Promise<void> {
  await requireOwner();
  const name = String(formData.get("name") ?? "").trim();

  if (!name) {
    return;
  }

  if (hasDatabase) {
    await prisma.category.updateMany({
      where: { name },
      data: { isActive: false }
    });
  } else {
    await updateLocalStore((store) => ({
      ...store,
      categories: store.categories.filter((category) => category !== name)
    }));
  }

  revalidatePath("/settings");
  revalidatePath("/products");
  revalidatePath("/products/new");
  revalidatePath("/orders");
  revalidatePath("/orders/new");
}

export async function getStoreSettings(): Promise<StoreSettings> {
  await requireAuthenticatedUser();

  if (hasDatabase) {
    const settings = await prisma.storeSettingsRecord.findUnique({
      where: { id: "default" }
    });

    if (!settings) {
      return { ...defaultStoreSettings };
    }

    return normalizeStoreSettings(settings);
  }

  const store = await readLocalStore();

  return store.storeSettings;
}

export async function updateStoreSettings(formData: FormData): Promise<void> {
  await requireOwner();
  const storeName =
    String(formData.get("storeName") ?? "").trim() ||
    "VUNDY Beauty & Cosmetice";
  const storeSubtitle = String(formData.get("storeSubtitle") ?? "").trim();
  const storeNote = String(formData.get("storeNote") ?? "").trim();
  const current = await getStoreSettings();
  const uploadedLogo = await saveStoreLogo(formData.get("storeLogo"));

  await saveStoreSettings({
    ...current,
    storeName,
    storeSubtitle,
    storeNote,
    logoUrl: uploadedLogo ?? current.logoUrl
  });

  revalidatePath("/settings");
  revalidatePath("/settings/bill-preview");
  revalidatePath("/orders");
  revalidatePath("/orders/history");
}

export async function updatePosReceiptSettings(formData: FormData): Promise<void> {
  await requireOwner();
  const posReceiptName =
    String(formData.get("posReceiptName") ?? "").trim() ||
    "VUNDY Beauty & Cosmetice";
  const posReceiptSubtitle = String(formData.get("posReceiptSubtitle") ?? "").trim();
  const posReceiptNote = String(formData.get("posReceiptNote") ?? "").trim();
  const current = await getStoreSettings();
  const uploadedLogo = await saveStoreLogo(formData.get("posReceiptLogo"));

  await saveStoreSettings({
    ...current,
    posReceiptName,
    posReceiptSubtitle,
    posReceiptNote,
    posReceiptLogoUrl: uploadedLogo ?? current.posReceiptLogoUrl
  });

  revalidatePath("/settings");
  revalidatePath("/pos");
}

export async function updateBillSizeSettings(formData: FormData): Promise<void> {
  await requireOwner();
  const orderBillSize =
    formData.get("orderBillSize") === "A4" ? "A4" : "LABEL_100X150";
  const posReceiptSize =
    formData.get("posReceiptSize") === "POS_58MM" ? "POS_58MM" : "POS_80MM";
  const current = await getStoreSettings();

  await saveStoreSettings({ ...current, orderBillSize, posReceiptSize });

  revalidatePath("/settings");
  revalidatePath("/settings/bill-preview");
  revalidatePath("/settings/pos-bill-preview");
  revalidatePath("/orders");
  revalidatePath("/orders/history");
  revalidatePath("/pos");
  revalidatePath("/pos/history");
}

export async function updatePosOperationsSettings(formData: FormData): Promise<void> {
  await requireOwner();
  const current = await getStoreSettings();
  const taxRate = Math.min(100, Math.max(0, Math.round(Number(formData.get("taxRate") ?? 0))));

  await saveStoreSettings({
    ...current,
    taxEnabled: formData.get("taxEnabled") === "on",
    taxRate,
    taxId: String(formData.get("taxId") ?? "").trim(),
    receiptAddress: String(formData.get("receiptAddress") ?? "").trim(),
    defaultBranchName: String(formData.get("defaultBranchName") ?? "").trim(),
    defaultRegisterName: String(formData.get("defaultRegisterName") ?? "").trim(),
    staffMaxDiscountPercent: 0,
    requireShiftForSale: formData.get("requireShiftForSale") === "on"
  });

  revalidatePath("/settings");
  revalidatePath("/pos");
  revalidatePath("/pos/history");
  revalidatePath("/pos/shifts");
}

export async function createShippingCompany(formData: FormData): Promise<void> {
  await requireOwner();
  const name = String(formData.get("name") ?? "").trim();

  if (!name) {
    return;
  }
  const current = await getStoreSettings();

  await saveStoreSettings({
    ...current,
    shippingCompanies: [...new Set([...(current.shippingCompanies ?? []), name])]
  });

  revalidateShippingSettingsPaths();
}

export async function updateShippingCompany(formData: FormData): Promise<void> {
  await requireOwner();
  const oldName = String(formData.get("oldName") ?? "").trim();
  const name = String(formData.get("name") ?? "").trim();

  if (!oldName || !name) {
    return;
  }
  const current = await getStoreSettings();
  const nextCompanies = (current.shippingCompanies ?? []).map((company) =>
    company === oldName ? name : company
  );

  await saveStoreSettings({
    ...current,
    shippingCompanies: [...new Set(nextCompanies)]
  });

  revalidateShippingSettingsPaths();
}

export async function deleteShippingCompany(formData: FormData): Promise<void> {
  await requireOwner();
  const name = String(formData.get("oldName") ?? formData.get("name") ?? "").trim();

  if (!name) {
    return;
  }
  const current = await getStoreSettings();

  await saveStoreSettings({
    ...current,
    shippingCompanies: (current.shippingCompanies ?? []).filter(
      (company) => company !== name
    )
  });

  revalidateShippingSettingsPaths();
}

export async function clearAllBusinessData(formData: FormData): Promise<void> {
  await requireOwner();
  const confirmText = String(formData.get("confirmText") ?? "").trim();

  if (confirmText !== "DELETE") {
    return;
  }

  if (hasDatabase) {
    await prisma.$transaction([
      prisma.dailyClosing.deleteMany({}),
      prisma.cashMovement.deleteMany({}),
      prisma.cashShift.deleteMany({}),
      prisma.saleReturn.deleteMany({}),
      prisma.stockMovement.deleteMany({}),
      prisma.auditLog.deleteMany({}),
      prisma.expense.deleteMany({}),
      prisma.purchaseOrder.deleteMany({}),
      prisma.supplier.deleteMany({}),
      prisma.register.deleteMany({}),
      prisma.branch.deleteMany({}),
      prisma.member.deleteMany({}),
      prisma.order.deleteMany({}),
      prisma.sale.deleteMany({}),
      prisma.product.deleteMany({}),
      prisma.category.deleteMany({})
    ]);
  } else {
    await updateLocalStore((store) => ({
      ...store,
      products: [],
      orders: [],
      sales: [],
      dailyClosings: [],
      members: [],
      categories: [],
      cashShifts: [],
      cashMovements: [],
      saleReturns: [],
      stockMovements: [],
      auditLogs: [],
      suppliers: [],
      purchaseOrders: [],
      branches: [],
      registers: [],
      expenses: []
    }));
  }

  revalidatePath("/dashboard");
  revalidatePath("/products");
  revalidatePath("/products/new");
  revalidatePath("/orders");
  revalidatePath("/orders/new");
  revalidatePath("/orders/history");
  revalidatePath("/reports");
  revalidatePath("/pos");
  revalidatePath("/pos/history");
  revalidatePath("/pos/closing");
  revalidatePath("/sold-products");
  revalidatePath("/exports");
  revalidatePath("/members");
  revalidatePath("/settings");
}

function revalidateShippingSettingsPaths() {
  revalidatePath("/settings");
  revalidatePath("/orders");
  revalidatePath("/orders/new");
  revalidatePath("/orders/history");
  revalidatePath("/settings/bill-preview");
}

async function saveStoreLogo(value: FormDataEntryValue | null) {
  return saveUploadedImage(value, {
    folder: "settings",
    fileNamePrefix: "store-logo"
  });
}

async function saveStoreSettings(settings: StoreSettings) {
  if (hasDatabase) {
    await prisma.storeSettingsRecord.upsert({
      where: { id: "default" },
      update: settings,
      create: { id: "default", ...settings }
    });
    return;
  }

  await updateLocalStore((store) => ({
    ...store,
    storeSettings: settings
  }));
}

function normalizeStoreSettings(settings: {
  storeName: string;
  storeSubtitle: string;
  storeNote: string;
  logoUrl: string | null;
  posReceiptName: string;
  posReceiptSubtitle: string;
  posReceiptNote: string;
  posReceiptLogoUrl: string | null;
  orderBillSize: string;
  posReceiptSize: string;
  shippingCompanies: string[];
  taxEnabled?: boolean | null;
  taxRate?: number | null;
  taxId?: string | null;
  receiptAddress?: string | null;
  defaultBranchName?: string | null;
  defaultRegisterName?: string | null;
  staffMaxDiscountPercent?: number | null;
  requireShiftForSale?: boolean | null;
  thbEnabled?: boolean | null;
  thbPaymentRate?: number | null;
  thbPurchaseRate?: number | null;
}): StoreSettings {
  return {
    storeName: settings.storeName,
    storeSubtitle: settings.storeSubtitle,
    storeNote: settings.storeNote,
    logoUrl: settings.logoUrl,
    posReceiptName: settings.posReceiptName,
    posReceiptSubtitle: settings.posReceiptSubtitle,
    posReceiptNote: settings.posReceiptNote,
    posReceiptLogoUrl: settings.posReceiptLogoUrl,
    orderBillSize: settings.orderBillSize === "A4" ? "A4" : "LABEL_100X150",
    posReceiptSize: settings.posReceiptSize === "POS_58MM" ? "POS_58MM" : "POS_80MM",
    shippingCompanies: settings.shippingCompanies,
    taxEnabled: settings.taxEnabled ?? false,
    taxRate: settings.taxRate ?? 0,
    taxId: settings.taxId ?? "",
    receiptAddress: settings.receiptAddress ?? "",
    defaultBranchName: settings.defaultBranchName ?? "",
    defaultRegisterName: settings.defaultRegisterName ?? "",
    staffMaxDiscountPercent: settings.staffMaxDiscountPercent ?? 0,
    requireShiftForSale: settings.requireShiftForSale ?? false,
    thbEnabled: settings.thbEnabled ?? false,
    thbPaymentRate: settings.thbPaymentRate ?? 0,
    thbPurchaseRate: settings.thbPurchaseRate ?? 0
  };
}
