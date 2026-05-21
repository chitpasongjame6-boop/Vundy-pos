"use server";

import { revalidatePath } from "next/cache";
import { prisma } from "@/lib/prisma";
import { readLocalStore, updateLocalStore } from "@/lib/local-store";
import { saveUploadedImage } from "@/lib/object-storage";
import type { StoreSettings } from "@/types";

const hasDatabase = Boolean(process.env.DATABASE_URL);

export async function getCategories() {
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
  const store = await readLocalStore();

  return store.storeSettings;
}

export async function updateStoreSettings(formData: FormData): Promise<void> {
  const storeName =
    String(formData.get("storeName") ?? "").trim() ||
    "VUNDY Beauty & Cosmetice";
  const storeSubtitle = String(formData.get("storeSubtitle") ?? "").trim();
  const storeNote = String(formData.get("storeNote") ?? "").trim();
  const current = await getStoreSettings();
  const uploadedLogo = await saveStoreLogo(formData.get("storeLogo"));

  await updateLocalStore((store) => ({
    ...store,
    storeSettings: {
      ...store.storeSettings,
      storeName,
      storeSubtitle,
      storeNote,
      logoUrl: uploadedLogo ?? current.logoUrl
    }
  }));

  revalidatePath("/settings");
  revalidatePath("/settings/bill-preview");
  revalidatePath("/orders");
  revalidatePath("/orders/history");
}

export async function updatePosReceiptSettings(formData: FormData): Promise<void> {
  const posReceiptName =
    String(formData.get("posReceiptName") ?? "").trim() ||
    "VUNDY Beauty & Cosmetice";
  const posReceiptSubtitle = String(formData.get("posReceiptSubtitle") ?? "").trim();
  const posReceiptNote = String(formData.get("posReceiptNote") ?? "").trim();
  const current = await getStoreSettings();
  const uploadedLogo = await saveStoreLogo(formData.get("posReceiptLogo"));

  await updateLocalStore((store) => ({
    ...store,
    storeSettings: {
      ...store.storeSettings,
      posReceiptName,
      posReceiptSubtitle,
      posReceiptNote,
      posReceiptLogoUrl: uploadedLogo ?? current.posReceiptLogoUrl
    }
  }));

  revalidatePath("/settings");
  revalidatePath("/pos");
}

export async function updateBillSizeSettings(formData: FormData): Promise<void> {
  const orderBillSize =
    formData.get("orderBillSize") === "A4" ? "A4" : "LABEL_100X150";
  const posReceiptSize =
    formData.get("posReceiptSize") === "POS_58MM" ? "POS_58MM" : "POS_80MM";

  await updateLocalStore((store) => ({
    ...store,
    storeSettings: {
      ...store.storeSettings,
      orderBillSize,
      posReceiptSize
    }
  }));

  revalidatePath("/settings");
  revalidatePath("/settings/bill-preview");
  revalidatePath("/settings/pos-bill-preview");
  revalidatePath("/orders");
  revalidatePath("/orders/history");
  revalidatePath("/pos");
  revalidatePath("/pos/history");
}

export async function createShippingCompany(formData: FormData): Promise<void> {
  const name = String(formData.get("name") ?? "").trim();

  if (!name) {
    return;
  }

  await updateLocalStore((store) => ({
    ...store,
    storeSettings: {
      ...store.storeSettings,
      shippingCompanies: [
        ...new Set([...(store.storeSettings.shippingCompanies ?? []), name])
      ]
    }
  }));

  revalidateShippingSettingsPaths();
}

export async function updateShippingCompany(formData: FormData): Promise<void> {
  const oldName = String(formData.get("oldName") ?? "").trim();
  const name = String(formData.get("name") ?? "").trim();

  if (!oldName || !name) {
    return;
  }

  await updateLocalStore((store) => {
    const nextCompanies = (store.storeSettings.shippingCompanies ?? []).map(
      (company) => (company === oldName ? name : company)
    );

    return {
      ...store,
      storeSettings: {
        ...store.storeSettings,
        shippingCompanies: [...new Set(nextCompanies)]
      }
    };
  });

  revalidateShippingSettingsPaths();
}

export async function deleteShippingCompany(formData: FormData): Promise<void> {
  const name = String(formData.get("oldName") ?? formData.get("name") ?? "").trim();

  if (!name) {
    return;
  }

  await updateLocalStore((store) => ({
    ...store,
    storeSettings: {
      ...store.storeSettings,
      shippingCompanies: (store.storeSettings.shippingCompanies ?? []).filter(
        (company) => company !== name
      )
    }
  }));

  revalidateShippingSettingsPaths();
}

export async function clearAllBusinessData(formData: FormData): Promise<void> {
  const confirmText = String(formData.get("confirmText") ?? "").trim();

  if (confirmText !== "DELETE") {
    return;
  }

  if (hasDatabase) {
    await prisma.order.deleteMany({});
    await prisma.sale.deleteMany({});
    await prisma.product.deleteMany({});
    await prisma.category.deleteMany({});
  } else {
    await updateLocalStore((store) => ({
      ...store,
      products: [],
      orders: [],
      sales: [],
      dailyClosings: [],
      members: [],
      categories: []
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
