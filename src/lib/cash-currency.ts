import type { CashMovement, CashShift, Sale } from "@/types";
import { CurrencyError, moneyInteger, thbToLak } from "./currency";

export function resolveThbTender(input: { method: string; satang: number; rate: number; expectedRate?: number; enabled: boolean; hasShift: boolean }) {
  if (input.method !== "CASH") throw new Error("ຮັບເງິນບາດໄດ້ສະເພາະເງິນສົດ · ຍັງບໍ່ຮອງຮັບແບ່ງຈ່າຍບາດ/ກີບ");
  if (!input.enabled || !input.rate) throw new Error("ຮ້ານຍັງບໍ່ເປີດຮັບເງິນບາດ ຫຼື ຍັງບໍ່ມີເຣດ");
  if (input.expectedRate !== input.rate) throw new Error("ເຣດປ່ຽນແລ້ວ ກະລຸນາກວດຍອດໃໝ່ ແລະ ກົດບັນທຶກອີກຄັ້ງ");
  if (!input.hasShift) throw new Error("ກະລຸນາເປີດກະຂາຍກ່ອນຮັບເງິນບາດ");
  return { tenderCurrency: "THB" as const, tenderAmountMinor: moneyInteger(input.satang), exchangeRate: input.rate, receivedAmount: thbToLak(input.satang, input.rate) };
}

export function thbSaleMovements(sale: Sale, user: { id: string; name: string }): CashMovement[] {
  if (sale.tenderCurrency !== "THB") return [];
  if (!sale.shiftId) throw new Error("THB cash requires an open shift");
  const common = { shiftId: sale.shiftId, referenceId: sale.id, userId: user.id, userName: user.name, createdAt: sale.createdAt };
  return [
    { ...common, id: crypto.randomUUID(), type: "CASH_IN", currency: "THB", amount: sale.tenderAmountMinor ?? 0, source: "THB_SALE", reason: `ຮັບບາດ ${sale.saleNo ?? sale.id}` },
    { ...common, id: crypto.randomUUID(), type: "CASH_OUT", currency: "LAK", amount: sale.changeAmount ?? 0, source: "THB_CHANGE", reason: `ທອນກີບ ${sale.saleNo ?? sale.id}` }
  ].filter(row => row.amount > 0) as CashMovement[];
}

export function thbRefundMovement(sale: Sale, amount: number, shift: CashShift | null | undefined, user: { id: string; name: string }, now: Date): CashMovement[] {
  if (sale.tenderCurrency !== "THB") return [];
  if (!shift || shift.status !== "OPEN" || shift.cashierId !== user.id) throw new CurrencyError("ກະລຸນາເປີດກະກ່ອນຄືນເງິນ · ບິນຮັບບາດຄືນເປັນເງິນສົດກີບຕາມຍອດບິນເດີມ");
  return [{ id: crypto.randomUUID(), shiftId: shift.id, type: "CASH_OUT", currency: "LAK", amount: moneyInteger(amount),
    source: "THB_REFUND", referenceId: sale.id, reason: `ຄືນເງິນກີບ ${sale.saleNo ?? sale.id}`,
    userId: user.id, userName: user.name, createdAt: now }];
}

export function movementBalance(movements: CashMovement[], currency: "LAK" | "THB"): number {
  return movements.filter(row => (row.currency ?? "LAK") === currency)
    .reduce((sum, row) => sum + (row.type === "CASH_IN" ? row.amount : -row.amount), 0);
}

export function expectedDrawerCash(shift: CashShift, sales: Sale[], movements: CashMovement[]) {
  // THB receipts, kip change and refunds are immutable, dated cash movements.
  // Never count their kip-equivalent sale totals as physical kip in the drawer.
  const legacyCash = sales.filter(sale => sale.tenderCurrency !== "THB" && (!sale.status || ["ACTIVE", "PARTIALLY_RETURNED"].includes(sale.status)))
    .reduce((sum, sale) => {
      const cash = sale.paymentMethod === "CASH" ? sale.netAmount : sale.paymentMethod === "SPLIT"
        ? (sale.payments ?? []).filter(p => p.method === "CASH").reduce((n, p) => n + p.amount, 0) : 0;
      return sum + Math.max(0, cash - (sale.refundAmount ?? 0));
    }, 0);
  return { lak: shift.openingCash + legacyCash + movementBalance(movements, "LAK"),
    thb: (shift.openingThb ?? 0) + movementBalance(movements, "THB") };
}
