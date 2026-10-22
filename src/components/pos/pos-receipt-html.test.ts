import { afterAll, describe, expect, it } from "vitest";
import { readFile, writeFile } from "node:fs/promises";
import { join } from "node:path";
import type { Sale, StoreSettings } from "@/types";
import { buildPosReceiptHtml } from "./pos-receipt-html";

const settings: StoreSettings = {
  storeName: "VUNDY Beauty & Cosmetice", storeSubtitle: "", storeNote: "", logoUrl: null,
  posReceiptName: "VUNDY Beauty & Cosmetice", posReceiptSubtitle: "", posReceiptNote: "",
  posReceiptLogoUrl: "/vundy-logo.png", posReceiptSize: "POS_80MM", orderBillSize: "A4",
  shippingCompanies: [], taxEnabled: false, taxRate: 0, taxId: "", receiptAddress: "",
  defaultBranchName: "", defaultRegisterName: "", staffMaxDiscountPercent: 0, requireShiftForSale: false
};

const sale: Sale = {
  id: "receipt-test", saleNo: "POS-20260520-001", cashierName: "Staff", memberName: "Tay", memberPhone: "2058951122",
  items: [
    { productId: "coffee", sku: "PRIVATE-SKU", name: "VL Coffee Premium", variantName: "10ml", quantity: 2, price: 55000, cost: 30000 },
    { productId: "snack", sku: "SNACK", name: "VL Snack Box", variantName: "ກ່ອງນ້ອຍ", quantity: 1, price: 85000, cost: 45000 }
  ],
  totalAmount: 195000, totalCost: 105000, profit: 80000, discount: 10000, netAmount: 185000,
  paymentMethod: "CASH", receivedAmount: 200000, changeAmount: 15000,
  createdAt: new Date("2026-10-13T12:08:00Z"), updatedAt: new Date("2026-10-13T12:08:00Z")
};

const referencePromotionSale: Sale = {
  ...sale, saleNo: "POS-20261014-DEMO", cashierName: "ເຈົ້າຂອງຮ້ານ", memberName: null, memberPhone: null,
  items: [
    { productId: "oldspice", sku: "OLD", name: "oldspice", quantity: 1, price: 205000, cost: 100000 },
    { productId: "perfume-lo", sku: "LO", name: "ນ້ຳຫອມ", quantity: 1, price: 237500, originalPrice: 250000,
      cost: 100000, promotionId: "promo", promotionName: "ໂປຣ 5%" },
    { productId: "perfume", sku: "PERFUME", name: "perfume", variantName: "10", quantity: 1, price: 166250,
      originalPrice: 175000, cost: 80000, promotionId: "promo", promotionName: "ໂປຣ 5%" }
  ],
  totalAmount: 630000, totalCost: 280000, discount: 21250, netAmount: 608750, profit: 328750,
  receivedAmount: 650000, changeAmount: 41250,
  createdAt: new Date("2026-10-13T19:18:00Z"), updatedAt: new Date("2026-10-13T19:18:00Z")
};

describe("shared POS receipt layout", () => {
  it("prints ONLY kip for baht payments and never reprices a historical reprint", () => {
    const thbSale: Sale = { ...sale, tenderCurrency: "THB", tenderAmountMinor: 30000, exchangeRate: 6500000,
      receivedAmount: 195000, changeAmount: 10000 };
    const html = buildPosReceiptHtml(thbSale, { ...settings, thbEnabled: true, thbPaymentRate: 9000000 }, "");
    expect(html).toContain("ຮັບຊໍາລະທຽບກີບ");
    expect(html).toContain("<strong>₭195,000</strong>");
    expect(html).toContain("<strong>₭10,000</strong>");
    expect(html).not.toMatch(/฿|THB|ບາດ|6500000|9000000/);
    expect(html).not.toContain("₭270,000");
  });
  it("prints original prices and quantity-aware discounts from saved sale snapshots", () => {
    const promotionalSale: Sale = { ...sale, items: [{ ...sale.items[0], name: "Perfume", quantity: 2,
      price: 200000, originalPrice: 250000, promotionId: "old-promo", promotionName: '<New Year & Sale>' },
      { ...sale.items[1], name: "Soap", price: 50000, quantity: 1 }],
      totalAmount: 550000, discount: 100000, netAmount: 450000, receivedAmount: 500000, changeAmount: 50000 };
    const html = buildPosReceiptHtml(promotionalSale, settings, "");
    for (const text of ["2 x ₭250,000", "<span>₭500,000</span>", "<span>−₭100,000</span>", "1 x ₭50,000",
      "<strong>₭550,000</strong>", "<strong>−₭100,000</strong>", "<span>₭450,000</span>", "ສ່ວນຫຼຸດລວມ"]) expect(html).toContain(text);
    expect(html.match(/class="line item-discount"/g)).toHaveLength(1);
    expect(html).not.toContain("New Year");
    expect(html).not.toContain("→");
    expect(html).not.toContain("2 x ₭200,000");
    expect(html).not.toContain("₭400,000");
  });

  it("matches layout 3 with mixed regular/promotional items without deducting discounts twice", () => {
    const html = buildPosReceiptHtml(referencePromotionSale, settings, "");
    for (const text of ["1 x ₭205,000", "1 x ₭250,000", "1 x ₭175,000",
      "<span>−₭12,500</span>", "<span>−₭8,750</span>", "ຍອດກ່ອນຫຼຸດ", "<strong>₭630,000</strong>",
      "<strong>−₭21,250</strong>", "<span>₭608,750</span>", "<strong>₭650,000</strong>", "<strong>₭41,250</strong>"]) expect(html).toContain(text);
    expect(html.match(/class="line item-discount"/g)).toHaveLength(2);
    expect(html).toContain('class="line payment-start"');
    expect(html).not.toContain("ໂປຣ 5%");
    expect(html).not.toContain("₭587,500");
  });

  it("omits item discount rows for old bills and unchanged prices", () => {
    const html = buildPosReceiptHtml({ ...sale, discount: 0, netAmount: sale.totalAmount,
      items: [sale.items[0], { ...sale.items[1], originalPrice: sale.items[1].price, promotionName: "No saving" }]
    }, settings, "");
    expect(html).not.toContain('class="line item-discount"');
    expect(html).not.toContain("−₭0");
    expect(html).not.toContain("No saving");
    expect(html).toContain("2 x ₭55,000");
    expect(html).toContain("<strong>₭0</strong>");
  });

  it("shows a fully discounted item even when the stored promotion name is absent", () => {
    const html = buildPosReceiptHtml({ ...sale,
      items: [{ ...sale.items[0], quantity: 1, originalPrice: 55000, price: 0, promotionName: null }],
      totalAmount: 55000, discount: 55000, netAmount: 0, receivedAmount: 0, changeAmount: 0
    }, settings, "");
    expect(html).toContain("1 x ₭55,000");
    expect(html).toContain('<div class="line item-discount"><span>ສ່ວນຫຼຸດ</span><span>−₭55,000</span></div>');
    expect(html).toContain('<div class="line total"><span>ຍອດສຸດທິ</span><span>₭0</span></div>');
    expect(html).not.toContain("1 x ₭0");
  });
  it("renders the reference bill and cash totals without a browser global", () => {
    const html = buildPosReceiptHtml(sale, settings, "/vundy-logo.png");
    expect(html).toContain('lang="lo"');
    expect(html).toContain("VUNDY Beauty &amp; Cosmetice");
    expect(html).toContain("Bill: POS-20260520-001");
    expect(html).toContain("Cashier: Staff");
    expect(html).toContain("Member: Tay / 2058951122");
    expect(html).toContain("VL Coffee Premium - 10ml");
    for (const text of ["2 x ₭55,000", "₭110,000", "₭85,000", "₭195,000", "₭10,000", "₭185,000", "₭200,000", "₭15,000"]) {
      expect(html).toContain(text);
    }
    expect(html).toContain("ຂອບໃຈທີ່ອຸດໜູນຮ້ານເຮົາ");
    expect(html).not.toContain("PRIVATE-SKU");
    expect(html).not.toContain("₭105,000");
    expect(html).not.toContain("₭80,000");
  });

  it("uses the Lao timezone for both preview and printed dates", () => {
    expect(buildPosReceiptHtml(sale, settings, "")).toContain("13/10/2026 19:08");
    expect(buildPosReceiptHtml({ ...sale, createdAt: new Date("2026-10-13T17:05:00Z") }, settings, ""))
      .toContain("14/10/2026 00:05");
  });

  it("uses compact logos, dashed dividers and the same border for screen and print", () => {
    const html = buildPosReceiptHtml(sale, settings, "/logo.png", "https://example.com");
    expect(html).toContain('<base href="https://example.com"');
    expect(html).toContain("width: 96px;");
    expect(html).toContain("height: 64px;");
    expect(html).toContain("border-bottom: 1px dashed");
    expect(html).toContain("border: 1px solid");
    expect(html).not.toContain("border-top: 1.5px");
    expect(html).not.toContain("border: 0;");
    expect(html).toContain('font-family: "Noto Sans Lao"');
  });

  it("fits 58mm and 80mm rolls with safe margins and long-name wrapping", () => {
    for (const [size, paper, printable] of [["POS_58MM", "58mm", "48mm"], ["POS_80MM", "80mm", "72mm"]] as const) {
      const html = buildPosReceiptHtml(sale, { ...settings, posReceiptSize: size }, "");
      expect(html).toContain(`width: ${paper};`);
      expect(html).toContain(`width: ${printable};`);
      expect(html).toContain("overflow-wrap: anywhere;");
      expect(html).toContain("break-inside: avoid;");
      expect(html).not.toContain(`size: ${paper} auto`);
    }
  });

  it("escapes user-entered text and logo attributes", () => {
    const html = buildPosReceiptHtml({ ...sale, memberName: '<script>alert("bad")</script>', paymentReference: "<img onerror=bad>" },
      { ...settings, posReceiptName: '<img src=x onerror="bad">' }, 'logo.png" onerror="bad');
    expect(html).not.toContain("<script>");
    expect(html).not.toContain('<img src=x');
    expect(html).toContain("&lt;script&gt;");
    expect(html).toContain('src="logo.png&quot; onerror=&quot;bad"');
  });

  it("omits absent optional details without blank logo space or dangling phone separators", () => {
    const html = buildPosReceiptHtml({ ...sale, cashierName: null, memberPhone: null }, settings, "");
    expect(html).not.toContain('<img class="logo"');
    expect(html).not.toContain("Cashier:");
    expect(html).toContain("Member: Tay</div>");
    expect(html).not.toContain("Member: Tay /");
  });

  it("retains transfer, split payments, tax and configured business details", () => {
    const html = buildPosReceiptHtml({ ...sale, paymentMethod: "SPLIT", payments: [
      { method: "CASH", amount: 85000 }, { method: "TRANSFER", amount: 100000 }
    ], paymentReference: "REF-123", taxRate: 10, taxAmount: 16818 },
    { ...settings, receiptAddress: "Vientiane", taxId: "TIN-123", posReceiptNote: "Call us" }, "");
    for (const text of ["ແບ່ງຈ່າຍ", "ໂອນເງິນ", "₭100,000", "REF-123", "ລວມອາກອນ 10%", "₭16,818", "Vientiane", "TIN-123", "Call us"]) {
      expect(html).toContain(text);
    }
    expect(html).not.toContain("ຮັບເງິນ");
    expect(html).not.toContain("ເງິນທອນ");
  });
});

// Opt-in visual QA: emit only synthetic receipts, with embedded local fonts/logo.
// Point POS_RECEIPT_QA_DIR at an existing temporary directory when running this test.
afterAll(async () => {
  const outputDir = process.env.POS_RECEIPT_QA_DIR;
  if (!outputDir) return;
  const logo = `data:image/png;base64,${(await readFile(join(process.cwd(), "public/vundy-logo.png"))).toString("base64")}`;
  for (const size of ["POS_80MM", "POS_58MM"] as const) {
    for (const [prefix, fixture] of [["", sale], ["PROMO_", referencePromotionSale]] as const) {
      let html = buildPosReceiptHtml(fixture, { ...settings, posReceiptSize: size }, logo);
      for (const font of ["lao", "latin", "latin-ext"]) {
        const filename = `noto-sans-lao-${font}.woff2`;
        const bytes = await readFile(join(process.cwd(), "public/fonts", filename));
        html = html.replace(`/fonts/${filename}`, `data:font/woff2;base64,${bytes.toString("base64")}`);
      }
      await writeFile(join(outputDir, `${prefix}${size}.html`), html);
    }
  }
});
