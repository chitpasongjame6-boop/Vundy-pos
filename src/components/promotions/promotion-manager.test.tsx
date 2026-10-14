import { afterAll, describe, expect, it, vi } from "vitest";
import { renderToStaticMarkup } from "react-dom/server";
import { readFile, writeFile } from "node:fs/promises";
import { join } from "node:path";
import { PromotionManager } from "./promotion-manager";
import { PosTerminal } from "@/components/pos/pos-terminal";
import { buildPosReceiptHtml } from "@/components/pos/pos-receipt-html";
import { defaultStoreSettings } from "@/lib/local-store";
import type { Product, Promotion, Sale } from "@/types";

vi.mock("next/navigation", () => ({ useRouter: () => ({ refresh: vi.fn() }) }));
vi.mock("@/actions/promotion.action", () => ({ savePromotion: vi.fn(), setPromotionEnabled: vi.fn(), deletePromotion: vi.fn(), getPosPromotions: vi.fn() }));
vi.mock("@/actions/pos.action", () => ({ createPosSale: vi.fn() }));
const now = new Date("2026-10-14T03:00:00Z");
const product: Product = { id: "p1", name: "VL Perfume", sku: "VL-10", category: "Perfume", costPrice: 100000, sellPrice: 250000,
  stock: 10, lowStockAlert: 2, isActive: true, createdAt: now, updatedAt: now, variants: [
    { id: "10ml", name: "10 ml", sku: "VL-10", sellPrice: 250000, costPrice: 100000, stock: 10, lowStockAlert: 2 },
    { id: "100ml", name: "100 ml", sku: "VL-100", sellPrice: 1500000, costPrice: 800000, stock: 5, lowStockAlert: 2 }
  ] };
const promotion: Promotion = { id: "promo1", name: "ໂປຣປີໃໝ່", kind: "FIXED_PRICE", value: 200000, targets: [{ productId: "p1", variantId: "10ml" }],
  startsAt: now, endsAt: new Date("2026-10-15T17:00:00Z"), isActive: true, createdAt: now, updatedAt: now };
const rules = [promotion, { ...promotion, id: "future", name: "ໂປຣທ້າຍເດືອນ", kind: "PERCENT" as const, value: 10, startsAt: "2026-10-30T00:00:00Z", endsAt: "2026-11-01T00:00:00Z" },
  { ...promotion, id: "paused", name: "ໂປຣທີ່ຢຸດໄວ້", isActive: false }];
const renderManager = () => renderToStaticMarkup(<PromotionManager products={[product]} promotions={rules} serverNow={now.getTime()} />);

describe("promotion screens", () => {
  it("shows searchable variant selection, explicit Lao time and all promotion statuses", () => {
    const html = renderManager();
    for (const label of ["VL Perfume - 10 ml", "VL Perfume - 100 ml", "datetime-local", "UTC+7", "ກໍາລັງໃຊ້", "ລໍຖ້າເລີ່ມ", "ຢຸດໄວ້", "ຄົ້ນຫາສິນຄ້າ"]) expect(html).toContain(label);
    expect(html).toContain('placeholder="200000"');
  });
  it("provides a clearly named delete button even for paused and expired promotions", () => {
    const allRules = [...rules, { ...promotion, id: "expired", name: "Expired promotion", endsAt: now }];
    const html = renderToStaticMarkup(<PromotionManager products={[product]} promotions={allRules} serverNow={now.getTime()} />);
    for (const rule of allRules) {
      const button = html.match(new RegExp(`<button[^>]*aria-label="ລຶບໂປຣໂມຊັນ ${rule.name}"[^>]*>[\\s\\S]*?</button>`))?.[0];
      expect(button).toBeDefined();
      expect(button).toContain("ລຶບ");
      expect(button).not.toMatch(/\sdisabled(?:=|[\s>])/);
    }
  });
  it("shows staff both regular and promotion prices without exposing manual discounts", () => {
    const html = renderToStaticMarkup(<PosTerminal products={[{ ...product, costPrice: 0, variants: product.variants?.map(item => ({ ...item, costPrice: 0 })) }]} members={[]} userRole="STAFF" storeSettings={defaultStoreSettings} initialPricing={{ promotions: [promotion], serverNow: now.getTime() }} />);
    for (const label of ["₭200,000", "₭250,000", "ໂປຣປີໃໝ່", "₭1,500,000"]) expect(html).toContain(label);
    expect(html).not.toContain("₭800,000");
    expect(html).toContain("ສ່ວນຫຼຸດຈັດການໂດຍເຈົ້າຂອງຮ້ານເທົ່ານັ້ນ");
  });
});

// Optional read-only visual fixtures: actual React components/CSS, synthetic data only.
afterAll(async () => {
  const dir = process.env.PROMOTIONS_QA_DIR;
  if (!dir) return;
  const { default: postcss } = await import("postcss");
  const { default: tailwind } = await import("@tailwindcss/postcss");
  const path = join(process.cwd(), "src/app/globals.css");
  let { css } = await postcss([tailwind()]).process(await readFile(path, "utf8"), { from: path });
  const fonts = await Promise.all(["lao", "latin", "latin-ext"].map(async font => {
    const name = `noto-sans-lao-${font}.woff2`;
    return [name, `data:font/woff2;base64,${(await readFile(join(process.cwd(), "public/fonts", name))).toString("base64")}`];
  }));
  for (const [name, url] of fonts) css = css.replaceAll(`/fonts/${name}`, url);
  await writeFile(join(dir, "promotions.html"), `<!doctype html><html lang="lo"><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><style>${css}</style><body><main style="padding:24px;max-width:1400px;margin:auto"><h1 style="font-size:28px;font-weight:800;margin-bottom:20px">ໂປຣໂມຊັນ</h1>${renderManager()}</main></body></html>`);
  const sale: Sale = { id: "qa", saleNo: "POS-PROMO-TEST", cashierName: "Staff", totalAmount: 550000, totalCost: 220000, profit: 230000,
    discount: 100000, netAmount: 450000, paymentMethod: "CASH", receivedAmount: 500000, changeAmount: 50000, createdAt: now, updatedAt: now,
    items: [{ productId: "p1", name: "VL Perfume", variantName: "10 ml", sku: "VL-10", quantity: 2, cost: 100000, price: 200000, originalPrice: 250000, promotionId: "promo1", promotionName: promotion.name },
      { productId: "soap", name: "VL Soap", sku: "S", quantity: 1, cost: 20000, price: 50000 }] };
  for (const size of ["POS_80MM", "POS_58MM"] as const) {
    let html = buildPosReceiptHtml(sale, { ...defaultStoreSettings, posReceiptSize: size }, "");
    for (const [name, url] of fonts) html = html.replaceAll(`/fonts/${name}`, url);
    await writeFile(join(dir, `${size}.html`), html);
  }
}, 30000);
