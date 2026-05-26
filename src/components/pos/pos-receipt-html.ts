"use client";

import type { Sale, SalePaymentMethod, StoreSettings } from "@/types";
import { formatCurrency } from "@/lib/utils";

export function buildPosReceiptHtml(
  sale: Sale,
  storeSettings: StoreSettings,
  logoUrl: string
) {
  const isSmallReceipt = storeSettings.posReceiptSize === "POS_58MM";
  const paperWidth = isSmallReceipt ? "58mm" : "80mm";
  const receiptWidth = isSmallReceipt ? "48mm" : "72mm";
  const logoWidth = isSmallReceipt ? "86px" : "128px";
  const logoHeight = isSmallReceipt ? "58px" : "82px";
  const receiptPadding = isSmallReceipt ? "5px 0" : "6px 0";
  const baseFontSize = isSmallReceipt ? "12px" : "13.8px";
  const titleFontSize = isSmallReceipt ? "16px" : "19px";
  const smallFontSize = isSmallReceipt ? "10.5px" : "12px";
  const itemFontSize = isSmallReceipt ? "12.2px" : "14.2px";
  const totalFontSize = isSmallReceipt ? "17px" : "20.5px";

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
          @page { size: ${paperWidth} auto; margin: 0; }
          * {
            box-sizing: border-box;
            color: #000000;
            font-family: "Noto Sans Lao", Arial, sans-serif !important;
            letter-spacing: 0;
            print-color-adjust: exact;
            -webkit-print-color-adjust: exact;
            text-rendering: geometricPrecision;
          }
          html, body {
            width: ${paperWidth};
            min-width: ${paperWidth};
            margin: 0;
            padding: 0;
            background: #ffffff;
            font-family: "Noto Sans Lao", Arial, sans-serif !important;
          }
          body {
            font-size: ${baseFontSize};
            font-weight: 700;
            line-height: 1.35;
          }
          .receipt {
            width: ${receiptWidth};
            margin: 0 auto;
            padding: ${receiptPadding};
            background: #ffffff;
          }
          .receipt,
          .receipt * {
            text-shadow:
              0.16px 0 #000000,
              -0.16px 0 #000000,
              0 0.16px #000000,
              0 -0.16px #000000;
          }
          .header {
            text-align: center;
            border-bottom: 2px solid #000000;
            padding-bottom: 7px;
          }
          .logo {
            display: block;
            max-width: ${logoWidth};
            max-height: ${logoHeight};
            object-fit: contain;
            margin: 0 auto 6px;
          }
          h1 {
            font-size: ${titleFontSize};
            font-weight: 800;
            margin: 0;
            line-height: 1.18;
          }
          .subtitle {
            font-size: ${smallFontSize};
            font-weight: 800;
            margin-top: 3px;
            line-height: 1.25;
          }
          .meta {
            font-size: ${smallFontSize};
            font-weight: 700;
            margin-top: 4px;
            line-height: 1.25;
          }
          .items {
            padding: 8px 0;
            border-bottom: 2px solid #000000;
          }
          .item {
            margin-bottom: 8px;
          }
          .item:last-child {
            margin-bottom: 0;
          }
          .name {
            font-size: ${itemFontSize};
            font-weight: 800;
            line-height: 1.3;
          }
          .line {
            display: flex;
            justify-content: space-between;
            gap: 8px;
            font-size: ${baseFontSize};
            font-weight: 700;
            line-height: 1.45;
          }
          .line strong {
            font-weight: 800;
          }
          .totals {
            padding-top: 8px;
          }
          .total {
            border-top: 2px solid #000000;
            margin-top: 5px;
            padding-top: 5px;
            font-size: ${totalFontSize};
            font-weight: 900;
          }
          .thanks {
            margin-top: 11px;
            text-align: center;
            font-size: ${baseFontSize};
            font-weight: 800;
          }
          @media screen {
            body { padding: 10px; }
            .receipt { border: 1px solid #000000; padding-left: 6px; padding-right: 6px; }
          }
          @media print {
            html, body { width: ${paperWidth}; min-width: ${paperWidth}; }
            body { padding: 0; }
            .receipt {
              border: 0;
              filter: contrast(180%);
              -webkit-text-stroke: 0.12px #000000;
            }
          }
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
