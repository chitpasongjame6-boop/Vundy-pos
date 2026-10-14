import { describe, expect, it } from "vitest";
import { buildMemberSummaries, getMemberTierForSpend } from "./members";
import type { Member, MemberTier, Sale } from "../types";

const tiers: MemberTier[] = [
  { id: "general", name: "General", minSpend: 0, discountPercent: 0, isActive: true },
  { id: "vip", name: "VIP", minSpend: 500_000, discountPercent: 5, isActive: true },
  { id: "disabled", name: "Disabled", minSpend: 1, discountPercent: 99, isActive: false }
];

const member: Member = {
  id: "member-1",
  name: "Customer",
  phone: "02000000000",
  isActive: true,
  createdAt: new Date("2026-01-01T00:00:00.000Z"),
  updatedAt: new Date("2026-01-01T00:00:00.000Z")
};

function sale(id: string, amount: number, status: Sale["status"], createdAt: string): Sale {
  return {
    id,
    saleNo: id,
    cashierId: null,
    cashierName: null,
    memberId: member.id,
    memberName: member.name,
    memberPhone: member.phone,
    memberTierName: null,
    memberDiscount: null,
    status,
    items: [],
    totalAmount: amount,
    totalCost: 0,
    profit: amount,
    discount: 0,
    netAmount: amount,
    paymentMethod: "CASH",
    receivedAmount: amount,
    changeAmount: 0,
    voidReason: null,
    voidNote: null,
    voidedAt: null,
    restockedAt: null,
    createdAt: new Date(createdAt),
    updatedAt: new Date(createdAt)
  };
}

describe("member summaries", () => {
  it("chooses the highest active tier reached", () => {
    expect(getMemberTierForSpend(tiers, 600_000)?.id).toBe("vip");
  });

  it("excludes cancelled sales from spend and bill count", () => {
    const summaries = buildMemberSummaries(
      [member],
      tiers,
      [
        sale("active", 600_000, "ACTIVE", "2026-10-10T10:00:00.000Z"),
        sale("cancelled", 900_000, "CANCELLED", "2026-10-11T10:00:00.000Z")
      ]
    );

    expect(summaries[0]).toMatchObject({
      totalSpend: 600_000,
      billCount: 1,
      tier: { id: "vip" }
    });
    expect(summaries[0].lastPurchaseAt).toEqual(new Date("2026-10-10T10:00:00.000Z"));
  });
});
