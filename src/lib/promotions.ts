import type { Product, Promotion, PromotionInput, SaleItem } from "@/types";
import { getProductVariants } from "@/lib/utils";

// datetime-local has no timezone. Always interpret shop input as UTC+07:00.
export function parseLaoDateTime(value: string): Date | null {
  if (!/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}$/.test(value)) return null;
  const date = new Date(`${value}:00+07:00`);
  if (!Number.isFinite(date.getTime())) return null;
  return toLaoDateTimeInput(date) === value ? date : null;
}

export function toLaoDateTimeInput(value: Date | string): string {
  const date = new Date(value);
  return new Date(date.getTime() + 7 * 60 * 60 * 1000).toISOString().slice(0, 16);
}

export function promotionStatus(promotion: Promotion, now: number) {
  if (!promotion.isActive) return "PAUSED";
  if (now < new Date(promotion.startsAt).getTime()) return "SCHEDULED";
  if (now >= new Date(promotion.endsAt).getTime()) return "EXPIRED";
  return "ACTIVE";
}

export function promotionPrice(originalPrice: number, kind: Promotion["kind"], value: number) {
  return Math.max(0, Math.min(originalPrice, kind === "PERCENT"
    ? originalPrice - Math.round(originalPrice * value / 100)
    : value));
}

export function resolvePromotionPrice(
  productId: string, variantId: string, originalPrice: number,
  promotions: Promotion[], now: number
) {
  let price = originalPrice;
  let selected: Promotion | undefined;
  for (const promotion of promotions) {
    if (promotionStatus(promotion, now) !== "ACTIVE" ||
      !promotion.targets.some(target => target.productId === productId && target.variantId === variantId)) continue;
    const candidate = promotionPrice(originalPrice, promotion.kind, promotion.value);
    if (candidate < price || (candidate === price && selected && promotion.id < selected.id)) {
      price = candidate;
      selected = promotion;
    }
  }
  return { price, originalPrice, promotionId: selected?.id ?? null, promotionName: selected?.name ?? null };
}

export function getPromotionDiscount(items: Pick<SaleItem, "price" | "originalPrice" | "quantity">[]) {
  return items.reduce((sum, item) => sum + Math.max(0, (item.originalPrice ?? item.price) - item.price) * item.quantity, 0);
}

// A quote fingerprint is compared with server-recomputed prices, never used as a trusted price.
export function getPricingKey(items: Pick<SaleItem, "productId" | "variantId" | "price" | "originalPrice" | "promotionId" | "promotionName" | "quantity">[]) {
  return JSON.stringify(items.map(item => [item.productId, item.variantId ?? "", item.quantity,
    item.originalPrice ?? item.price, item.price, item.promotionId ?? "", item.promotionName ?? ""])
    .sort((a, b) => JSON.stringify(a).localeCompare(JSON.stringify(b))));
}

export function validatePromotion(input: PromotionInput, products: Product[]) {
  if (!input || typeof input.name !== "string" || !input.name.trim() || input.name.trim().length > 100) {
    return "ກະລຸນາປ້ອນຊື່ໂປຣໂມຊັນ (ບໍ່ເກີນ 100 ຕົວອັກສອນ)";
  }
  if (!["FIXED_PRICE", "PERCENT"].includes(input.kind) || typeof input.isActive !== "boolean" ||
    !Number.isSafeInteger(input.value) || input.value < 0 || input.value > 2147483647 ||
    (input.kind === "PERCENT" && (input.value < 1 || input.value > 100))) return "ລາຄາ ຫຼື ເປີເຊັນສ່ວນຫຼຸດບໍ່ຖືກຕ້ອງ";
  const startsAt = parseLaoDateTime(input.startsAt);
  const endsAt = parseLaoDateTime(input.endsAt);
  if (!startsAt || !endsAt || endsAt <= startsAt) return "ວັນສິ້ນສຸດຕ້ອງຢູ່ຫຼັງວັນເລີ່ມ (ເວລາລາວ)";
  if (!Array.isArray(input.targets) || !input.targets.length || input.targets.length > 2000) return "ກະລຸນາເລືອກສິນຄ້າ / ຂະໜາດ";
  const keys = new Set<string>();
  for (const target of input.targets) {
    if (!target || typeof target.productId !== "string" || typeof target.variantId !== "string") return "ສິນຄ້າບໍ່ຖືກຕ້ອງ";
    const product = products.find(product => product.id === target.productId && product.isActive);
    const variant = product && getProductVariants(product).find(variant => variant.id === target.variantId);
    if (!variant) return "ບໍ່ພົບສິນຄ້າ / ຂະໜາດ ຫຼື ສິນຄ້າຖືກປິດການຂາຍ";
    if (input.kind === "FIXED_PRICE" && input.value >= variant.sellPrice) return "ລາຄາໂປຣຕ້ອງຕໍ່າກວ່າລາຄາປົກກະຕິຂອງທຸກຂະໜາດທີ່ເລືອກ";
    const key = `${target.productId}::${target.variantId}`;
    if (keys.has(key)) return "ມີສິນຄ້າ / ຂະໜາດຊໍ້າກັນ";
    keys.add(key);
  }
  return null;
}
