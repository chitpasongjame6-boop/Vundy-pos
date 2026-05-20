import type { Member, MemberSummary, MemberTier, Sale } from "@/types";

export function getMemberTierForSpend(
  tiers: MemberTier[],
  totalSpend: number
): MemberTier | null {
  const activeTiers = tiers
    .filter((tier) => tier.isActive)
    .sort((a, b) => b.minSpend - a.minSpend);

  return activeTiers.find((tier) => totalSpend >= tier.minSpend) ?? null;
}

export function buildMemberSummaries(
  members: Member[],
  tiers: MemberTier[],
  sales: Sale[]
): MemberSummary[] {
  const activeSales = sales.filter((sale) => !sale.status || sale.status === "ACTIVE");

  return members.map((member) => {
    const memberSales = activeSales.filter((sale) => sale.memberId === member.id);
    const totalSpend = memberSales.reduce((sum, sale) => sum + sale.netAmount, 0);
    const lastPurchaseAt =
      memberSales
        .map((sale) => new Date(sale.createdAt))
        .sort((a, b) => b.getTime() - a.getTime())[0] ?? null;

    return {
      ...member,
      totalSpend,
      billCount: memberSales.length,
      lastPurchaseAt,
      tier: getMemberTierForSpend(tiers, totalSpend)
    };
  });
}
