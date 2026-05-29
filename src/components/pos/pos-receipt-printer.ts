"use client";

import type { Sale, SalePaymentMethod, StoreSettings } from "@/types";
import { buildPosReceiptHtml } from "@/components/pos/pos-receipt-html";
import { resolvePublicAssetUrl } from "@/lib/asset-url";
import { formatCurrency } from "@/lib/utils";

export function printPosReceiptCopy(sale: Sale, storeSettings: StoreSettings) {
  const logoUrl = resolvePublicAssetUrl(
    storeSettings.posReceiptLogoUrl,
    window.location.origin
  );
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
  return buildPosReceiptHtml(sale, storeSettings, logoUrl);

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
          <div class="thanks">ຂອບໃຈທີ່ອຸດໜູນຮ້ານເຮົາ</div>
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

  const ready = withTimeout(
    Promise.all([waitForFonts(printWindow), waitForImages(printWindow)]),
    900
  );

  void ready.finally(printOnce);
  window.setTimeout(printOnce, 1000);
}

function withTimeout<T>(promise: Promise<T>, timeoutMs: number) {
  return Promise.race([
    promise,
    new Promise<void>((resolve) => window.setTimeout(resolve, timeoutMs))
  ]);
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

function escapeHtml(value: string | null | undefined) {
  return (value ?? "")
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#039;");
}
