// Money is stored as whole kip, or satang for THB. Rates are LAK per THB × 10,000.
// Do not use the current rate to recalculate historical transactions.
export const RATE_SCALE = 10_000;
export const MAX_MONEY = 2_147_483_647;
export type Currency = "LAK" | "THB";
export class CurrencyError extends Error {}

export function parseDecimal(value: unknown, decimals: number): number {
  const text = String(value ?? "").trim();
  if (text.length > 32) throw new Error("ຈໍານວນເງິນເກີນຂອບເຂດ");
  const match = /^(\d+)(?:\.(\d+))?$/.exec(text);
  if (!match || (match[2]?.length ?? 0) > decimals) throw new Error("ຈໍານວນເງິນ ຫຼື ອັດຕາແລກປ່ຽນບໍ່ຖືກຕ້ອງ");
  const result = Number(BigInt(match[1]) * BigInt(10) ** BigInt(decimals) + BigInt((match[2] ?? "").padEnd(decimals, "0") || "0"));
  return moneyInteger(result);
}

export function moneyInteger(value: number): number {
  if (!Number.isSafeInteger(value) || value < 0 || value > MAX_MONEY) throw new Error("ຈໍານວນເງິນຕ້ອງບໍ່ຕິດລົບ ແລະ ບໍ່ເກີນຂອບເຂດ");
  return value;
}

export function thbToLak(satang: number, rate: number): number {
  moneyInteger(satang);
  moneyInteger(rate);
  if (!rate) throw new Error("ກະລຸນາກໍານົດເຣດ 1 ບາດ = ກີ່ກີບ");
  const divisor = BigInt(100 * RATE_SCALE);
  return moneyInteger(Number((BigInt(satang) * BigInt(rate) + divisor / BigInt(2)) / divisor));
}

export function lakToThbDue(lak: number, rate: number): number {
  moneyInteger(lak);
  moneyInteger(rate);
  if (!rate) return 0;
  // Round up to one satang so that the tender covers the kip amount.
  return moneyInteger(Number((BigInt(lak) * BigInt(100 * RATE_SCALE) + BigInt(rate) - BigInt(1)) / BigInt(rate)));
}

export function formatThb(satang: number): string {
  return `฿${(satang / 100).toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
}

export function formatRate(rate: number): string {
  return (rate / RATE_SCALE).toLocaleString("en-US", { maximumFractionDigits: 4 });
}

export type PurchaseCost = {
  purchaseCurrency: Currency;
  purchaseAmountMinor: number;
  purchaseRate: number | null;
};

export function parsePurchaseCost(currency: unknown, amount: unknown, rate: unknown): PurchaseCost & { costPrice: number } {
  if (currency && currency !== "LAK" && currency !== "THB") throw new Error("ສະກຸນເງິນບໍ່ຖືກຕ້ອງ");
  if (currency === "THB") {
    const purchaseAmountMinor = parseDecimal(amount, 2);
    const purchaseRate = parseDecimal(rate, 4);
    return { purchaseCurrency: "THB", purchaseAmountMinor, purchaseRate, costPrice: thbToLak(purchaseAmountMinor, purchaseRate) };
  }
  const costPrice = parseDecimal(amount ?? "0", 0);
  return { purchaseCurrency: "LAK", purchaseAmountMinor: costPrice, purchaseRate: null, costPrice };
}

export function averageCost(stock: number, cost: number, received: number, incomingCost: number): number {
  [stock, cost, received, incomingCost].forEach(moneyInteger);
  if (!received) return cost;
  const quantity = BigInt(stock) + BigInt(received);
  return moneyInteger(Number((BigInt(stock) * BigInt(cost) + BigInt(received) * BigInt(incomingCost) + quantity / BigInt(2)) / quantity));
}
