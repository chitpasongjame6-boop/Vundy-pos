import type { ComponentType } from "react";
import { Banknote, CreditCard, ReceiptText, Wallet } from "lucide-react";
import { getActiveMembers } from "@/actions/member.action";
import { getTodayPosPaymentSummary } from "@/actions/pos.action";
import { getProducts } from "@/actions/product.action";
import { getStoreSettings } from "@/actions/settings.action";
import { PageHeader } from "@/components/layout/page-header";
import { PosTerminal } from "@/components/pos/pos-terminal";
import { Card, CardContent } from "@/components/ui/card";
import { formatCurrency } from "@/lib/utils";

export default async function PosPage() {
  const [products, storeSettings, paymentSummary, members] = await Promise.all([
    getProducts({ activeOnly: true, limit: 200 }),
    getStoreSettings(),
    getTodayPosPaymentSummary(),
    getActiveMembers()
  ]);

  return (
    <section>
      <PageHeader
        title="ຂາຍໜ້າຮ້ານ"
        description="ສະແກນສິນຄ້າ ຄິດໄລ່ເງິນ ຕັດສະຕ໋ອກ ແລະປິ້ນບິນໃຫ້ລູກຄ້າ"
        actionHref="/pos/history"
        actionLabel="ປະຫວັດບິນ"
      />
      <div className="mb-4 grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
        <PaymentSummaryCard
          icon={Banknote}
          label="ເງິນສົດມື້ນີ້"
          value={formatCurrency(paymentSummary.cashAmount)}
        />
        <PaymentSummaryCard
          icon={CreditCard}
          label="ເງິນໂອນມື້ນີ້"
          value={formatCurrency(paymentSummary.transferAmount)}
        />
        <PaymentSummaryCard
          icon={Wallet}
          label="ອື່ນໆມື້ນີ້"
          value={formatCurrency(paymentSummary.otherAmount)}
        />
        <PaymentSummaryCard
          icon={ReceiptText}
          label={`ລວມ ${paymentSummary.billCount} ບິນ`}
          value={formatCurrency(paymentSummary.totalAmount)}
        />
      </div>
      <PosTerminal products={products} storeSettings={storeSettings} members={members} />
    </section>
  );
}

function PaymentSummaryCard({
  icon: Icon,
  label,
  value
}: {
  icon: ComponentType<{ className?: string; "aria-hidden"?: boolean }>;
  label: string;
  value: string;
}) {
  return (
    <Card>
      <CardContent className="flex items-center gap-3">
        <div className="flex h-10 w-10 items-center justify-center rounded-md bg-zinc-100 text-zinc-700">
          <Icon className="h-5 w-5" aria-hidden />
        </div>
        <div className="min-w-0">
          <p className="text-sm text-zinc-500">{label}</p>
          <p className="truncate text-xl font-bold text-zinc-950">{value}</p>
        </div>
      </CardContent>
    </Card>
  );
}
