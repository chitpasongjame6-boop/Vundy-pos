import { Banknote, CreditCard, ReceiptText, Wallet } from "lucide-react";
import { getActiveMembers } from "@/actions/member.action";
import { getTodayPosPaymentSummary } from "@/actions/pos.action";
import { getProducts } from "@/actions/product.action";
import { getStoreSettings } from "@/actions/settings.action";
import { getPosPromotions } from "@/actions/promotion.action";
import { PageHeader } from "@/components/layout/page-header";
import { PosTerminal } from "@/components/pos/pos-terminal";
import { MetricCard } from "@/components/ui/patterns";
import { getCurrentUser } from "@/lib/auth";
import { formatCurrency } from "@/lib/utils";
import type { Product } from "@/types";

export default async function PosPage() {
  const [products, storeSettings, paymentSummary, members, currentUser, pricing] = await Promise.all([
    getProducts({ activeOnly: true, limit: 200 }),
    getStoreSettings(),
    getTodayPosPaymentSummary(),
    getActiveMembers(),
    getCurrentUser(),
    getPosPromotions()
  ]);
  const safeProducts =
    currentUser?.role === "STAFF" ? hideProductCosts(products) : products;

  return (
    <section>
      <PageHeader
        title="ຂາຍໜ້າຮ້ານ"
        description="ສະແກນສິນຄ້າ ຄິດໄລ່ເງິນ ຕັດສະຕ໋ອກ ແລະປິ້ນບິນໃຫ້ລູກຄ້າ"
        actionHref="/pos/history"
        actionLabel="ປະຫວັດບິນ"
      />
      <div className="mb-4 grid grid-cols-2 gap-3 xl:grid-cols-4">
        <MetricCard
          icon={Banknote}
          label="ເງິນສົດມື້ນີ້"
          value={formatCurrency(paymentSummary.cashAmount)}
          tone="emerald"
        />
        <MetricCard
          icon={CreditCard}
          label="ເງິນໂອນມື້ນີ້"
          value={formatCurrency(paymentSummary.transferAmount)}
          tone="sky"
        />
        <MetricCard
          icon={Wallet}
          label="ອື່ນໆມື້ນີ້"
          value={formatCurrency(paymentSummary.otherAmount)}
          tone="amber"
        />
        <MetricCard
          icon={ReceiptText}
          label={`ລວມ ${paymentSummary.billCount} ບິນ`}
          value={formatCurrency(paymentSummary.totalAmount)}
          tone="indigo"
        />
      </div>
      <PosTerminal
        initialPricing={pricing}
        products={safeProducts}
        storeSettings={storeSettings}
        members={members}
        userRole={currentUser?.role ?? "STAFF"}
      />
    </section>
  );
}

function hideProductCosts(products: Product[]): Product[] {
  return products.map((product) => ({
    ...product,
    costPrice: 0,
    variants: product.variants?.map((variant) => ({
      ...variant,
      costPrice: 0
    }))
  }));
}
