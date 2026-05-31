import type { ComponentType } from "react";
import { Banknote, CreditCard, ReceiptText, Search, TrendingUp, Wallet } from "lucide-react";
import { getPosSaleHistory } from "@/actions/pos.action";
import { getStoreSettings } from "@/actions/settings.action";
import { PageHeader } from "@/components/layout/page-header";
import { PosSaleHistory } from "@/components/pos/pos-sale-history";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Input, Select } from "@/components/ui/input";
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

      <form className="mb-4 grid gap-3 md:grid-cols-[1fr_12rem_11rem_auto]">
        <label className="relative">
          <Search className="pointer-events-none absolute left-3 top-3 h-5 w-5 text-zinc-400" />
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
      </form>

      <div className="mb-4 grid gap-3 sm:grid-cols-2 xl:grid-cols-5">
        <SummaryCard
          icon={Banknote}
          label="ເງິນສົດ"
          value={formatCurrency(history.summary.cashAmount)}
        />
        <SummaryCard
          icon={CreditCard}
          label="ເງິນໂອນ"
          value={formatCurrency(history.summary.transferAmount)}
        />
        <SummaryCard
          icon={Wallet}
          label="ອື່ນໆ"
          value={formatCurrency(history.summary.otherAmount)}
        />
        <SummaryCard
          icon={ReceiptText}
          label={`ລວມ ${history.summary.billCount} ບິນ`}
          value={formatCurrency(history.summary.totalAmount)}
        />
        {canViewProfit ? (
          <SummaryCard
            icon={TrendingUp}
            label="ກໍາໄລ"
            value={formatCurrency(history.summary.profit)}
            success
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

function SummaryCard({
  icon: Icon,
  label,
  value,
  success = false
}: {
  icon: ComponentType<{ className?: string; "aria-hidden"?: boolean }>;
  label: string;
  value: string;
  success?: boolean;
}) {
  return (
    <Card>
      <CardContent className="flex items-center gap-3">
        <div className="flex h-10 w-10 items-center justify-center rounded-md bg-zinc-100 text-zinc-700">
          <Icon className="h-5 w-5" aria-hidden />
        </div>
        <div className="min-w-0">
          <p className="text-sm text-zinc-500">{label}</p>
          <p
            className={
              success
                ? "truncate text-xl font-bold text-emerald-700"
                : "truncate text-xl font-bold text-zinc-950"
            }
          >
            {value}
          </p>
        </div>
      </CardContent>
    </Card>
  );
}
