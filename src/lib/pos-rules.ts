import type { SalePayment, SalePaymentMethod } from "@/types";

export function validatePosPayment(input: {
  method: SalePaymentMethod;
  netAmount: number;
  receivedAmount: number;
  payments: SalePayment[];
}) {
  if (input.method === "CASH" && input.receivedAmount < input.netAmount) {
    return "ເງິນທີ່ຮັບຍັງບໍ່ພໍກັບຍອດສຸດທິ";
  }

  if (
    input.method === "SPLIT" &&
    input.payments.reduce((sum, payment) => sum + payment.amount, 0) !== input.netAmount
  ) {
    return "ຍອດແບ່ງຊໍາລະຕ້ອງເທົ່າກັບຍອດສຸດທິ";
  }

  return null;
}

export function calculateInclusiveTax(netAmount: number, taxRate: number) {
  const safeRate = Math.min(100, Math.max(0, Math.round(taxRate)));
  return safeRate > 0 ? Math.round((netAmount * safeRate) / (100 + safeRate)) : 0;
}

export function validatePosDiscountPermission(input: {
  role: "OWNER" | "STAFF";
  discount: number;
}) {
  if (input.role === "STAFF" && input.discount > 0) {
    return "ສ່ວນຫລຸດສາມາດກໍານົດໄດ້ໂດຍເຈົ້າຂອງຮ້ານເທົ່ານັ້ນ";
  }

  return null;
}
