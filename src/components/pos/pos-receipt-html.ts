import type { Sale, SalePaymentMethod, StoreSettings } from "@/types";
import { formatCurrency, formatProductVariantName } from "@/lib/utils";
import { getPromotionDiscount } from "@/lib/promotions";

export function buildPosReceiptHtml(
  sale: Sale,
  storeSettings: StoreSettings,
  logoUrl: string,
  origin?: string
) {
  const promotionDiscount = getPromotionDiscount(sale.items);
  const isSmallReceipt = storeSettings.posReceiptSize === "POS_58MM";
  const paperWidth = isSmallReceipt ? "58mm" : "80mm";
  const receiptWidth = isSmallReceipt ? "48mm" : "72mm";
  const logoWidth = isSmallReceipt ? "76px" : "96px";
  const logoHeight = isSmallReceipt ? "52px" : "64px";
  const receiptPadding = isSmallReceipt ? "6px" : "8px";
  const baseFontSize = isSmallReceipt ? "10px" : "11px";
  const titleFontSize = isSmallReceipt ? "14px" : "17px";
  const smallFontSize = isSmallReceipt ? "9px" : "10px";
  const itemFontSize = isSmallReceipt ? "11px" : "12px";
  const totalFontSize = isSmallReceipt ? "14px" : "16px";

  return `
    <!doctype html>
    <html lang="lo">
      <head>
        <meta charset="utf-8" />
        ${origin ? `<base href="${escapeHtml(origin)}" />` : ""}
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
          /* Use the printer's selected roll size; content keeps a safe printable width. */
          @page { size: auto; margin: 0; }
          * {
            box-sizing: border-box;
            font-family: "Noto Sans Lao", Tahoma, Arial, sans-serif !important;
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
            font-family: "Noto Sans Lao", Tahoma, Arial, sans-serif !important;
          }
          body {
            font-size: ${baseFontSize};
            color: #09090b;
            font-weight: 400;
            line-height: 1.5;
          }
          .receipt {
            width: ${receiptWidth};
            margin: 0 auto;
            padding: ${receiptPadding};
            background: #ffffff;
            border: 1px solid #27272a;
          }
          .header {
            text-align: center;
            border-bottom: 1px dashed #27272a;
            padding-bottom: 8px;
            break-inside: avoid;
          }
          .logo {
            display: block;
            width: ${logoWidth};
            height: ${logoHeight};
            max-width: 100%;
            object-fit: contain;
            object-position: center;
            margin: 0 auto 6px;
          }
          h1 {
            font-size: ${titleFontSize};
            font-weight: 700;
            margin: 0;
            line-height: 1.4;
            overflow-wrap: anywhere;
          }
          .subtitle {
            font-size: ${smallFontSize};
            font-weight: 600;
            margin-top: 3px;
            line-height: 1.25;
            overflow-wrap: anywhere;
          }
          .meta {
            font-size: ${smallFontSize};
            color: #52525b;
            font-weight: 400;
            line-height: 1.5;
            overflow-wrap: anywhere;
          }
          .meta:first-of-type { margin-top: 4px; }
          .items {
            padding: 8px 0;
            border-bottom: 1px dashed #27272a;
          }
          .item {
            margin-bottom: 8px;
            break-inside: avoid;
            page-break-inside: avoid;
          }
          .item:last-child {
            margin-bottom: 0;
          }
          .name {
            font-size: ${itemFontSize};
            font-weight: 700;
            line-height: 1.3;
            overflow-wrap: anywhere;
          }
          .line {
            display: flex;
            justify-content: space-between;
            gap: 8px;
            font-size: ${baseFontSize};
            font-weight: 400;
            line-height: 1.5;
            align-items: baseline;
          }
          .line > :first-child { min-width: 0; overflow-wrap: anywhere; }
          .line > :last-child {
            max-width: 65%;
            text-align: right;
            overflow-wrap: anywhere;
            font-variant-numeric: tabular-nums;
          }
          .line strong {
            font-weight: 700;
          }
          .item-discount {
            margin-top: 2px;
            font-size: ${smallFontSize};
          }
          .totals {
            padding-top: 8px;
            break-inside: avoid;
          }
          .totals .line + .line { margin-top: 3px; }
          .totals .line.payment-start {
            margin-top: 8px;
            padding-top: 8px;
            border-top: 1px dashed #27272a;
          }
          .total {
            font-size: ${totalFontSize};
            font-weight: 700;
          }
          .thanks {
            margin-top: 10px;
            text-align: center;
            font-size: ${baseFontSize};
            font-weight: 700;
            break-inside: avoid;
          }
          @media screen {
            body { padding: 10px 0; }
          }
          @media print {
            html, body { width: ${paperWidth}; min-width: ${paperWidth}; }
            body { padding: 2mm 0; }
            .meta { color: #000000; }
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
            ${storeSettings.receiptAddress ? `<div class="subtitle">${escapeHtml(storeSettings.receiptAddress)}</div>` : ""}
            ${storeSettings.taxId ? `<div class="subtitle">TIN: ${escapeHtml(storeSettings.taxId)}</div>` : ""}
            <div class="meta" style="margin-top: 4px">${formatReceiptDate(new Date(sale.createdAt))}</div>
            <div class="meta">Bill: ${escapeHtml(sale.saleNo ?? sale.id.slice(-8).toUpperCase())}</div>
            ${sale.cashierName ? `<div class="meta">Cashier: ${escapeHtml(sale.cashierName)}</div>` : ""}
            ${sale.memberName ? `<div class="meta">Member: ${escapeHtml(sale.memberName)}${sale.memberPhone ? ` / ${escapeHtml(sale.memberPhone)}` : ""}</div>` : ""}
          </div>
          <div class="items">
            ${sale.items
              .map((item) => {
                // Use the saved sale prices so reprints stay correct after a promotion ends.
                const originalPrice = item.originalPrice ?? item.price;
                const itemDiscount = getPromotionDiscount([item]);
                return `
                  <div class="item">
                    <div class="name">${escapeHtml(formatProductVariantName(item.name, item.variantName))}</div>
                    <div class="line"><span>${item.quantity} x ${formatCurrency(originalPrice)}</span><span>${formatCurrency(originalPrice * item.quantity)}</span></div>
                    ${itemDiscount > 0 ? `<div class="line item-discount"><span>ສ່ວນຫຼຸດ</span><span>−${formatCurrency(itemDiscount)}</span></div>` : ""}
                  </div>
                `;
              })
              .join("")}
          </div>
          <div class="totals">
            <div class="line"><span>${promotionDiscount > 0 ? "ຍອດກ່ອນຫຼຸດ" : "ຍອດລວມ"}</span><strong>${formatCurrency(sale.totalAmount)}</strong></div>
            <div class="line"><span>${promotionDiscount > 0 ? "ສ່ວນຫຼຸດລວມ" : "ສ່ວນຫຼຸດ"}</span><strong>${sale.discount > 0 ? "−" : ""}${formatCurrency(sale.discount)}</strong></div>
            <div class="line total"><span>ຍອດສຸດທິ</span><span>${formatCurrency(sale.netAmount)}</span></div>
            <div class="line payment-start"><span>ຊໍາລະ</span><strong>${paymentMethodLabel(sale.paymentMethod)}</strong></div>
            ${sale.paymentReference ? `<div class="line"><span>ອ້າງອີງ</span><strong>${escapeHtml(sale.paymentReference)}</strong></div>` : ""}
            ${sale.paymentMethod === "SPLIT" && sale.payments?.length
              ? sale.payments.map((payment) => `<div class="line"><span>${paymentMethodLabel(payment.method)}</span><strong>${formatCurrency(payment.amount)}</strong></div>`).join("")
              : ""}
            ${(sale.taxAmount ?? 0) > 0 ? `<div class="line"><span>ລວມອາກອນ ${sale.taxRate ?? 0}%</span><strong>${formatCurrency(sale.taxAmount ?? 0)}</strong></div>` : ""}
            ${
              sale.paymentMethod === "CASH"
                ? `<div class="line"><span>${sale.tenderCurrency === "THB" ? "ຮັບຊໍາລະທຽບກີບ" : "ຮັບເງິນ"}</span><strong>${formatCurrency(sale.receivedAmount ?? 0)}</strong></div>
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

function formatReceiptDate(value: Date) {
  const parts = new Intl.DateTimeFormat("en-GB", {
    timeZone: "Asia/Vientiane", day: "2-digit", month: "2-digit", year: "numeric",
    hour: "2-digit", minute: "2-digit", hourCycle: "h23"
  }).formatToParts(value);
  const part = (type: string) => parts.find((entry) => entry.type === type)?.value ?? "";
  return `${part("day")}/${part("month")}/${part("year")} ${part("hour")}:${part("minute")}`;
}

function paymentMethodLabel(value: SalePaymentMethod) {
  if (value === "SPLIT") {
    return "ແບ່ງຈ່າຍ";
  }
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
