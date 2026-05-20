"use client";

import { useState } from "react";
import {
  CalendarDays,
  Edit3,
  Package,
  Phone,
  Printer,
  RotateCcw,
  Save,
  Search,
  X
} from "lucide-react";
import {
  restockReturnedOrder,
  updateOrderInfo,
  updateOrderStatusFromForm
} from "@/actions/order.action";
import type { Order, OrderStatus, StoreSettings } from "@/types";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Input, Select, Textarea } from "@/components/ui/input";
import { cn, formatCurrency, formatDate, statusConfig } from "@/lib/utils";

export function OrderFilters({
  search,
  category,
  status,
  date,
  categories
}: {
  search?: string;
  category?: string;
  status?: OrderStatus | "ALL";
  date?: string;
  categories: string[];
}) {
  return (
    <form className="mb-4 grid gap-3 md:grid-cols-[1fr_13rem_13rem_11rem_auto]">
      <label className="relative">
        <Search className="pointer-events-none absolute left-3 top-3 h-5 w-5 text-zinc-400" />
        <Input
          name="search"
          defaultValue={search}
          placeholder="ຄົ້ນຫາລູກຄ້າ ເບີໂທ ຫຼື SKU"
          className="pl-10"
        />
      </label>
      <Select name="category" defaultValue={category ?? ""}>
        <option value="">ທຸກໝວດໝູ່</option>
        {categories.map((item) => (
          <option key={item} value={item}>
            {item}
          </option>
        ))}
      </Select>
      <Select name="status" defaultValue={status ?? "ALL"}>
        <option value="ALL">ທຸກສະຖານະຈັດສົ່ງ</option>
        {orderStatuses.map((item) => (
          <option key={item} value={item}>
            {statusConfig[item].label}
          </option>
        ))}
      </Select>
      <Input
        type="date"
        name="date"
        defaultValue={date ?? ""}
        aria-label="ກອງຕາມວັນທີ"
      />
      <Button type="submit" className="w-full md:w-auto">
        ຄົ້ນຫາ
      </Button>
    </form>
  );
}

const orderStatuses = [
  "PENDING_PACK",
  "PACKED",
  "SHIPPED",
  "CANCELLED",
  "RETURNED"
] as const;
const directOrderStatuses = orderStatuses.filter((status) => status !== "RETURNED");
const returnReasons = [
  "ລູກຄ້າບໍ່ຮັບຂອງ",
  "ຕິດຕໍ່ລູກຄ້າບໍ່ໄດ້",
  "ທີ່ຢູ່ຜິດ",
  "ຄ່າສົ່ງແພງ",
  "ລູກຄ້າປ່ຽນໃຈ",
  "ອື່ນໆ"
];

export function OrderList({
  orders,
  showHistoryActions = false,
  storeSettings
}: {
  orders: Order[];
  showHistoryActions?: boolean;
  storeSettings: StoreSettings;
}) {
  const [selectedOrderId, setSelectedOrderId] = useState<string | null>(null);
  const selectedOrder = orders.find((order) => order.id === selectedOrderId);

  if (!orders.length) {
    return (
      <Card>
        <CardContent>
          <p className="text-sm text-zinc-500">ບໍ່ພົບອໍເດີຕາມເງື່ອນໄຂທີ່ເລືອກ</p>
        </CardContent>
      </Card>
    );
  }

  return (
    <>
      <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-3">
        {orders.map((order) => {
          const selected = selectedOrderId === order.id;
          const firstItem = order.items[0];
          const moreItems = Math.max(order.items.length - 1, 0);

          return (
            <Card
              key={order.id}
              className={cn(
                "overflow-hidden transition",
                selected && "border-zinc-950 shadow-md"
              )}
            >
              <button
                type="button"
                onClick={() => setSelectedOrderId(order.id)}
                className="block w-full text-left"
                aria-expanded={selected}
              >
              <CardContent className="space-y-3">
                <div className="flex items-start justify-between gap-3">
                  <div className="min-w-0">
                    <p className="truncate text-lg font-bold tracking-normal text-zinc-950">
                      {order.customerName}
                    </p>
                    <p className="mt-0.5 text-xs font-semibold text-zinc-500">
                      {order.orderNo ?? order.id.slice(-8).toUpperCase()}
                    </p>
                    <p className="mt-1 flex items-center gap-1.5 text-sm text-zinc-500">
                      <Phone className="h-4 w-4 shrink-0" aria-hidden />
                      <span className="truncate">{order.phone}</span>
                    </p>
                  </div>
                  <Badge className={statusConfig[order.status].className}>
                    {statusConfig[order.status].label}
                  </Badge>
                </div>

                <div className="rounded-md border border-zinc-200 bg-zinc-50 p-3">
                  <p className="mb-2 text-xs font-semibold uppercase text-zinc-500">
                    ທີ່ຢູ່ ແລະ ຂົນສົ່ງ
                  </p>
                  <OrderShippingInfo order={order} compact />
                </div>

                <div className="rounded-md border border-zinc-200 p-3">
                  <p className="flex items-center gap-2 text-sm font-semibold text-zinc-950">
                    <Package className="h-4 w-4 text-zinc-500" aria-hidden />
                    {firstItem
                      ? `${firstItem.name}${firstItem.variantName ? ` - ${firstItem.variantName}` : ""}`
                      : "ບໍ່ມີລາຍການສິນຄ້າ"}
                  </p>
                  {firstItem ? (
                    <p className="mt-1 text-sm text-zinc-500">
                      {firstItem.sku} · x{firstItem.quantity}
                      {moreItems ? ` · +${moreItems} ລາຍການ` : ""}
                    </p>
                  ) : null}
                </div>

                <div className="grid grid-cols-2 gap-2 text-sm">
                  <div>
                    <p className="text-zinc-500">ຍອດຂາຍ</p>
                    <p className="font-bold text-zinc-950">
                      {formatCurrency(order.totalAmount)}
                    </p>
                  </div>
                  <div>
                    <p className="text-zinc-500">ກໍາໄລ</p>
                    <p className="font-bold text-emerald-700">
                      {formatCurrency(order.profit)}
                    </p>
                  </div>
                </div>

                <div className="rounded-md border border-zinc-200 bg-zinc-50 p-3 text-sm">
                  <p className="text-zinc-500">ການຊໍາລະ</p>
                  <p className="font-bold text-zinc-950">
                    {order.paymentStatus === "COD"
                      ? "COD / ເກັບເງິນປາຍທາງ"
                      : "ຈ່າຍແລ້ວ"}
                  </p>
                </div>

                {order.status === "RETURNED" ? (
                  <div className="rounded-md border border-rose-200 bg-rose-50 p-3 text-sm">
                    <p className="font-bold text-rose-800">ຕີກັບ</p>
                    <p className="mt-1 text-rose-700">
                      {order.returnReason || "ບໍ່ລະບຸເຫດຜົນ"}
                    </p>
                  </div>
                ) : null}

                <div className="flex items-center justify-between border-t border-zinc-100 pt-3 text-sm text-zinc-500">
                  <span className="flex items-center gap-1.5">
                    <CalendarDays className="h-4 w-4" aria-hidden />
                    {formatDate(new Date(order.createdAt))}
                  </span>
                  <span className="font-semibold text-zinc-700">
                    ກົດເພື່ອເປີດ
                  </span>
                </div>
              </CardContent>
            </button>
            </Card>
          );
        })}
      </div>

      {selectedOrder ? (
        <div
          className="fixed inset-0 z-50 flex items-end bg-zinc-950/45 p-0 sm:items-center sm:justify-center sm:p-4"
          role="dialog"
          aria-modal="true"
          aria-labelledby="order-detail-title"
        >
          <div className="max-h-[88vh] w-full overflow-hidden rounded-t-lg bg-white shadow-xl sm:max-w-2xl sm:rounded-lg">
            <div className="flex items-start justify-between gap-3 border-b border-zinc-200 p-4">
              <div className="min-w-0">
                <p id="order-detail-title" className="truncate text-lg font-bold text-zinc-950">
                  {selectedOrder.customerName}
                </p>
                <p className="text-sm text-zinc-500">
                  {(selectedOrder.orderNo ?? selectedOrder.id.slice(-8).toUpperCase())} ·{" "}
                  {formatDate(new Date(selectedOrder.createdAt))}
                </p>
              </div>
              <Button
                type="button"
                variant="ghost"
                className="min-h-9 px-2"
                onClick={() => setSelectedOrderId(null)}
                aria-label="ປິດລາຍລະອຽດ"
              >
                <X className="h-5 w-5" aria-hidden />
              </Button>
            </div>
            <div className="max-h-[calc(88vh-76px)] overflow-y-auto p-4">
              <OrderDetailsPanel
                order={selectedOrder}
                showHistoryActions={showHistoryActions}
                storeSettings={storeSettings}
              />
            </div>
          </div>
        </div>
      ) : null}
    </>
  );
}

function OrderDetailsPanel({
  order,
  showHistoryActions,
  storeSettings
}: {
  order: Order;
  showHistoryActions: boolean;
  storeSettings: StoreSettings;
}) {
  return (
    <div className="grid gap-3 text-sm">
      <DetailRow label="ຂໍ້ມູນລູກຄ້າ ແລະ ຂົນສົ່ງ">
        <OrderShippingInfo order={order} />
      </DetailRow>

      <div>
        <p className="mb-2 text-xs font-semibold uppercase text-zinc-500">
          ລາຍການສິນຄ້າ
        </p>
        <div className="grid gap-2">
          {order.items.map((item) => (
            <div
              key={`${order.id}-${item.productId}-${item.variantId ?? item.sku}`}
              className="rounded-md border border-zinc-200 p-3"
            >
              <div className="flex items-start justify-between gap-3">
                <div>
                  <p className="font-semibold text-zinc-950">
                    {item.name}
                    {item.variantName ? ` - ${item.variantName}` : ""}
                  </p>
                  <p className="text-zinc-500">
                    {item.sku} · x{item.quantity}
                  </p>
                </div>
                <p className="font-semibold text-zinc-950">
                  {formatCurrency(item.price * item.quantity)}
                </p>
              </div>
              <div className="mt-2 grid grid-cols-2 gap-2 text-xs text-zinc-500">
                <p>ລາຄາຂາຍ: {formatCurrency(item.price)}</p>
                <p>ຕົ້ນທຶນ: {formatCurrency(item.cost)}</p>
              </div>
            </div>
          ))}
        </div>
      </div>

      <div className="grid grid-cols-3 gap-2 rounded-md bg-zinc-50 p-3">
        <div>
          <p className="text-xs text-zinc-500">ຍອດຂາຍ</p>
          <p className="font-bold text-zinc-950">
            {formatCurrency(order.totalAmount)}
          </p>
        </div>
        <div>
          <p className="text-xs text-zinc-500">ຕົ້ນທຶນ</p>
          <p className="font-bold text-zinc-950">
            {formatCurrency(order.totalCost)}
          </p>
        </div>
        <div>
          <p className="text-xs text-zinc-500">ກໍາໄລ</p>
          <p className="font-bold text-emerald-700">
            {formatCurrency(order.profit)}
          </p>
        </div>
      </div>

      {order.status === "RETURNED" ? (
        <div className="rounded-md border border-rose-200 bg-rose-50 p-3">
          <p className="mb-2 text-xs font-semibold uppercase text-rose-700">
            ຂໍ້ມູນຕີກັບ
          </p>
          <div className="grid gap-1.5 text-sm">
            <div className="grid grid-cols-[6.5rem_1fr] gap-2">
              <span className="text-rose-700">ເຫດຜົນ :</span>
              <strong className="text-rose-950">
                {order.returnReason || "ບໍ່ລະບຸ"}
              </strong>
            </div>
            {order.returnNote ? (
              <div className="grid grid-cols-[6.5rem_1fr] gap-2">
                <span className="text-rose-700">ໝາຍເຫດ :</span>
                <span className="text-rose-900">{order.returnNote}</span>
              </div>
            ) : null}
            {order.returnedAt ? (
              <div className="grid grid-cols-[6.5rem_1fr] gap-2">
                <span className="text-rose-700">ວັນຕີກັບ :</span>
                <span className="text-rose-900">
                  {formatDate(new Date(order.returnedAt))}
                </span>
              </div>
            ) : null}
            <div className="grid grid-cols-[6.5rem_1fr] gap-2">
              <span className="text-rose-700">ສະຕ໋ອກ :</span>
              <span className="font-semibold text-rose-950">
                {order.restockedAt
                  ? `ຮັບຄືນແລ້ວ ${formatDate(new Date(order.restockedAt))}`
                  : "ຍັງບໍ່ຮັບຄືນ"}
              </span>
            </div>
          </div>
          {!order.restockedAt ? (
            <form action={restockReturnedOrder} className="mt-3">
              <input type="hidden" name="orderId" value={order.id} />
              <Button
                type="submit"
                variant="secondary"
                className="w-full border-emerald-200 bg-emerald-600 text-white hover:bg-emerald-700"
              >
                <RotateCcw className="h-4 w-4" aria-hidden />
                ຮັບສິນຄ້າຄືນເຂົ້າສະຕ໋ອກ
              </Button>
            </form>
          ) : null}
        </div>
      ) : null}

      <div className="rounded-md border border-zinc-200 p-3">
        <p className="mb-1 text-xs font-semibold uppercase text-zinc-500">
          ການຊໍາລະ
        </p>
        <p className="font-bold text-zinc-950">
          {order.paymentStatus === "COD"
            ? `COD / ເກັບເງິນປາຍທາງ ${formatCurrency(order.totalAmount)}`
            : "ຈ່າຍແລ້ວ"}
        </p>
      </div>

      {order.note ? (
        <div className="rounded-md border border-zinc-200 p-3">
          <p className="mb-1 text-xs font-semibold uppercase text-zinc-500">
            ໝາຍເຫດ
          </p>
          <p className="text-zinc-700">{order.note}</p>
        </div>
      ) : null}

      <div className="rounded-md border border-zinc-200 p-3">
        <p className="mb-2 text-xs font-semibold uppercase text-zinc-500">
          ປ່ຽນສະຖານະ
        </p>
        <div className="flex flex-wrap gap-2">
          {directOrderStatuses.map((status) => (
            <form key={status} action={updateOrderStatusFromForm}>
              <input type="hidden" name="orderId" value={order.id} />
              <input type="hidden" name="status" value={status} />
              <Button
                type="submit"
                variant="secondary"
                className={cn(
                  "min-h-9 px-3 text-xs",
                  statusConfig[status].className,
                  order.status === status && "ring-2 ring-zinc-900"
                )}
                disabled={order.status === status}
              >
                {statusConfig[status].label}
              </Button>
            </form>
          ))}
        </div>
        {order.status !== "RETURNED" ? (
          <form
            action={updateOrderStatusFromForm}
            className="mt-3 grid gap-2 rounded-md border border-rose-200 bg-rose-50 p-3"
          >
            <input type="hidden" name="orderId" value={order.id} />
            <input type="hidden" name="status" value="RETURNED" />
            <label className="space-y-1.5">
              <span className="text-xs font-semibold text-rose-700">
                ເຫດຜົນຕີກັບ
              </span>
              <Select name="returnReason" required defaultValue={returnReasons[0]}>
                {returnReasons.map((reason) => (
                  <option key={reason} value={reason}>
                    {reason}
                  </option>
                ))}
              </Select>
            </label>
            <label className="space-y-1.5">
              <span className="text-xs font-semibold text-rose-700">
                ໝາຍເຫດເພີ່ມເຕີມ
              </span>
              <Textarea
                name="returnNote"
                placeholder="ຕົວຢ່າງ: ລູກຄ້າບໍ່ໄປຮັບຂອງ ຫຼື ເບີໂທຕິດຕໍ່ບໍ່ໄດ້"
              />
            </label>
            <Button
              type="submit"
              variant="secondary"
              className="w-full border-rose-200 bg-rose-600 text-white hover:bg-rose-700"
            >
              ບັນທຶກຕີກັບ
            </Button>
          </form>
        ) : null}
      </div>

      {showHistoryActions ? (
        <div className="grid gap-3 border-t border-zinc-200 pt-3">
          <form action={updateOrderInfo} className="grid gap-3">
            <input type="hidden" name="orderId" value={order.id} />
            <p className="flex items-center gap-2 text-sm font-bold text-zinc-950">
              <Edit3 className="h-4 w-4" aria-hidden />
              ແກ້ໄຂຂໍ້ມູນອໍເດີ
            </p>
            <div className="grid gap-3 sm:grid-cols-2">
              <label className="space-y-1.5">
                <span className="text-xs font-semibold text-zinc-500">
                  ຊື່ລູກຄ້າ
                </span>
                <Input name="customerName" defaultValue={order.customerName} required />
              </label>
              <label className="space-y-1.5">
                <span className="text-xs font-semibold text-zinc-500">
                  ເບີໂທ
                </span>
                <Input name="phone" defaultValue={order.phone} required />
              </label>
              <label className="space-y-1.5">
                <span className="text-xs font-semibold text-zinc-500">
                  ແຂວງ
                </span>
                <Input name="province" defaultValue={order.province} required />
              </label>
              <label className="space-y-1.5">
                <span className="text-xs font-semibold text-zinc-500">
                  ເມືອງ
                </span>
                <Input name="city" defaultValue={order.city} required />
              </label>
              <label className="space-y-1.5 sm:col-span-2">
                <span className="text-xs font-semibold text-zinc-500">
                  ບໍລິສັດຂົນສົ່ງ
                </span>
                <Select
                  name="shippingCompany"
                  defaultValue={order.shippingCompany}
                  required
                >
                  {storeSettings.shippingCompanies.map((company) => (
                    <option key={company} value={company}>
                      {company}
                    </option>
                  ))}
                </Select>
              </label>
              <label className="space-y-1.5 sm:col-span-2">
                <span className="text-xs font-semibold text-zinc-500">
                  ສາຂາຮັບເຄື່ອງ
                </span>
                <Input
                  name="pickupBranch"
                  defaultValue={order.pickupBranch ?? ""}
                  placeholder="ຕົວຢ່າງ: ສາຂາໂພນຕ້ອງ"
                />
              </label>
              <label className="space-y-1.5 sm:col-span-2">
                <span className="text-xs font-semibold text-zinc-500">
                  ໝາຍເຫດ
                </span>
                <Textarea name="note" defaultValue={order.note ?? ""} />
              </label>
            </div>
            <Button type="submit" variant="secondary" className="w-full">
              <Save className="h-4 w-4" aria-hidden />
              ບັນທຶກການແກ້ໄຂ
            </Button>
          </form>

          <div>
            <Button
              type="button"
              variant="secondary"
              className="w-full border-sky-200 bg-sky-600 text-white hover:bg-sky-700"
              onClick={() => printOrderBill(order, storeSettings)}
            >
              <Printer className="h-4 w-4" aria-hidden />
              ປິ້ນບິນ
            </Button>
          </div>
        </div>
      ) : null}
    </div>
  );
}

function printOrderBill(order: Order, storeSettings: StoreSettings) {
  const logoUrl = storeSettings.logoUrl
    ? `${window.location.origin}${storeSettings.logoUrl}`
    : "";
  const billHtml = getOrderBillHtml(order, storeSettings, logoUrl);
  const printWindow = window.open("", "_blank", "width=520,height=780");

  if (!printWindow) {
    printOrderBillInFrame(billHtml);
    return;
  }

  printWindow.document.write(billHtml);
  printWindow.document.close();
  printWhenReady(printWindow);
}

function getOrderBillHtml(
  order: Order,
  storeSettings: StoreSettings,
  logoUrl: string
) {
  const isA4 = storeSettings.orderBillSize === "A4";
  const pageSize = isA4 ? "A4" : "100mm 150mm";
  const bodyWidth = isA4 ? "210mm" : "100mm";
  const billWidth = isA4 ? "100mm" : "100mm";
  const screenPadding = isA4 ? "24px" : "10px";

  return `
    <!doctype html>
    <html>
      <head>
        <meta charset="utf-8" />
        <base href="${window.location.origin}" />
        <title>Order Bill</title>
        <style>
          @font-face {
            font-family: "Noto Sans Lao";
            font-style: normal;
            font-weight: 400 700;
            font-display: block;
            src: url("/fonts/noto-sans-lao-lao.woff2") format("woff2");
            unicode-range: U+0E81-0EDF, U+200C-200D, U+25CC;
          }
          @font-face {
            font-family: "Noto Sans Lao";
            font-style: normal;
            font-weight: 400 700;
            font-display: block;
            src: url("/fonts/noto-sans-lao-latin.woff2") format("woff2");
            unicode-range: U+0000-00FF, U+0131, U+0152-0153, U+02BB-02BC, U+02C6, U+02DA, U+02DC, U+0304, U+0308, U+0329, U+2000-206F, U+20AC, U+2122, U+2191, U+2193, U+2212, U+2215, U+FEFF, U+FFFD;
          }
          @font-face {
            font-family: "Noto Sans Lao";
            font-style: normal;
            font-weight: 400 700;
            font-display: block;
            src: url("/fonts/noto-sans-lao-latin-ext.woff2") format("woff2");
            unicode-range: U+0100-02BA, U+02BD-02C5, U+02C7-02CC, U+02CE-02D7, U+02DD-02FF, U+0304, U+0308, U+0329, U+1D00-1DBF, U+1E00-1E9F, U+1EF2-1EFF, U+2020, U+20A0-20AB, U+20AD-20C0, U+2113, U+2C60-2C7F, U+A720-A7FF;
          }
          @page { size: ${pageSize}; margin: ${isA4 ? "12mm" : "0"}; }
          * { box-sizing: border-box; font-family: "Noto Sans Lao", Arial, sans-serif !important; }
          html, body { width: ${bodyWidth}; margin: 0; overflow: hidden; font-family: "Noto Sans Lao", Arial, sans-serif !important; }
          body { color: #09090b; background: #ffffff; }
          .bill { width: ${billWidth}; overflow: hidden; border: 1px solid #18181b; background: #ffffff; ${isA4 ? "margin: 0 auto;" : ""} }
          .bill-meta { display: flex; justify-content: space-between; gap: 8px; padding: 5px 8px 0; font-size: 10px; line-height: 1.2; color: #52525b; }
          .bill-id { text-align: right; font-weight: 700; color: #27272a; }
          .header { padding: 6px 14px 12px; text-align: center; }
          .logo { display: block; max-width: 128px; max-height: 82px; object-fit: contain; margin: 0 auto 8px; }
          h1 { font-size: 19px; margin: 0; line-height: 1.25; }
          .subtitle { color: #27272a; font-size: 14px; font-weight: 700; margin-top: 4px; }
          .section { border-top: 1px solid #18181b; padding: 12px 14px; }
          .section-title { margin: 0 0 9px; font-size: 16px; font-weight: 700; }
          .row { display: grid; grid-template-columns: 32mm 1fr; gap: 8px; margin: 8px 0; font-size: 16px; line-height: 1.35; }
          .label { color: #71717a; }
          .cod { border-top: 1px solid #18181b; padding: 12px 14px; font-size: 20px; font-weight: 700; }
          @media screen { body { padding: ${screenPadding}; } }
          @media print { * { font-family: "Noto Sans Lao", Arial, sans-serif !important; } html, body { width: ${bodyWidth}; } .bill { border-color: #000; } }
        </style>
      </head>
      <body>
        <div class="bill">
          <div class="bill-meta">
            <span>${formatBillDate(new Date(order.createdAt))}</span>
            <span class="bill-id">${escapeHtml(order.orderNo ?? order.id.slice(-8).toUpperCase())}</span>
          </div>
          <div class="header">
            ${logoUrl ? `<img class="logo" src="${escapeHtml(logoUrl)}" alt="${escapeHtml(storeSettings.storeName)}" />` : ""}
            <h1>${escapeHtml(storeSettings.storeName)}</h1>
            ${storeSettings.storeSubtitle ? `<div class="subtitle">${escapeHtml(storeSettings.storeSubtitle)}</div>` : ""}
            ${storeSettings.storeNote ? `<div class="subtitle">${escapeHtml(storeSettings.storeNote)}</div>` : ""}
          </div>

          <div class="section">
            <p class="section-title">ຜູ້ຮັບ</p>
            <div class="row"><span class="label">ຊື່ :</span><strong>${escapeHtml(order.customerName)}</strong></div>
            <div class="row"><span class="label">ເບີຜູ້ຮັບ :</span><span>${escapeHtml(order.phone)}</span></div>
          </div>

          <div class="section">
            <p class="section-title">ຂົນສົ່ງ</p>
            <div class="row"><span class="label">ຂົນສົ່ງ :</span><strong>${escapeHtml(order.shippingCompany)}</strong></div>
            <div class="row"><span class="label">ສາຂາ :</span><span>${escapeHtml(order.pickupBranch || "-")}</span></div>
            <div class="row"><span class="label">ເມືອງ :</span><span>${escapeHtml(order.city)}</span></div>
            <div class="row"><span class="label">ແຂວງ :</span><span>${escapeHtml(order.province)}</span></div>
          </div>

          ${order.paymentStatus === "COD" ? `<div class="cod">COD : ${formatCurrency(order.totalAmount)}</div>` : ""}

        </div>
      </body>
    </html>
  `;
}

function printOrderBillInFrame(billHtml: string) {
  const iframe = document.createElement("iframe");
  iframe.setAttribute("aria-hidden", "true");
  iframe.style.position = "fixed";
  iframe.style.right = "0";
  iframe.style.bottom = "0";
  iframe.style.width = "1px";
  iframe.style.height = "1px";
  iframe.style.border = "0";
  iframe.style.opacity = "0";
  document.body.appendChild(iframe);

  const frameWindow = iframe.contentWindow;

  if (!frameWindow) {
    iframe.remove();
    return;
  }

  let removed = false;
  const removeFrame = () => {
    if (removed) {
      return;
    }

    removed = true;
    iframe.remove();
  };

  frameWindow.document.open();
  frameWindow.document.write(billHtml);
  frameWindow.document.close();
  frameWindow.addEventListener("afterprint", removeFrame, { once: true });
  printWhenReady(frameWindow);
  window.setTimeout(removeFrame, 10000);
}

function printWhenReady(printWindow: Window) {
  let printed = false;

  const printOnce = () => {
    if (printed) {
      return;
    }

    printed = true;
    printWindow.focus();
    printWindow.print();
  };

  const ready = Promise.all([
    waitForStylesheets(printWindow),
    waitForFonts(printWindow),
    waitForImages(printWindow)
  ]);

  void ready.finally(printOnce);
  window.setTimeout(printOnce, 2000);
}

function waitForStylesheets(printWindow: Window) {
  const links = Array.from(
    printWindow.document.querySelectorAll<HTMLLinkElement>('link[rel="stylesheet"]')
  );

  if (!links.length) {
    return Promise.resolve();
  }

  return Promise.all(
    links.map(
      (link) =>
        new Promise<void>((resolve) => {
          try {
            if (link.sheet) {
              resolve();
              return;
            }
          } catch {
            resolve();
            return;
          }

          link.addEventListener("load", () => resolve(), { once: true });
          link.addEventListener("error", () => resolve(), { once: true });
        })
    )
  ).then(() => undefined);
}

function waitForFonts(printWindow: Window) {
  if (!("fonts" in printWindow.document)) {
    return Promise.resolve();
  }

  const fonts = printWindow.document.fonts;

  return Promise.all([
    fonts.load('400 16px "Noto Sans Lao"'),
    fonts.load('500 16px "Noto Sans Lao"'),
    fonts.load('600 16px "Noto Sans Lao"'),
    fonts.load('700 16px "Noto Sans Lao"'),
    fonts.ready
  ])
    .then(() => undefined)
    .catch(() => undefined);
}

function waitForImages(printWindow: Window) {
  const images = Array.from(printWindow.document.images);

  if (!images.length) {
    return Promise.resolve();
  }

  return Promise.all(
    images.map(
      (image) =>
        new Promise<void>((resolve) => {
          if (image.complete) {
            resolve();
            return;
          }

          image.addEventListener("load", () => resolve(), { once: true });
          image.addEventListener("error", () => resolve(), { once: true });
        })
    )
  ).then(() => undefined);
}

function formatBillDate(value: Date) {
  const date = new Date(value);
  const day = date.getDate();
  const month = date.getMonth() + 1;
  const year = date.getFullYear();
  const hours = String(date.getHours()).padStart(2, "0");
  const minutes = String(date.getMinutes()).padStart(2, "0");

  return `${day}/${month}/${year} ${hours}:${minutes}`;
}

function escapeHtml(value: string) {
  return value
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#039;");
}

function DetailRow({
  label,
  children
}: {
  label: string;
  children: React.ReactNode;
}) {
  return (
    <div className="rounded-md border border-zinc-200 p-3">
      <p className="mb-2 text-xs font-semibold uppercase text-zinc-500">
        {label}
      </p>
      {children}
    </div>
  );
}

function OrderShippingInfo({
  order,
  compact = false
}: {
  order: Order;
  compact?: boolean;
}) {
  const rowClass = compact
    ? "grid grid-cols-[5.75rem_1fr] gap-2 text-sm"
    : "grid grid-cols-[6.5rem_1fr] gap-2 text-sm";
  const labelClass = "text-zinc-500";
  const valueClass = "min-w-0 font-semibold text-zinc-950";

  return (
    <div className="grid gap-1.5">
      <div className={rowClass}>
        <span className={labelClass}>ຊື່ :</span>
        <span className={valueClass}>{order.customerName}</span>
      </div>
      <div className={rowClass}>
        <span className={labelClass}>ເບີຜູ້ຮັບ :</span>
        <span className="min-w-0 text-zinc-700">{order.phone}</span>
      </div>
      <div className={rowClass}>
        <span className={labelClass}>ຂົນສົ່ງ :</span>
        <span className={valueClass}>{order.shippingCompany}</span>
      </div>
      <div className={rowClass}>
        <span className={labelClass}>ສາຂາ :</span>
        <span className="min-w-0 text-zinc-700">{order.pickupBranch || "-"}</span>
      </div>
      <div className={rowClass}>
        <span className={labelClass}>ເມືອງ :</span>
        <span className="min-w-0 text-zinc-700">{order.city}</span>
      </div>
      <div className={rowClass}>
        <span className={labelClass}>ແຂວງ :</span>
        <span className="min-w-0 text-zinc-700">{order.province}</span>
      </div>
    </div>
  );
}
