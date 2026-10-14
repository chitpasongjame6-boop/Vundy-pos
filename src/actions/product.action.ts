"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { readLocalStore, updateLocalStore } from "@/lib/local-store";
import { saveUploadedImage } from "@/lib/object-storage";
import { ProductImageError } from "@/lib/product-image";
import { parseExpiryDate } from "@/lib/product-expiry";
import { getProductVariants } from "@/lib/utils";
import { getCategories } from "@/actions/settings.action";
import { requireAuthenticatedUser, requireOwner } from "@/lib/auth";
import type { Product, ProductVariant, ProductFormState } from "@/types";

const hasDatabase = Boolean(process.env.DATABASE_URL);

export async function getProducts(filters?: {
  search?: string;
  category?: string;
  activeOnly?: boolean;
  limit?: number;
}) {
  await requireAuthenticatedUser();
  const limit = normalizeLimit(filters?.limit);

  if (!hasDatabase) {
    const store = await readLocalStore();

    const filtered = store.products.filter((product) => {
      const search = filters?.search?.toLowerCase().trim();
      const matchesSearch = search
        ? product.name.toLowerCase().includes(search) ||
          product.sku.toLowerCase().includes(search) ||
          getProductVariants(product).some((variant) =>
            variant.sku.toLowerCase().includes(search)
          )
        : true;
      const matchesCategory = filters?.category
        ? product.category === filters.category
        : true;
      const matchesActive = filters?.activeOnly ? product.isActive : true;

      return matchesSearch && matchesCategory && matchesActive;
    });

    return limit ? filtered.slice(0, limit) : filtered;
  }

  const products = (await prisma.product.findMany({
    where: {
      isActive: filters?.activeOnly ? true : undefined,
      category: filters?.category || undefined
    },
    orderBy: { updatedAt: "desc" },
    take: filters?.search ? undefined : limit
  })) as unknown as Product[];

  const search = filters?.search?.toLowerCase().trim();

  if (!search) {
    return products;
  }

  const filteredProducts = products.filter(
    (product) =>
      product.name.toLowerCase().includes(search) ||
      product.sku.toLowerCase().includes(search) ||
      getProductVariants(product).some((variant) =>
        variant.sku.toLowerCase().includes(search)
      )
  );

  return limit ? filteredProducts.slice(0, limit) : filteredProducts;
}

function normalizeLimit(value?: number) {
  if (!value) {
    return undefined;
  }

  return Math.min(Math.max(Math.floor(value), 1), 200);
}

export async function getProductCategories() {
  await requireAuthenticatedUser();
  return getCategories();
}

export async function createProduct(formData: FormData) {
  await requireOwner();
  const expiryError = validateExpiryFields(formData);
  if (expiryError) return { ok: false, message: expiryError };
  const variants = parseProductVariants(formData);
  const firstVariant = variants[0];
  const payload = {
    name: String(formData.get("name") ?? "").trim(),
    sku: firstVariant?.sku ?? "",
    category: String(formData.get("category") ?? "").trim(),
    costPrice: firstVariant?.costPrice ?? 0,
    sellPrice: firstVariant?.sellPrice ?? 0,
    stock: variants.reduce((sum, variant) => sum + variant.stock, 0),
    lowStockAlert: firstVariant?.lowStockAlert ?? 0,
    isActive: formData.get("isActive") === "on",
    variants
  };

  if (!payload.name || !payload.sku || !payload.category) {
    return { ok: false, message: "ກະລຸນາປ້ອນຊື່ສິນຄ້າ ໝວດໝູ່ ແລະ variant ຢ່າງໜ້ອຍ 1 ລາຍການ" };
  }

  if (variants.some((variant) => variant.sellPrice < variant.costPrice)) {
    return { ok: false, message: "ລາຄາຂາຍຄວນຫຼາຍກວ່າ ຫຼື ເທົ່າກັບຕົ້ນທຶນ" };
  }

  if (hasDuplicateVariantSku(variants)) {
    return { ok: false, message: "SKU / Barcode ຊໍ້າກັນໃນຟອມ" };
  }

  const conflictingSku = await findExistingSkuConflict(variants);

  if (conflictingSku) {
    return { ok: false, message: `SKU / Barcode ${conflictingSku} ມີແລ້ວ` };
  }

  let imageUrl: string | null;
  try {
    imageUrl = await saveProductImage(formData.get("productImage"));
  } catch (error) {
    if (error instanceof ProductImageError) return { ok: false, message: error.message };
    throw error;
  }

  if (!hasDatabase) {
    const now = new Date();
    const product = {
      id: crypto.randomUUID(),
      ...payload,
      imageUrl,
      createdAt: now,
      updatedAt: now
    };

    await updateLocalStore((store) => ({
      ...store,
      products: [product, ...store.products],
      categories: [...new Set([...store.categories, product.category])]
    }));

    revalidatePath("/products");
    revalidatePath("/products/new");
    revalidatePath("/dashboard");
    revalidatePath("/stock-alerts");
    revalidatePath("/alerts");
    revalidatePath("/barcodes");

    return { ok: true, message: "ບັນທຶກສິນຄ້າໃນໂໝດທົດສອບແລ້ວ" };
  }

  await prisma.product.create({ data: { ...payload, imageUrl } });
  revalidatePath("/products");
  revalidatePath("/dashboard");
  revalidatePath("/stock-alerts");
  revalidatePath("/alerts");
  revalidatePath("/barcodes");

  return { ok: true, message: "ເພີ່ມສິນຄ້າສໍາເລັດ" };
}

export async function submitCreateProduct(
  _state: ProductFormState,
  formData: FormData
): Promise<ProductFormState> {
  const result = await createProduct(formData);

  if (result.ok) {
    redirect("/products");
  }
  return result;
}

async function saveProductImage(value: FormDataEntryValue | null) {
  return saveUploadedImage(value, {
    folder: "products",
    fileNamePrefix: "product",
    compressToWebp: true
  });
}

function validateExpiryFields(formData: FormData) {
  try {
    formData.getAll("variantExpiryDate").forEach(parseExpiryDate);
    return null;
  } catch {
    return "ວັນໝົດອາຍຸບໍ່ຖືກຕ້ອງ ກະລຸນາເລືອກວັນໃໝ່";
  }
}

function parseProductVariants(formData: FormData): ProductVariant[] {
  const names = formData.getAll("variantName").map((value) => String(value).trim());
  const skus = formData.getAll("variantSku").map((value) => String(value).trim());
  const units = formData.getAll("variantUnit").map((value) => String(value).trim());
  const costs = formData.getAll("variantCostPrice");
  const prices = formData.getAll("variantSellPrice");
  const stocks = formData.getAll("variantStock");
  const alerts = formData.getAll("variantLowStockAlert");
  const expiryDates = formData.getAll("variantExpiryDate");

  return names
    .map((name, index) => ({
      id: crypto.randomUUID(),
      name,
      sku: skus[index] || "",
      unit: units[index] || null,
      costPrice: Number(costs[index] ?? 0),
      sellPrice: Number(prices[index] ?? 0),
      stock: Number(stocks[index] ?? 0),
      lowStockAlert: Number(alerts[index] ?? 0),
      expiryDate: parseExpiryDate(expiryDates[index])
    }))
    .filter((variant) => variant.name && variant.sku);
}

export async function updateProductStock(productId: string, quantity: number) {
  await requireOwner();
  if (!hasDatabase) {
    await updateLocalStore((store) => ({
      ...store,
      products: store.products.map((product) =>
        product.id === productId
          ? {
              ...product,
              stock: product.stock + quantity,
              variants: product.variants?.length
                ? product.variants.map((variant, index) =>
                    index === 0
                      ? { ...variant, stock: variant.stock + quantity }
                      : variant
                  )
                : product.variants,
              updatedAt: new Date()
            }
          : product
      )
    }));
    revalidatePath("/products");
    revalidatePath("/dashboard");

    return { ok: true, message: "ປັບສະຕ໋ອກໃນໂໝດທົດສອບແລ້ວ" };
  }

  await prisma.product.update({
    where: { id: productId },
    data: { stock: { increment: quantity } }
  });
  revalidatePath("/products");
  revalidatePath("/dashboard");

  return { ok: true, message: "ປັບສະຕ໋ອກສໍາເລັດ" };
}

export async function updateProductVariantStock(formData: FormData): Promise<void> {
  await requireOwner();
  const productId = String(formData.get("productId") ?? "");
  const variantId = String(formData.get("variantId") ?? "");
  const quantity = Number(formData.get("quantity") ?? 0);

  if (!productId || !variantId || quantity === 0) {
    return;
  }

  if (!hasDatabase) {
    await updateLocalStore((store) => ({
      ...store,
      products: store.products.map((product) => {
        if (product.id !== productId) {
          return product;
        }

        const variants = getProductVariants(product).map((variant) =>
          variant.id === variantId
            ? { ...variant, stock: Math.max(0, variant.stock + quantity) }
            : variant
        );

        return {
          ...product,
          variants,
          stock: variants.reduce((sum, variant) => sum + variant.stock, 0),
          updatedAt: new Date()
        };
      })
    }));
    revalidatePath("/products");
    revalidatePath("/dashboard");
    revalidatePath("/stock-alerts");
    revalidatePath("/alerts");
    return;
  }

  const product = await prisma.product.findUnique({ where: { id: productId } });

  if (!product) {
    return;
  }

  const variants = getProductVariants(product as unknown as Product).map((variant) =>
    variant.id === variantId
      ? { ...variant, stock: Math.max(0, variant.stock + quantity) }
      : variant
  );

  await prisma.product.update({
    where: { id: productId },
    data: {
      variants,
      stock: variants.reduce((sum, variant) => sum + variant.stock, 0)
    }
  });

  revalidatePath("/products");
  revalidatePath("/dashboard");
  revalidatePath("/stock-alerts");
  revalidatePath("/alerts");
}

export async function updateProductInfo(
  _state: ProductFormState,
  formData: FormData
): Promise<ProductFormState> {
  await requireOwner();
  const expiryError = validateExpiryFields(formData);
  if (expiryError) return { ok: false, message: expiryError };
  const productId = String(formData.get("productId") ?? "");
  const currentImageUrl = String(formData.get("currentImageUrl") ?? "").trim() || null;
  const variants = parseExistingProductVariants(formData);
  const firstVariant = variants[0];
  const payload = {
    name: String(formData.get("name") ?? "").trim(),
    category: String(formData.get("category") ?? "").trim(),
    isActive: formData.get("isActive") === "on",
    variants,
    sku: firstVariant?.sku ?? "",
    costPrice: firstVariant?.costPrice ?? 0,
    sellPrice: firstVariant?.sellPrice ?? 0,
    stock: variants.reduce((sum, variant) => sum + variant.stock, 0),
    lowStockAlert: firstVariant?.lowStockAlert ?? 0
  };

  if (!productId || !payload.name || !payload.category || !payload.sku) {
    return { ok: false, message: "ກະລຸນາປ້ອນຊື່ ໝວດໝູ່ ແລະ SKU ໃຫ້ຄົບ" };
  }

  if (variants.some((variant) => variant.sellPrice < variant.costPrice)) {
    return { ok: false, message: "ລາຄາຂາຍຕ້ອງບໍ່ຕໍ່າກວ່າຕົ້ນທຶນ" };
  }

  if (hasDuplicateVariantSku(variants)) {
    return { ok: false, message: "SKU / Barcode ຊ້ຳກັນໃນຟອມ" };
  }

  const conflictingSku = await findExistingSkuConflict(variants, productId);

  if (conflictingSku) {
    return { ok: false, message: `SKU / Barcode ${conflictingSku} ມີແລ້ວ` };
  }

  let imageUrl: string | null;
  try {
    imageUrl = (await saveProductImage(formData.get("productImage"))) ?? currentImageUrl;
  } catch (error) {
    if (error instanceof ProductImageError) return { ok: false, message: error.message };
    throw error;
  }

  if (!hasDatabase) {
    await updateLocalStore((store) => ({
      ...store,
      products: store.products.map((product) =>
        product.id === productId
          ? {
              ...product,
              ...payload,
              imageUrl,
              updatedAt: new Date()
            }
          : product
      ),
      categories: [...new Set([...store.categories, payload.category])]
    }));
    revalidatePath("/products");
    revalidatePath("/products/new");
    revalidatePath("/dashboard");
    revalidatePath("/alerts");
    revalidatePath("/stock-alerts");
    return { ok: true, message: "ບັນທຶກການແກ້ໄຂແລ້ວ" };
  }

  await prisma.product.update({
    where: { id: productId },
    data: { ...payload, imageUrl }
  });

  revalidatePath("/products");
  revalidatePath("/products/new");
  revalidatePath("/dashboard");
  revalidatePath("/alerts");
  revalidatePath("/stock-alerts");
  return { ok: true, message: "ບັນທຶກການແກ້ໄຂແລ້ວ" };
}

export async function deleteProduct(productId: string) {
  await requireOwner();
  if (!hasDatabase) {
    await updateLocalStore((store) => ({
      ...store,
      products: store.products.map((product) =>
        product.id === productId
          ? { ...product, isActive: false, updatedAt: new Date() }
          : product
      )
    }));
    revalidatePath("/products");
    revalidatePath("/dashboard");

    return { ok: true, message: "ປິດການຂາຍສິນຄ້າໃນໂໝດທົດສອບແລ້ວ" };
  }

  await prisma.product.update({
    where: { id: productId },
    data: { isActive: false }
  });
  revalidatePath("/products");

  return { ok: true, message: "ປິດການຂາຍສິນຄ້າແລ້ວ" };
}

function parseExistingProductVariants(formData: FormData): ProductVariant[] {
  const ids = formData.getAll("variantId").map((value) => String(value).trim());
  const names = formData.getAll("variantName").map((value) => String(value).trim());
  const skus = formData.getAll("variantSku").map((value) => String(value).trim());
  const units = formData.getAll("variantUnit").map((value) => String(value).trim());
  const costs = formData.getAll("variantCostPrice");
  const prices = formData.getAll("variantSellPrice");
  const stocks = formData.getAll("variantStock");
  const alerts = formData.getAll("variantLowStockAlert");
  const expiryDates = formData.getAll("variantExpiryDate");

  return names
    .map((name, index) => ({
      id: ids[index] || crypto.randomUUID(),
      name,
      sku: skus[index] || "",
      unit: units[index] || null,
      costPrice: Number(costs[index] ?? 0),
      sellPrice: Number(prices[index] ?? 0),
      stock: Number(stocks[index] ?? 0),
      lowStockAlert: Number(alerts[index] ?? 0),
      expiryDate: parseExpiryDate(expiryDates[index])
    }))
    .filter((variant) => variant.name && variant.sku);
}

function normalizeSku(sku: string) {
  return sku.trim().toLowerCase();
}

function hasDuplicateVariantSku(variants: ProductVariant[]) {
  const seen = new Set<string>();

  for (const variant of variants) {
    const sku = normalizeSku(variant.sku);

    if (!sku) {
      continue;
    }

    if (seen.has(sku)) {
      return true;
    }

    seen.add(sku);
  }

  return false;
}

async function findExistingSkuConflict(
  variants: ProductVariant[],
  excludeProductId?: string
) {
  const incomingSkus = new Set(
    variants.map((variant) => normalizeSku(variant.sku)).filter(Boolean)
  );

  if (!incomingSkus.size) {
    return null;
  }

  const products = hasDatabase
    ? ((await prisma.product.findMany()) as unknown as Product[])
    : (await readLocalStore()).products;

  for (const product of products) {
    if (product.id === excludeProductId) {
      continue;
    }

    for (const variant of getProductVariants(product)) {
      if (incomingSkus.has(normalizeSku(variant.sku))) {
        return variant.sku;
      }
    }
  }

  return null;
}

export async function deleteProductFromForm(formData: FormData): Promise<void> {
  const productId = String(formData.get("productId") ?? "");

  if (!productId) {
    return;
  }

  await deleteProduct(productId);
}
