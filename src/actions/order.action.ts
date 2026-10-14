"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import type { Prisma } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import { readLocalStore, updateLocalStore } from "@/lib/local-store";
import { buildReadableNumber } from "@/lib/document-number";
import { requireOwner } from "@/lib/auth";
import {
  calculateOrderTotals,
  formatProductVariantName,
  getProductVariants,
  productToOrderItem
} from "@/lib/utils";
import type { Order, OrderItem, OrderStatus, PaymentStatus, Product } from "@/types";

const hasDatabase = Boolean(process.env.DATABASE_URL);

type RequestedOrderItem = {
  productId: string;
  variantId: string;
  quantity: number;
};

export async function getOrders(filters?: {
  search?: string;
  status?: OrderStatus | "ALL";
  category?: string;
  date?: string;
  limit?: number;
}) {
  await requireOwner();
  const dateRange = getDateRange(filters?.date);
  const limit = normalizeLimit(filters?.limit);

  if (!hasDatabase) {
    const store = await readLocalStore();

    const filtered = store.orders.filter((order) => {
      const search = filters?.search?.toLowerCase().trim();
      const category = filters?.category?.trim();
      const matchesSearch = search
        ? order.customerName.toLowerCase().includes(search) ||
          order.id.toLowerCase().includes(search) ||
          order.id.slice(-8).toLowerCase().includes(search) ||
          order.orderNo?.toLowerCase().includes(search) ||
          order.phone.toLowerCase().includes(search) ||
          order.items.some(
            (item) =>
              item.sku.toLowerCase().includes(search) ||
              item.name.toLowerCase().includes(search) ||
              item.category?.toLowerCase().includes(search)
          )
        : true;
      const matchesStatus =
        filters?.status && filters.status !== "ALL"
          ? order.status === filters.status
          : true;
      const matchesCategory = category
        ? order.items.some((item) => item.category === category)
        : true;
      const matchesDate = dateRange
        ? order.createdAt >= dateRange.start && order.createdAt < dateRange.end
        : true;

      return matchesSearch && matchesStatus && matchesCategory && matchesDate;
      });

    return enrichOrderItemImages(
      limit ? filtered.slice(0, limit) : filtered,
      store.products
    );
  }

  const orders = (await prisma.order.findMany({
    where: {
      status:
        filters?.status && filters.status !== "ALL" ? filters.status : undefined,
      createdAt: dateRange
        ? {
            gte: dateRange.start,
            lt: dateRange.end
          }
        : undefined,
      OR: filters?.search
        ? [
            { orderNo: { contains: filters.search, mode: "insensitive" } },
            { customerName: { contains: filters.search, mode: "insensitive" } },
            { phone: { contains: filters.search, mode: "insensitive" } }
          ]
        : undefined
    },
    orderBy: { createdAt: "desc" },
    take: filters?.category || filters?.search ? undefined : limit
  })) as Order[];

  const filteredOrders = orders.filter((order) => {
    const search = filters?.search?.toLowerCase().trim();
    const matchesSearch = search
      ? order.customerName.toLowerCase().includes(search) ||
        order.id.toLowerCase().includes(search) ||
        order.id.slice(-8).toLowerCase().includes(search) ||
        order.orderNo?.toLowerCase().includes(search) ||
        order.phone.toLowerCase().includes(search) ||
        order.items.some(
          (item) =>
            item.sku.toLowerCase().includes(search) ||
            item.name.toLowerCase().includes(search) ||
            item.category?.toLowerCase().includes(search)
        )
      : true;
    const matchesCategory = filters?.category
      ? order.items.some((item) => item.category === filters.category)
      : true;

    return matchesSearch && matchesCategory;
  });

  const productIds = [
    ...new Set(
      filteredOrders
        .flatMap((order) => order.items)
        .filter((item) => !item.imageUrl)
        .map((item) => item.productId)
    )
  ];
  const products = productIds.length
    ? ((await prisma.product.findMany({
        where: { id: { in: productIds } },
        select: { id: true, imageUrl: true }
      })) as unknown as Product[])
    : [];

  return enrichOrderItemImages(limit ? filteredOrders.slice(0, limit) : filteredOrders, products);
}

function normalizeLimit(value?: number) {
  if (!value) {
    return undefined;
  }

  return Math.min(Math.max(Math.floor(value), 1), 200);
}

function enrichOrderItemImages(orders: Order[], products: Pick<Product, "id" | "imageUrl">[]) {
  if (!products.length) {
    return orders;
  }

  const imageByProductId = new Map(
    products
      .filter((product) => product.imageUrl)
      .map((product) => [product.id, product.imageUrl])
  );

  if (!imageByProductId.size) {
    return orders;
  }

  return orders.map((order) => ({
    ...order,
    items: order.items.map((item) => ({
      ...item,
      imageUrl: item.imageUrl ?? imageByProductId.get(item.productId) ?? null
    }))
  }));
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

function storeOrderSequence(orders: Order[], date: Date) {
  return (
    orders.filter(
      (order) =>
        order.createdAt.getFullYear() === date.getFullYear() &&
        order.createdAt.getMonth() === date.getMonth() &&
        order.createdAt.getDate() === date.getDate()
    ).length + 1
  );
}

export async function createOrder(formData: FormData) {
  await requireOwner();
  const requestedItems = getRequestedOrderItems(formData);
  const customerName = String(formData.get("customerName") ?? "").trim();
  const phone = String(formData.get("phone") ?? "").trim();
  const province = String(formData.get("province") ?? "").trim();
  const city = String(formData.get("city") ?? "").trim();
  const shippingCompany = String(formData.get("shippingCompany") ?? "").trim();
  const pickupBranch = String(formData.get("pickupBranch") ?? "").trim() || null;
  const paymentStatus = parsePaymentStatus(formData.get("paymentStatus"));
  const note = String(formData.get("note") ?? "").trim() || null;

  if (!customerName || !phone || !province || !city || !shippingCompany) {
    return {
      ok: false,
      message: "ກະລຸນາປ້ອນຂໍ້ມູນລູກຄ້າ ແລະ ຂົນສົ່ງໃຫ້ຄົບ"
    };
  }

  if (!requestedItems.length) {
    return { ok: false, message: "ກະລຸນາເພີ່ມສິນຄ້າເຂົ້າອໍເດີກ່ອນ" };
  }

  if (!hasDatabase) {
    const localResult: {
      value: { ok: boolean; message: string } | null;
    } = { value: null };

    await updateLocalStore((store) => {
      const build = buildOrderItemsFromProducts(store.products, requestedItems);

      if (!build.ok) {
        localResult.value = { ok: false, message: build.message };
        return store;
      }

      const totals = calculateOrderTotals(build.items);
      const now = new Date();
      const order: Order = {
        id: crypto.randomUUID(),
        orderNo: buildReadableNumber("ORD", now, storeOrderSequence(store.orders, now)),
        customerName,
        phone,
        province,
        city,
        shippingCompany,
        pickupBranch,
        paymentStatus,
        status: "PENDING_PACK",
        items: build.items,
        ...totals,
        note,
        createdAt: now,
        updatedAt: now
      };

      localResult.value = { ok: true, message: "ສ້າງອໍເດີແລ້ວ" };

      return {
        ...store,
        orders: [order, ...store.orders],
        products: applyOrderStockChanges(store.products, requestedItems, now)
      };
    });

    if (!localResult.value) {
      throw new Error("Local order transaction did not return a result");
    }

    if (!localResult.value.ok) {
      return localResult.value;
    }

    revalidateAfterOrderCreate();

    return localResult.value;
  }

  const transactionResult = await prisma.$transaction(async (tx) => {
    const products = (await tx.product.findMany({
      where: {
        id: { in: [...new Set(requestedItems.map((item) => item.productId))] },
        isActive: true
      }
    })) as unknown as Product[];
    const build = buildOrderItemsFromProducts(products, requestedItems);

    if (!build.ok) {
      return { ok: false as const, message: build.message };
    }

    const totals = calculateOrderTotals(build.items);
    const now = new Date();
    const orderNo = buildReadableNumber(
      "ORD",
      now,
      (await tx.order.count({
        where: {
          createdAt: {
            gte: new Date(now.getFullYear(), now.getMonth(), now.getDate(), 0, 0, 0, 0),
            lt: new Date(now.getFullYear(), now.getMonth(), now.getDate() + 1, 0, 0, 0, 0)
          }
        }
      })) + 1
    );

    await tx.order.create({
      data: {
        orderNo,
        customerName,
        phone,
        province,
        city,
        shippingCompany,
        pickupBranch,
        paymentStatus,
        status: "PENDING_PACK",
        items: build.items,
        ...totals,
        note
      }
    });

    for (const product of products) {
      const changes = requestedItems.filter((item) => item.productId === product.id);

      if (!changes.length) {
        continue;
      }

      const variants = getProductVariants(product).map((variant) => {
        const quantity = changes
          .filter((item) => item.variantId === variant.id)
          .reduce((sum, item) => sum + item.quantity, 0);

        return quantity ? { ...variant, stock: variant.stock - quantity } : variant;
      });

      await tx.product.update({
        where: { id: product.id },
        data: {
          variants,
          stock: variants.reduce((sum, variant) => sum + variant.stock, 0)
        }
      });
    }

    return { ok: true as const };
  });

  if (!transactionResult.ok) {
    return transactionResult;
  }

  revalidateAfterOrderCreate();

  return {
    ok: true,
    message: "ສ້າງອໍເດີ ແລະ ຕັດສະຕ໋ອກແລ້ວ"
  };
}

function getRequestedOrderItems(formData: FormData) {
  const keys = formData.getAll("productVariantKey").map((value) => String(value));
  const quantities = formData.getAll("quantity").map((value) => Number(value));
  const merged = new Map<string, RequestedOrderItem>();

  keys.forEach((key, index) => {
    const [productId, variantId] = key.split("::");
    const quantity = Math.max(0, Math.round(quantities[index] ?? 0));

    if (!productId || !variantId || quantity <= 0) {
      return;
    }

    const itemKey = `${productId}::${variantId}`;
    const current = merged.get(itemKey);

    merged.set(itemKey, {
      productId,
      variantId,
      quantity: (current?.quantity ?? 0) + quantity
    });
  });

  return Array.from(merged.values());
}

function buildOrderItemsFromProducts(
  products: Product[],
  requestedItems: RequestedOrderItem[]
):
  | { ok: true; items: OrderItem[] }
  | { ok: false; message: string } {
  const items: OrderItem[] = [];

  for (const requested of requestedItems) {
    const product = products.find((item) => item.id === requested.productId);

    if (!product || !product.isActive) {
      return {
        ok: false,
        message: "ບໍ່ພົບສິນຄ້າ ຫຼື ສິນຄ້າຖືກປິດການຂາຍ"
      };
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

    items.push(productToOrderItem(product, requested.quantity, variant));
  }

  return { ok: true, items };
}

function applyOrderStockChanges(
  products: Product[],
  requestedItems: RequestedOrderItem[],
  updatedAt: Date
) {
  return products.map((product) => {
    const changes = requestedItems.filter((item) => item.productId === product.id);

    if (!changes.length) {
      return product;
    }

    const variants = getProductVariants(product).map((variant) => {
      const quantity = changes
        .filter((item) => item.variantId === variant.id)
        .reduce((sum, item) => sum + item.quantity, 0);

      return quantity ? { ...variant, stock: variant.stock - quantity } : variant;
    });

    return {
      ...product,
      variants,
      stock: variants.reduce((sum, variant) => sum + variant.stock, 0),
      updatedAt
    };
  });
}

function parsePaymentStatus(value: FormDataEntryValue | null): PaymentStatus {
  return value === "COD" ? "COD" : "PAID";
}

export async function submitCreateOrder(formData: FormData): Promise<void> {
  const result = await createOrder(formData);

  if (result.ok) {
    redirect("/orders");
  }
}

export async function updateOrderStatus(
  orderId: string,
  status: OrderStatus,
  returnDetails?: { reason?: string | null; note?: string | null }
) {
  await requireOwner();

  if (status === "CANCELLED") {
    await cancelOrderById(orderId);
    revalidateAfterOrderChange();
    return { ok: true, message: "ຍົກເລີກອໍເດີ ແລະ ຄືນສະຕ໋ອກແລ້ວ" };
  }

  const now = new Date();
  const returnedData =
    status === "RETURNED"
      ? {
          returnReason: returnDetails?.reason?.trim() || "ລູກຄ້າບໍ່ຮັບຂອງ",
          returnNote: returnDetails?.note?.trim() || null,
          returnedAt: now
        }
      : {};

  if (!hasDatabase) {
    let result = { ok: false, message: "ບໍ່ສາມາດປ່ຽນສະຖານະອໍເດີນີ້ໄດ້" };

    await updateLocalStore((store) => {
      const order = store.orders.find((item) => item.id === orderId);

      if (!order || order.status === "RETURNED") {
        return store;
      }

      let products = store.products;

      if (order.status === "CANCELLED") {
        if (status === "RETURNED") {
          return store;
        }

        const requestedItems = getRequestedItemsFromOrder(order.items);
        const build = buildOrderItemsFromProducts(products, requestedItems);

        if (!build.ok) {
          result = { ok: false, message: build.message };
          return store;
        }

        products = applyOrderStockChanges(products, requestedItems, now);
      }

      result = { ok: true, message: "ປ່ຽນສະຖານະອໍເດີແລ້ວ" };

      return {
        ...store,
        products,
        orders: store.orders.map((item) =>
          item.id === orderId
            ? {
                ...item,
                status,
                ...returnedData,
                restockedAt: order.status === "CANCELLED" ? null : item.restockedAt,
                updatedAt: now
              }
            : item
        )
      };
    });

    if (!result.ok) {
      return result;
    }

    revalidateAfterOrderChange();

    return result;
  }

  const result = await prisma.$transaction(async (tx) => {
    const order = (await tx.order.findUnique({
      where: { id: orderId }
    })) as unknown as Order | null;

    if (!order || order.status === "RETURNED") {
      return { ok: false, message: "ບໍ່ສາມາດປ່ຽນສະຖານະອໍເດີນີ້ໄດ້" };
    }

    if (order.status === "CANCELLED") {
      if (status === "RETURNED") {
        return { ok: false, message: "ກະລຸນາເປີດອໍເດີຄືນກ່ອນບັນທຶກສິນຄ້າຕີກັບ" };
      }

      const reserved = await reserveOrderItemsInDatabase(tx, order.items);

      if (!reserved.ok) {
        return reserved;
      }
    }

    await tx.order.update({
      where: { id: orderId },
      data: {
        status,
        ...returnedData,
        restockedAt: order.status === "CANCELLED" ? null : order.restockedAt
      }
    });

    return { ok: true, message: "ປ່ຽນສະຖານະອໍເດີແລ້ວ" };
  });

  if (!result.ok) {
    return result;
  }

  revalidateAfterOrderChange();

  return result;
}

type OrderStatusFormState = {
  ok: boolean | null;
  message: string;
};

export async function updateOrderStatusFromForm(
  _previousState: OrderStatusFormState,
  formData: FormData
): Promise<OrderStatusFormState> {
  const orderId = String(formData.get("orderId") ?? "");
  const status = String(formData.get("status") ?? "") as OrderStatus;
  const returnReason = String(formData.get("returnReason") ?? "").trim();
  const returnNote = String(formData.get("returnNote") ?? "").trim();
  const allowedStatuses: OrderStatus[] = [
    "PENDING_PACK",
    "PACKED",
    "SHIPPED",
    "CANCELLED",
    "RETURNED"
  ];

  if (!orderId || !allowedStatuses.includes(status)) {
    return { ok: false, message: "ຂໍ້ມູນສະຖານະບໍ່ຖືກຕ້ອງ" };
  }

  return updateOrderStatus(orderId, status, {
    reason: returnReason,
    note: returnNote
  });
}

export async function restockReturnedOrder(formData: FormData): Promise<void> {
  await requireOwner();
  const orderId = String(formData.get("orderId") ?? "");

  if (!orderId) {
    return;
  }

  const now = new Date();

  if (!hasDatabase) {
    await updateLocalStore((store) => {
      const order = store.orders.find((item) => item.id === orderId);

      if (!order || order.status !== "RETURNED" || order.restockedAt) {
        return store;
      }

      return {
        ...store,
        orders: store.orders.map((item) =>
          item.id === orderId ? { ...item, restockedAt: now, updatedAt: now } : item
        ),
        products: restockProducts(store.products, order.items, now)
      };
    });

    revalidateAfterOrderChange();
    return;
  }

  await prisma.$transaction(async (tx) => {
    const order = (await tx.order.findUnique({
      where: { id: orderId }
    })) as unknown as Order | null;

    if (!order || order.status !== "RETURNED" || order.restockedAt) {
      return;
    }

    await restockOrderItemsInDatabase(tx, order.items);
    await tx.order.update({
      where: { id: orderId },
      data: { restockedAt: now }
    });
  });

  revalidateAfterOrderChange();
}

function restockProducts(products: Product[], items: OrderItem[], updatedAt: Date) {
  return products.map((product) => {
    const orderItems = items.filter((item) => item.productId === product.id);

    if (!orderItems.length) {
      return product;
    }

    const variants = getProductVariants(product).map((variant) => {
      const quantity = orderItems
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

function revalidateAfterOrderCreate() {
  revalidatePath("/orders");
  revalidatePath("/orders/history");
  revalidatePath("/alerts");
  revalidatePath("/products");
  revalidatePath("/stock-alerts");
  revalidatePath("/dashboard");
  revalidatePath("/reports");
  revalidatePath("/sold-products");
  revalidatePath("/exports");
}

function revalidateAfterOrderChange() {
  revalidatePath("/orders");
  revalidatePath("/orders/history");
  revalidatePath("/alerts");
  revalidatePath("/dashboard");
  revalidatePath("/reports");
  revalidatePath("/products");
  revalidatePath("/stock-alerts");
  revalidatePath("/sold-products");
  revalidatePath("/exports");
}

export async function cancelOrder(formData: FormData): Promise<void> {
  await requireOwner();
  const orderId = String(formData.get("orderId") ?? "");

  if (!orderId) {
    return;
  }

  await cancelOrderById(orderId);
  revalidateAfterOrderChange();
}

async function cancelOrderById(orderId: string) {
  const now = new Date();

  if (!hasDatabase) {
    await updateLocalStore((store) => {
      const order = store.orders.find((item) => item.id === orderId);

      if (
        !order ||
        order.status === "RETURNED" ||
        (order.status === "CANCELLED" && order.restockedAt)
      ) {
        return store;
      }

      return {
        ...store,
        orders: store.orders.map((item) =>
          item.id === orderId
            ? { ...item, status: "CANCELLED", restockedAt: now, updatedAt: now }
            : item
        ),
        products: order.restockedAt
          ? store.products
          : restockProducts(store.products, order.items, now)
      };
    });
    return;
  }

  await prisma.$transaction(async (tx) => {
    const order = (await tx.order.findUnique({
      where: { id: orderId }
    })) as unknown as Order | null;

    if (
      !order ||
      order.status === "RETURNED" ||
      (order.status === "CANCELLED" && order.restockedAt)
    ) {
      return;
    }

    if (!order.restockedAt) {
      await restockOrderItemsInDatabase(tx, order.items);
    }

    await tx.order.update({
      where: { id: orderId },
      data: { status: "CANCELLED", restockedAt: order.restockedAt ?? now }
    });
  });
}

function getRequestedItemsFromOrder(items: OrderItem[]) {
  const requestedItems = new Map<string, RequestedOrderItem>();

  for (const item of items) {
    const variantId = item.variantId ?? "";
    const key = `${item.productId}::${variantId}`;
    const current = requestedItems.get(key);

    requestedItems.set(key, {
      productId: item.productId,
      variantId,
      quantity: (current?.quantity ?? 0) + item.quantity
    });
  }

  return Array.from(requestedItems.values());
}

async function reserveOrderItemsInDatabase(
  tx: Prisma.TransactionClient,
  items: OrderItem[]
) {
  const requestedItems = getRequestedItemsFromOrder(items);
  const products = (await tx.product.findMany({
    where: {
      id: { in: [...new Set(requestedItems.map((item) => item.productId))] },
      isActive: true
    }
  })) as unknown as Product[];
  const build = buildOrderItemsFromProducts(products, requestedItems);

  if (!build.ok) {
    return build;
  }

  for (const product of products) {
    const changes = requestedItems.filter((item) => item.productId === product.id);

    if (!changes.length) {
      continue;
    }

    const variants = getProductVariants(product).map((variant) => {
      const quantity = changes
        .filter((item) => item.variantId === variant.id)
        .reduce((sum, item) => sum + item.quantity, 0);

      return quantity ? { ...variant, stock: variant.stock - quantity } : variant;
    });

    await tx.product.update({
      where: { id: product.id },
      data: {
        variants,
        stock: variants.reduce((sum, variant) => sum + variant.stock, 0)
      }
    });
  }

  return { ok: true as const };
}

async function restockOrderItemsInDatabase(
  tx: Prisma.TransactionClient,
  items: OrderItem[]
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
        ? { ...variant, stock: variant.stock + item.quantity }
        : variant
    );

    await tx.product.update({
      where: { id: product.id },
      data: {
        variants,
        stock: variants.reduce((sum, variant) => sum + variant.stock, 0)
      }
    });
  }
}

export async function updateOrderInfo(formData: FormData): Promise<void> {
  await requireOwner();
  const orderId = String(formData.get("orderId") ?? "");
  const customerName = String(formData.get("customerName") ?? "").trim();
  const phone = String(formData.get("phone") ?? "").trim();
  const province = String(formData.get("province") ?? "").trim();
  const city = String(formData.get("city") ?? "").trim();
  const shippingCompany = String(formData.get("shippingCompany") ?? "").trim();
  const pickupBranch = String(formData.get("pickupBranch") ?? "").trim() || null;
  const note = String(formData.get("note") ?? "").trim() || null;

  if (!orderId) {
    return;
  }

  if (!customerName || !phone || !province || !city || !shippingCompany) {
    return;
  }

  if (!hasDatabase) {
    await updateLocalStore((store) => ({
      ...store,
      orders: store.orders.map((order) =>
        order.id === orderId
          ? {
              ...order,
              customerName,
              phone,
              province,
              city,
              shippingCompany,
              pickupBranch,
              note,
              updatedAt: new Date()
            }
          : order
      )
    }));
    revalidateAfterOrderChange();
    return;
  }

  await prisma.order.update({
    where: { id: orderId },
    data: {
      customerName,
      phone,
      province,
      city,
      shippingCompany,
      pickupBranch,
      note
    }
  });

  revalidateAfterOrderChange();
}
