import type { Product, ProductVariant } from "../types";

export const EXPIRY_WARNING_DAYS = 30;
export const EXPIRY_DATE_ERROR = "ວັນທີບໍ່ຖືກຕ້ອງ ກະລຸນາພິມ ວັນ/ເດືອນ/ປີ (ຄ.ສ.) ເຊັ່ນ 31/12/2026";
const DAY_MS = 86_400_000;

export function getShopDate(now = new Date()) {
  const parts = new Intl.DateTimeFormat("en-US", {
    timeZone: "Asia/Vientiane",
    year: "numeric",
    month: "2-digit",
    day: "2-digit"
  }).formatToParts(now);
  const part = (type: string) => parts.find((item) => item.type === type)!.value;
  return `${part("year")}-${part("month")}-${part("day")}`;
}

export function isValidExpiryDate(value: string) {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(value) || value.startsWith("0000")) return false;
  const time = Date.parse(`${value}T00:00:00.000Z`);
  return Number.isFinite(time) && new Date(time).toISOString().slice(0, 10) === value;
}

// UI input is day-first; keep ISO dates compatible with the native picker and stored data.
// Empty string means optional/unset, while null means invalid or incomplete input.
export function normalizeExpiryDateInput(value: string): string | null {
  const trimmed = value.trim();
  if (!trimmed || isValidExpiryDate(trimmed)) return trimmed;

  const separated = /^(\d{1,2})([/-])(\d{1,2})\2(\d{4})$/.exec(trimmed);
  const compact = /^(\d{2})(\d{2})(\d{4})$/.exec(trimmed);
  const parts = separated ? [separated[1], separated[3], separated[4]] : compact?.slice(1);
  if (!parts) return null;

  const [day, month, year] = parts;
  const iso = `${year}-${month.padStart(2, "0")}-${day.padStart(2, "0")}`;
  return isValidExpiryDate(iso) ? iso : null;
}

export function parseExpiryDate(value: FormDataEntryValue | null | undefined) {
  if (value == null) return null;
  if (typeof value !== "string") throw new Error(EXPIRY_DATE_ERROR);
  const normalized = normalizeExpiryDateInput(value);
  if (normalized === null) throw new Error(EXPIRY_DATE_ERROR);
  return normalized || null;
}

export function getExpiryStatus(expiryDate?: string | null, today = getShopDate()) {
  if (!expiryDate || !isValidExpiryDate(expiryDate)) return null;
  const daysRemaining = Math.round(
    (Date.parse(`${expiryDate}T00:00:00Z`) - Date.parse(`${today}T00:00:00Z`)) / DAY_MS
  );
  const status = daysRemaining < 0 ? "EXPIRED"
    : daysRemaining === 0 ? "TODAY"
    : daysRemaining <= EXPIRY_WARNING_DAYS ? "SOON" : "OK";
  return { status, daysRemaining, expiryDate } as const;
}

export function formatExpiryDate(value: string) {
  const [year, month, day] = value.split("-");
  return `${day}/${month}/${year}`;
}

export function getExpiryLabel(expiry: NonNullable<ReturnType<typeof getExpiryStatus>>) {
  if (expiry.status === "EXPIRED") return `ໝົດອາຍຸແລ້ວ ${Math.abs(expiry.daysRemaining)} ມື້`;
  if (expiry.status === "TODAY") return "ໝົດອາຍຸມື້ນີ້";
  return `ອີກ ${expiry.daysRemaining} ມື້ໝົດອາຍຸ`;
}

export type ProductExpiryAlert = {
  product: Product;
  variant: ProductVariant;
  expiry: NonNullable<ReturnType<typeof getExpiryStatus>>;
};

export function getProductExpiryAlerts(products: Product[], today = getShopDate()) {
  const alerts: ProductExpiryAlert[] = [];
  // Include inactive stock too: taking an item off sale does not remove it from the shelf.
  for (const product of products) {
    for (const variant of product.variants ?? []) {
      const expiry = getExpiryStatus(variant.expiryDate, today);
      if (variant.stock > 0 && expiry && expiry.status !== "OK") {
        alerts.push({ product, variant, expiry });
      }
    }
  }
  return alerts.sort((a, b) => a.expiry.daysRemaining - b.expiry.daysRemaining);
}
