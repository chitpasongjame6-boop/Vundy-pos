"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { readLocalStore, updateLocalStore } from "@/lib/local-store";
import { saveUploadedImage } from "@/lib/object-storage";
import { ProductImageError } from "@/lib/product-image";
import { downloadCatalogImage, verifyCatalogProduct } from "@/lib/product-catalog.server";
import type { CatalogAttribution } from "@/lib/product-catalog";
import { parseExpiryDate } from "@/lib/product-expiry";
import { moneyInteger, parsePurchaseCost } from "@/lib/currency";
import { getProductVariants } from "@/lib/utils";
import { getCategories } from "@/actions/settings.action";
import { requireAuthenticatedUser, requireOwner } from "@/lib/auth";
import type { Product, ProductVariant, ProductFormState, StockMovement } from "@/types";

const hasDatabase = Boolean(process.env.DATABASE_URL);

export async function getProducts(filters?: {
  search?: string;
  category?: string;
  activeOnly?: boolean;
  limit?: number;
}) {
  const user = await requireAuthenticatedUser();
  const visible = (products: Product[]) => user?.role === "STAFF" ? products.map(product => ({ ...product, costPrice: 0,
    variants: product.variants?.map(variant => ({ ...variant, costPrice: 0, purchaseCurrency: null, purchaseAmountMinor: null, purchaseRate: null })) })) : products;
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

    return visible(limit ? filtered.slice(0, limit) : filtered);
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
    return visible(products);
  }

  const filteredProducts = products.filter(
    (product) =>
      product.name.toLowerCase().includes(search) ||
      product.sku.toLowerCase().includes(search) ||
      getProductVariants(product).some((variant) =>
        variant.sku.toLowerCase().includes(search)
      )
  );

  return visible(limit ? filteredProducts.slice(0, limit) : filteredProducts);
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
  const owner = await requireOwner();
  const expiryError = validateExpiryFields(formData);
  if (expiryError) return { ok: false, message: expiryError };
  let variants: ProductVariant[];
  try { variants = parseProductVariants(formData); }
  catch (error) { return { ok: false, message: error instanceof Error ? error.message : "ຕົ້ນທຶນບໍ່ຖືກຕ້ອງ" }; }
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
  let catalogSource: CatalogAttribution | undefined;
  try {
    const token = String(formData.get("catalogToken") ?? "");
    const catalog = token ? verifyCatalogProduct(token) : null;
    if (catalog && catalog.barcode !== firstVariant.sku) {
      return { ok: false, message: "Barcode ປ່ຽນແລ້ວ ກະລຸນາຍົກເລີກຂໍ້ມູນທີ່ດຶງມາ ແລະ ຄົ້ນຫາໃໝ່" };
    }
    const upload = formData.get("productImage");
    const hasUpload = upload instanceof File && upload.size > 0;
    const imageImported = Boolean(catalog?.imageUrl && !hasUpload && formData.get("catalogUseImage") === "on");
    const image = catalog && imageImported ? await downloadCatalogImage(catalog) : upload;
    imageUrl = await saveProductImage(image);
    if (catalog) catalogSource = {
      provider: catalog.provider, barcode: catalog.barcode, sourceUrl: catalog.sourceUrl,
      retrievedAt: catalog.retrievedAt, imageImported
    };
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
      catalogSource,
      createdAt: now,
      updatedAt: now
    };

    await updateLocalStore((store) => ({
      ...store,
      products: [product, ...store.products],
      stockMovements: [...openingMovements(product, owner), ...(store.stockMovements ?? [])],
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

  await prisma.$transaction(async tx => {
    const product = await tx.product.create({ data: { ...payload, imageUrl, catalogSource } }) as unknown as Product;
    await tx.category.upsert({ where: { name: payload.category }, update: { isActive: true }, create: { name: payload.category } });
    const movements = openingMovements(product, owner).map(movement => ({ ...movement, id: undefined }));
    if (movements.length) await tx.stockMovement.createMany({ data: movements });
  });
  revalidatePath("/products");
  revalidatePath("/products/new");
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
  const currencies = formData.getAll("variantCostCurrency");
  const amounts = formData.getAll("variantCostAmount");
  const rates = formData.getAll("variantCostRate");
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
      ...parsePurchaseCost(currencies[index], amounts[index] ?? costs[index] ?? 0, rates[index]),
      sellPrice: moneyInteger(Number(prices[index] ?? 0)),
      stock: moneyInteger(Number(stocks[index] ?? 0)),
      lowStockAlert: moneyInteger(Number(alerts[index] ?? 0)),
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
  let variants: ProductVariant[];
  try { variants = parseExistingProductVariants(formData); }
  catch (error) { return { ok: false, message: error instanceof Error ? error.message : "ຈໍານວນບໍ່ຖືກຕ້ອງ" }; }
  // Editing labels/prices must not drop the purchase snapshot or replace the
  // weighted-average cost with the most recent purchase price.
  const original = hasDatabase
    ? await prisma.product.findUnique({ where: { id: productId } }) as unknown as Product | null
    : (await readLocalStore()).products.find(product => product.id === productId);
  if (!original) return { ok: false, message: "ບໍ່ພົບສິນຄ້າ" };
  variants = variants.map(variant => {
    const old = getProductVariants(original).find(item => item.id === variant.id);
    return old && old.costPrice === variant.costPrice
      ? { ...variant, purchaseCurrency: old.purchaseCurrency, purchaseAmountMinor: old.purchaseAmountMinor, purchaseRate: old.purchaseRate }
      : { ...variant, purchaseCurrency: "LAK", purchaseAmountMinor: variant.costPrice, purchaseRate: null };
  });
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

  const uploadedImage = formData.get("productImage");
  const catalogSource = original.catalogSource && uploadedImage instanceof File && uploadedImage.size > 0
    ? { ...original.catalogSource, imageImported: false } : original.catalogSource;

  if (!hasDatabase) {
    await updateLocalStore((store) => ({
      ...store,
      products: store.products.map((product) =>
        product.id === productId
          ? {
              ...product,
              ...payload,
              imageUrl,
              catalogSource,
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
    data: { ...payload, imageUrl, catalogSource }
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
      costPrice: moneyInteger(Number(costs[index] ?? 0)),
      sellPrice: moneyInteger(Number(prices[index] ?? 0)),
      stock: moneyInteger(Number(stocks[index] ?? 0)),
      lowStockAlert: moneyInteger(Number(alerts[index] ?? 0)),
      expiryDate: parseExpiryDate(expiryDates[index])
    }))
    .filter((variant) => variant.name && variant.sku);
}

function normalizeSku(sku: string) {
  return sku.trim().toLowerCase();
}

function openingMovements(product: Product, owner: { id: string; name: string }): StockMovement[] {
  return getProductVariants(product).filter(variant => variant.stock > 0).map(variant => ({
    id: crypto.randomUUID(), productId: product.id, variantId: variant.id,
    sku: variant.sku, productName: product.name, variantName: variant.name,
    type: "OPENING", quantity: variant.stock, stockBefore: 0, stockAfter: variant.stock,
    unitCost: variant.costPrice, purchaseCurrency: variant.purchaseCurrency,
    purchaseAmountMinor: variant.purchaseAmountMinor, purchaseRate: variant.purchaseRate,
    referenceType: "PRODUCT", referenceId: product.id, reason: "ສະຕ໋ອກເລີ່ມຕົ້ນ",
    userId: owner.id, userName: owner.name, createdAt: product.createdAt
  }));
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
