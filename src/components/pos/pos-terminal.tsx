"use client";

import { useMemo, useRef, useState, useTransition } from "react";
import {
  Barcode,
  Banknote,
  Minus,
  Plus,
  Printer,
  Trash2,
  UserRound
} from "lucide-react";
import { createPosSale } from "@/actions/pos.action";
import type {
  MemberSummary,
  Product,
  Sale,
  SalePaymentMethod,
  StoreSettings
} from "@/types";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input, Select } from "@/components/ui/input";
import { MoneyInput } from "@/components/ui/money-input";
import { formatCurrency, getProductVariants } from "@/lib/utils";

type ProductOption = {
  key: string;
  productId: string;
  variantId: string;
  productName: string;
  variantName: string;
  sku: string;
  category: string;
  price: number;
  cost: number;
  stock: number;
};

type CartItem = ProductOption & {
  quantity: number;
};

export function PosTerminal({
  products,
  storeSettings,
  members
}: {
  products: Product[];
  storeSettings: StoreSettings;
  members: MemberSummary[];
}) {
  const options = useMemo(
    () =>
      products.flatMap((product) =>
        getProductVariants(product).map((variant) => ({
          key: `${product.id}::${variant.id}`,
          productId: product.id,
          variantId: variant.id,
          productName: product.name,
          variantName: variant.name,
          sku: variant.sku,
          category: product.category,
          price: variant.sellPrice,
          cost: variant.costPrice,
          stock: variant.stock
        }))
      ),
    [products]
  );
  const [scanValue, setScanValue] = useState("");
  const [selectedKey, setSelectedKey] = useState("");
  const [cart, setCart] = useState<CartItem[]>([]);
  const [discount, setDiscount] = useState(0);
  const [receivedAmount, setReceivedAmount] = useState(0);
  const [paymentMethod, setPaymentMethod] = useState<SalePaymentMethod>("CASH");
  const [selectedMemberId, setSelectedMemberId] = useState("");
  const [message, setMessage] = useState("");
  const [isPending, startTransition] = useTransition();
  const lastAutoAddedBarcode = useRef("");
  const selectedMember = members.find((member) => member.id === selectedMemberId);
  const selectedOption = options.find((item) => item.key === selectedKey) ?? null;
  const selectedOutOfStock = Boolean(selectedOption && selectedOption.stock <= 0);

  const subtotal = cart.reduce(
    (sum, item) => sum + item.price * item.quantity,
    0
  );
  const safeDiscount = Math.min(Math.max(0, discount), subtotal);
  const netAmount = subtotal - safeDiscount;
  const changeAmount =
    paymentMethod === "CASH" ? Math.max(0, receivedAmount - netAmount) : 0;
  const memberDiscountAmount = selectedMember?.tier?.discountPercent
    ? Math.round((subtotal * selectedMember.tier.discountPercent) / 100)
    : 0;

  function addToCart(option: ProductOption) {
    setMessage("");
    setCart((current) => {
      const existing = current.find((item) => item.key === option.key);
      const currentQuantity = existing?.quantity ?? 0;

      if (option.stock <= 0) {
        setMessage(
          `${option.productName} - ${option.variantName} ສິນຄ້າໝົດສະຕ໋ອກ`
        );
        return current;
      }

      if (currentQuantity + 1 > option.stock) {
        setMessage("ສະຕ໋ອກສິນຄ້າບໍ່ພໍ");
        return current;
      }

      if (existing) {
        return current.map((item) =>
          item.key === option.key
            ? { ...item, quantity: item.quantity + 1 }
            : item
        );
      }

      return [{ ...option, quantity: 1 }, ...current];
    });
  }

  function addByBarcode(value: string) {
    const barcode = value.trim().toLowerCase();

    if (!barcode) {
      return;
    }

    if (lastAutoAddedBarcode.current === barcode) {
      lastAutoAddedBarcode.current = "";
      setScanValue("");
      return;
    }

    const matched = options.find((option) => option.sku.toLowerCase() === barcode);

    if (!matched) {
      setMessage("ບໍ່ພົບ SKU / Barcode ນີ້");
      return;
    }

    setSelectedKey(matched.key);
    setScanValue("");
    addToCart(matched);
  }

  function handleScanChange(value: string) {
    setScanValue(value);

    const barcode = value.trim().toLowerCase();
    const matched = options.find((option) => option.sku.toLowerCase() === barcode);

    if (!matched) {
      return;
    }

    lastAutoAddedBarcode.current = barcode;
    setSelectedKey(matched.key);
    setScanValue("");
    addToCart(matched);
  }

  function handleManualSelect(key: string) {
    setSelectedKey(key);

    const option = options.find((item) => item.key === key);

    if (!option) {
      return;
    }

    addToCart(option);
  }

  function updateQuantity(key: string, quantity: number) {
    const option = options.find((item) => item.key === key);

    if (!option) {
      return;
    }

    if (quantity <= 0) {
      setCart((current) => current.filter((item) => item.key !== key));
      return;
    }

    if (quantity > option.stock) {
      setMessage("ສະຕ໋ອກສິນຄ້າບໍ່ພໍ");
      return;
    }

    setMessage("");
    setCart((current) =>
      current.map((item) =>
        item.key === key ? { ...item, quantity } : item
      )
    );
  }

  function saveAndPrint() {
    setMessage("");

    startTransition(async () => {
      const result = await createPosSale({
        items: cart.map((item) => ({
          productId: item.productId,
          variantId: item.variantId,
          quantity: item.quantity
        })),
        discount: safeDiscount,
        paymentMethod,
        receivedAmount,
        memberId: selectedMemberId
      });

      if (!result.ok || !result.sale) {
        setMessage(result.message);
        return;
      }

      printPosReceipt(result.sale, storeSettings);
      setCart([]);
      setDiscount(0);
      setReceivedAmount(0);
      setScanValue("");
      setSelectedKey("");
      setSelectedMemberId("");
      setMessage(result.message);
    });
  }

  return (
    <div className="grid gap-4 xl:grid-cols-[1fr_22rem]">
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Barcode className="h-5 w-5" aria-hidden />
            ຄິດໄລ່ເງິນ / ປິ້ນບິນ
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid gap-3 md:grid-cols-[1fr_1fr_auto]">
            <label className="space-y-1.5">
              <span className="text-sm font-semibold text-zinc-700">
                ສະແກນ SKU / Barcode
              </span>
              <Input
                value={scanValue}
                onChange={(event) => handleScanChange(event.target.value)}
                onKeyDown={(event) => {
                  if (event.key === "Enter") {
                    event.preventDefault();
                    addByBarcode(scanValue);
                  }
                }}
                placeholder="ຍິງ Barcode ແລ້ວເພີ່ມອັດຕະໂນມັດ"
                autoComplete="off"
                autoFocus
              />
            </label>
            <label className="space-y-1.5">
              <span className="text-sm font-semibold text-zinc-700">
                ເລືອກສິນຄ້າເອງ
              </span>
              <Select
                value={selectedKey}
                onChange={(event) => handleManualSelect(event.target.value)}
              >
                <option value="">ເລືອກແລ້ວເພີ່ມອັດຕະໂນມັດ</option>
                {options.map((option) => (
                  <option key={option.key} value={option.key}>
                    {option.productName} - {option.variantName} ({option.sku}) ·{" "}
                    {option.stock <= 0 ? "ໝົດສະຕ໋ອກ" : `ສະຕ໋ອກ ${option.stock}`}
                  </option>
                ))}
              </Select>
              {selectedOutOfStock ? (
                <p className="rounded-md border border-rose-200 bg-rose-50 px-3 py-2 text-sm font-bold text-rose-700">
                  {selectedOption?.productName} - {selectedOption?.variantName} ໝົດສະຕ໋ອກ
                  ບໍ່ສາມາດເພີ່ມໃສ່ບິນໄດ້
                </p>
              ) : null}
            </label>
            <div className="flex items-end">
              <Button
                type="button"
                className="w-full md:w-auto"
                onClick={() => {
                  const option = options.find((item) => item.key === selectedKey);
                  if (option) {
                    addToCart(option);
                  }
                }}
                disabled={!selectedKey || selectedOutOfStock}
              >
                <Plus className="h-4 w-4" aria-hidden />
                ເພີ່ມ
              </Button>
            </div>
          </div>

          {message ? (
            <div className="rounded-md border border-rose-200 bg-rose-50 px-3 py-2 text-sm font-bold text-rose-700">
              {message}
            </div>
          ) : null}

          <div className="space-y-2">
            {cart.length ? (
              cart.map((item) => (
                <div
                  key={item.key}
                  className="grid gap-3 rounded-md border border-zinc-200 p-3 md:grid-cols-[1fr_auto]"
                >
                  <div className="min-w-0">
                    <p className="font-bold text-zinc-950">
                      {item.productName} - {item.variantName}
                    </p>
                    <p className="text-sm text-zinc-500">
                      {item.sku} · {formatCurrency(item.price)} · ສະຕ໋ອກ{" "}
                      {item.stock}
                    </p>
                    <p className="mt-1 text-sm font-bold text-zinc-950">
                      {formatCurrency(item.price * item.quantity)}
                    </p>
                  </div>
                  <div className="flex items-center gap-2">
                    <Button
                      type="button"
                      variant="secondary"
                      className="min-h-9 px-2"
                      onClick={() => updateQuantity(item.key, item.quantity - 1)}
                    >
                      <Minus className="h-4 w-4" aria-hidden />
                    </Button>
                    <Input
                      value={item.quantity}
                      min={1}
                      max={item.stock}
                      type="number"
                      onChange={(event) =>
                        updateQuantity(item.key, Number(event.target.value))
                      }
                      className="w-20 text-center"
                    />
                    <Button
                      type="button"
                      variant="secondary"
                      className="min-h-9 px-2"
                      onClick={() => updateQuantity(item.key, item.quantity + 1)}
                    >
                      <Plus className="h-4 w-4" aria-hidden />
                    </Button>
                    <Button
                      type="button"
                      variant="ghost"
                      className="min-h-9 px-2 text-rose-600 hover:bg-rose-50"
                      onClick={() => updateQuantity(item.key, 0)}
                    >
                      <Trash2 className="h-4 w-4" aria-hidden />
                    </Button>
                  </div>
                </div>
              ))
            ) : (
              <div className="rounded-md border border-dashed border-zinc-300 p-8 text-center text-sm text-zinc-500">
                ສະແກນສິນຄ້າ ຫຼືເລືອກສິນຄ້າເພື່ອເລີ່ມຂາຍ
              </div>
            )}
          </div>
        </CardContent>
      </Card>

      <Card className="h-fit">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Banknote className="h-5 w-5" aria-hidden />
            ສະຫຼຸບບິນ
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          <div className="rounded-md border border-zinc-200 p-3">
            <label className="space-y-1.5">
              <span className="flex items-center gap-2 text-sm font-semibold text-zinc-700">
                <UserRound className="h-4 w-4" aria-hidden />
                ສະມາຊິກ
              </span>
              <Select
                value={selectedMemberId}
                onChange={(event) => setSelectedMemberId(event.target.value)}
              >
                <option value="">ບໍ່ເລືອກສະມາຊິກ</option>
                {members.map((member) => (
                  <option key={member.id} value={member.id}>
                    {member.name} - {member.phone}
                    {member.tier ? ` - ${member.tier.name}` : ""}
                  </option>
                ))}
              </Select>
            </label>
            {selectedMember ? (
              <div className="mt-2 rounded-md bg-zinc-50 p-2 text-xs text-zinc-600">
                <p className="font-bold text-zinc-950">
                  {selectedMember.name} / {selectedMember.phone}
                </p>
                <p>
                  ລະດັບ: {selectedMember.tier?.name ?? "-"} · ສ່ວນຫຼຸດ{" "}
                  {selectedMember.tier?.discountPercent ?? 0}%
                </p>
                {memberDiscountAmount > 0 ? (
                  <Button
                    type="button"
                    variant="secondary"
                    className="mt-2 min-h-8 w-full text-xs"
                    onClick={() => setDiscount(memberDiscountAmount)}
                  >
                    ໃຊ້ສ່ວນຫຼຸດ {formatCurrency(memberDiscountAmount)}
                  </Button>
                ) : null}
              </div>
            ) : null}
          </div>
          <SummaryRow label="ຍອດລວມ" value={formatCurrency(subtotal)} />
          <label className="space-y-1.5">
            <span className="text-sm font-semibold text-zinc-700">ສ່ວນຫຼຸດ</span>
            <MoneyInput
              value={discount}
              min={0}
              onValueChange={setDiscount}
            />
          </label>
          <label className="space-y-1.5">
            <span className="text-sm font-semibold text-zinc-700">
              ວິທີຊໍາລະ
            </span>
            <Select
              value={paymentMethod}
              onChange={(event) =>
                setPaymentMethod(event.target.value as SalePaymentMethod)
              }
            >
              <option value="CASH">ເງິນສົດ</option>
              <option value="TRANSFER">ໂອນເງິນ</option>
              <option value="OTHER">ອື່ນໆ</option>
            </Select>
          </label>
          {paymentMethod === "CASH" ? (
            <label className="space-y-1.5">
              <span className="text-sm font-semibold text-zinc-700">ຮັບເງິນ</span>
              <MoneyInput
                value={receivedAmount}
                min={0}
                onValueChange={setReceivedAmount}
              />
            </label>
          ) : null}
          <div className="rounded-md bg-zinc-50 p-3">
            <SummaryRow label="ຍອດສຸດທິ" value={formatCurrency(netAmount)} strong />
            {paymentMethod === "CASH" ? (
              <SummaryRow label="ເງິນທອນ" value={formatCurrency(changeAmount)} />
            ) : null}
          </div>
          <Button
            type="button"
            className="w-full"
            onClick={saveAndPrint}
            disabled={!cart.length || isPending}
          >
            <Printer className="h-4 w-4" aria-hidden />
            {isPending ? "ກໍາລັງບັນທຶກ..." : "ບັນທຶກ / ປິ້ນບິນ"}
          </Button>
        </CardContent>
      </Card>
    </div>
  );
}

function SummaryRow({
  label,
  value,
  strong = false
}: {
  label: string;
  value: string;
  strong?: boolean;
}) {
  return (
    <div className="flex items-center justify-between gap-3 py-1">
      <span className="text-sm text-zinc-500">{label}</span>
      <span className={strong ? "text-xl font-bold" : "font-bold"}>{value}</span>
    </div>
  );
}

function printPosReceipt(sale: Sale, storeSettings: StoreSettings) {
  const logoUrl = storeSettings.posReceiptLogoUrl
    ? `${window.location.origin}${storeSettings.posReceiptLogoUrl}`
    : "";
  const receiptHtml = getPosReceiptHtml(sale, storeSettings, logoUrl);
  const printWindow = window.open("", "_blank", "width=420,height=720");

  if (!printWindow) {
    printReceiptInFrame(receiptHtml);
    return;
  }

  printWindow.document.write(receiptHtml);
  printWindow.document.close();
  printWhenReady(printWindow);
}

function getPosReceiptHtml(
  sale: Sale,
  storeSettings: StoreSettings,
  logoUrl: string
) {
  const receiptWidth = storeSettings.posReceiptSize === "POS_58MM" ? "58mm" : "80mm";
  const logoWidth = storeSettings.posReceiptSize === "POS_58MM" ? "76px" : "96px";
  const logoHeight = storeSettings.posReceiptSize === "POS_58MM" ? "52px" : "64px";

  return `
    <!doctype html>
    <html>
      <head>
        <meta charset="utf-8" />
        <base href="${window.location.origin}" />
        <title>POS Receipt</title>
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
          @page { size: ${receiptWidth} auto; margin: 0; }
          * { box-sizing: border-box; font-family: "Noto Sans Lao", Arial, sans-serif !important; }
          html, body { width: ${receiptWidth}; margin: 0; font-family: "Noto Sans Lao", Arial, sans-serif !important; }
          body { color: #09090b; background: #ffffff; }
          .receipt { width: ${receiptWidth}; padding: 8px; background: #ffffff; }
          .header { text-align: center; border-bottom: 1px dashed #18181b; padding-bottom: 8px; }
          .logo { display: block; max-width: ${logoWidth}; max-height: ${logoHeight}; object-fit: contain; margin: 0 auto 6px; }
          h1 { font-size: 17px; margin: 0; line-height: 1.25; }
          .subtitle { font-size: 11px; font-weight: 700; margin-top: 3px; }
          .meta { font-size: 10px; color: #52525b; margin-top: 5px; }
          .items { padding: 8px 0; border-bottom: 1px dashed #18181b; }
          .item { margin-bottom: 7px; }
          .name { font-size: 12px; font-weight: 700; line-height: 1.3; }
          .line { display: flex; justify-content: space-between; gap: 8px; font-size: 11px; line-height: 1.4; }
          .totals { padding-top: 8px; }
          .total { font-size: 16px; font-weight: 700; }
          .thanks { margin-top: 10px; text-align: center; font-size: 11px; font-weight: 700; }
          @media screen { body { padding: 10px; } .receipt { border: 1px solid #18181b; } }
        </style>
      </head>
      <body>
        <div class="receipt">
          <div class="header">
            ${logoUrl ? `<img class="logo" src="${escapeHtml(logoUrl)}" alt="${escapeHtml(storeSettings.posReceiptName)}" />` : ""}
            <h1>${escapeHtml(storeSettings.posReceiptName)}</h1>
            ${storeSettings.posReceiptSubtitle ? `<div class="subtitle">${escapeHtml(storeSettings.posReceiptSubtitle)}</div>` : ""}
            ${storeSettings.posReceiptNote ? `<div class="subtitle">${escapeHtml(storeSettings.posReceiptNote)}</div>` : ""}
            <div class="meta">${formatReceiptDate(new Date(sale.createdAt))}</div>
            <div class="meta">Bill: ${escapeHtml(sale.saleNo ?? sale.id.slice(-8).toUpperCase())}</div>
            ${sale.cashierName ? `<div class="meta">Cashier: ${escapeHtml(sale.cashierName)}</div>` : ""}
            ${sale.memberName ? `<div class="meta">Member: ${escapeHtml(sale.memberName)} / ${escapeHtml(sale.memberPhone ?? "")}</div>` : ""}
          </div>
          <div class="items">
            ${sale.items
              .map(
                (item) => `
                  <div class="item">
                    <div class="name">${escapeHtml(item.name)}${item.variantName ? ` - ${escapeHtml(item.variantName)}` : ""}</div>
                    <div class="line"><span>${item.quantity} x ${formatCurrency(item.price)}</span><span>${formatCurrency(item.price * item.quantity)}</span></div>
                  </div>
                `
              )
              .join("")}
          </div>
          <div class="totals">
            <div class="line"><span>ຍອດລວມ</span><strong>${formatCurrency(sale.totalAmount)}</strong></div>
            <div class="line"><span>ສ່ວນຫຼຸດ</span><strong>${formatCurrency(sale.discount)}</strong></div>
            <div class="line total"><span>ຍອດສຸດທິ</span><span>${formatCurrency(sale.netAmount)}</span></div>
            <div class="line"><span>ຊໍາລະ</span><strong>${paymentMethodLabel(sale.paymentMethod)}</strong></div>
            ${
              sale.paymentMethod === "CASH"
                ? `<div class="line"><span>ຮັບເງິນ</span><strong>${formatCurrency(sale.receivedAmount ?? 0)}</strong></div>
                   <div class="line"><span>ເງິນທອນ</span><strong>${formatCurrency(sale.changeAmount ?? 0)}</strong></div>`
                : ""
            }
          </div>
          <div class="thanks">ຂອບໃຈທີ່ອຸດໜູນ</div>
        </div>
      </body>
    </html>
  `;
}

function printReceiptInFrame(receiptHtml: string) {
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
  frameWindow.document.write(receiptHtml);
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
    waitForFonts(printWindow),
    waitForImages(printWindow)
  ]);

  void ready.finally(printOnce);
  window.setTimeout(printOnce, 2000);
}

function waitForFonts(printWindow: Window) {
  if (!("fonts" in printWindow.document)) {
    return Promise.resolve();
  }

  const fonts = printWindow.document.fonts;

  return Promise.all([
    fonts.load('400 16px "Noto Sans Lao"'),
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

function formatReceiptDate(value: Date) {
  const date = new Date(value);
  const day = date.getDate();
  const month = date.getMonth() + 1;
  const year = date.getFullYear();
  const hours = String(date.getHours()).padStart(2, "0");
  const minutes = String(date.getMinutes()).padStart(2, "0");

  return `${day}/${month}/${year} ${hours}:${minutes}`;
}

function paymentMethodLabel(value: SalePaymentMethod) {
  if (value === "TRANSFER") {
    return "ໂອນເງິນ";
  }

  if (value === "OTHER") {
    return "ອື່ນໆ";
  }

  return "ເງິນສົດ";
}

function escapeHtml(value: string) {
  return value
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#039;");
}
