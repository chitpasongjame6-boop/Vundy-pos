import { Banknote, CreditCard, ReceiptText, Search, TrendingUp, Wallet } from "lucide-react";
import { getPosSaleHistory } from "@/actions/pos.action";
import { getStoreSettings } from "@/actions/settings.action";
import { PageHeader } from "@/components/layout/page-header";
import { PosSaleHistory } from "@/components/pos/pos-sale-history";
import { Button } from "@/components/ui/button";
import { Input, Select } from "@/components/ui/input";
import { FilterBar, MetricCard } from "@/components/ui/patterns";
import { getCurrentUser } from "@/lib/auth";
import { formatCurrency } from "@/lib/utils";
import type { Sale } from "@/types";

export default async function PosHistoryPage({
  searchParams
}: {
  searchParams?: Promise<{
    search?: string;
    paymentMethod?: string;
    date?: string;
  }>;
}) {
  const params = await searchParams;
  const [history, storeSettings, currentUser] = await Promise.all([
    getPosSaleHistory({
      search: params?.search,
      paymentMethod: params?.paymentMethod,
      date: params?.date,
      limit: 100
    }),
    getStoreSettings(),
    getCurrentUser()
  ]);
  const canViewProfit = currentUser?.role === "OWNER";
  const safeSales = canViewProfit ? history.sales : hideSaleCosts(history.sales);

  return (
    <section>
      <PageHeader
        title="ປະຫວັດບິນໜ້າຮ້ານ"
        description={
          canViewProfit
            ? "ຄົ້ນຫາບິນ POS ເບິ່ງລາຍການສິນຄ້າ ຍອດຂາຍ ກໍາໄລ ແລະປິ້ນບິນຊໍ້າ"
            : "ຄົ້ນຫາບິນ POS ເບິ່ງລາຍການສິນຄ້າ ຍອດຂາຍ ແລະປິ້ນບິນຊໍ້າ"
        }
        actionHref="/pos"
        actionLabel="ຂາຍໜ້າຮ້ານ"
      />

      <FilterBar className="md:grid-cols-[1fr_12rem_11rem_auto]">
        <label className="relative">
          <Search className="pointer-events-none absolute left-3 top-3 h-5 w-5 text-slate-400" />
          <Input
            name="search"
            defaultValue={params?.search ?? ""}
            placeholder="ຄົ້ນຫາເລກບິນ ສະມາຊິກ ສິນຄ້າ ຫຼື SKU"
            className="pl-10"
          />
        </label>
        <Select name="paymentMethod" defaultValue={history.paymentMethod}>
          <option value="ALL">ທຸກວິທີຊໍາລະ</option>
          <option value="CASH">ເງິນສົດ</option>
          <option value="TRANSFER">ເງິນໂອນ</option>
          <option value="OTHER">ອື່ນໆ</option>
          <option value="SPLIT">ແບ່ງຈ່າຍ</option>
        </Select>
        <Input
          type="date"
          name="date"
          defaultValue={params?.date ?? ""}
          aria-label="ກອງຕາມວັນທີ"
        />
        <Button type="submit" className="w-full md:w-auto">
          ຄົ້ນຫາ
        </Button>
      </FilterBar>

      <div className={`mb-4 grid grid-cols-2 gap-3 ${canViewProfit ? "xl:grid-cols-5" : "xl:grid-cols-4"}`}>
        <MetricCard
          icon={Banknote}
          label="ເງິນສົດ"
          value={formatCurrency(history.summary.cashAmount)}
          tone="emerald"
        />
        <MetricCard
          icon={CreditCard}
          label="ເງິນໂອນ"
          value={formatCurrency(history.summary.transferAmount)}
          tone="sky"
        />
        <MetricCard
          icon={Wallet}
          label="ອື່ນໆ"
          value={formatCurrency(history.summary.otherAmount)}
          tone="amber"
        />
        <MetricCard
          icon={ReceiptText}
          label={`ລວມ ${history.summary.billCount} ບິນ`}
          value={formatCurrency(history.summary.totalAmount)}
          tone="indigo"
        />
        {canViewProfit ? (
          <MetricCard
            icon={TrendingUp}
            label="ກໍາໄລ"
            value={formatCurrency(history.summary.profit)}
            tone="emerald"
          />
        ) : null}
      </div>

      <PosSaleHistory
        sales={safeSales}
        storeSettings={storeSettings}
        canViewProfit={canViewProfit}
      />
    </section>
  );
}

function hideSaleCosts(sales: Sale[]): Sale[] {
  return sales.map((sale) => ({
    ...sale,
    totalCost: 0,
    profit: 0,
    items: sale.items.map((item) => ({
      ...item,
      cost: 0
    }))
  }));
}
