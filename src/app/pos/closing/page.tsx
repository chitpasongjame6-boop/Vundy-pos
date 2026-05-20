import type { ComponentType } from "react";
import { Banknote, CreditCard, ReceiptText, TrendingUp, Wallet } from "lucide-react";
import { closeDailySales, getDailyClosing } from "@/actions/pos.action";
import { PageHeader } from "@/components/layout/page-header";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Input, Textarea } from "@/components/ui/input";
import { MoneyInput } from "@/components/ui/money-input";
import { formatCurrency, formatDate } from "@/lib/utils";

export default async function PosClosingPage({
  searchParams
}: {
  searchParams?: Promise<{ date?: string }>;
}) {
  const params = await searchParams;
  const data = await getDailyClosing(params?.date);

  return (
    <section>
      <PageHeader
        title="ປິດຍອດປະຈໍາວັນ"
        description="ກວດເງິນສົດ ເງິນໂອນ ຍອດຂາຍ ແລະບັນທຶກການປິດຍອດໜ້າຮ້ານ"
        actionHref="/pos/history"
        actionLabel="ປະຫວັດບິນ"
      />

      <form className="mb-4 flex flex-col gap-3 sm:flex-row">
        <Input
          type="date"
          name="date"
          defaultValue={data.date}
          aria-label="ວັນທີປິດຍອດ"
          className="sm:max-w-56"
        />
        <Button type="submit" className="sm:w-auto">
          ເບິ່ງຍອດ
        </Button>
      </form>

      <div className="mb-4 grid gap-3 sm:grid-cols-2 xl:grid-cols-5">
        <SummaryCard
          icon={Banknote}
          label="ເງິນສົດຕາມລະບົບ"
          value={formatCurrency(data.summary.cashAmount)}
        />
        <SummaryCard
          icon={CreditCard}
          label="ເງິນໂອນ"
          value={formatCurrency(data.summary.transferAmount)}
        />
        <SummaryCard
          icon={Wallet}
          label="ອື່ນໆ"
          value={formatCurrency(data.summary.otherAmount)}
        />
        <SummaryCard
          icon={ReceiptText}
          label={`ລວມ ${data.summary.billCount} ບິນ`}
          value={formatCurrency(data.summary.totalAmount)}
        />
        <SummaryCard
          icon={TrendingUp}
          label="ກໍາໄລ"
          value={formatCurrency(data.summary.profit)}
          success
        />
      </div>

      <div className="grid gap-4 xl:grid-cols-[1fr_24rem]">
        <Card>
          <CardContent>
            <form action={closeDailySales} className="grid gap-3">
              <input type="hidden" name="date" value={data.date} />
              <label className="space-y-1.5">
                <span className="text-sm font-semibold text-zinc-700">
                  ເງິນສົດທີ່ນັບໄດ້ຈິງ
                </span>
                <MoneyInput
                  name="countedCash"
                  min={0}
                  defaultValue={data.closing?.countedCash ?? data.summary.cashAmount}
                />
              </label>
              <label className="space-y-1.5">
                <span className="text-sm font-semibold text-zinc-700">
                  ໝາຍເຫດ
                </span>
                <Textarea
                  name="note"
                  defaultValue={data.closing?.note ?? ""}
                  placeholder="ຕົວຢ່າງ: ເງິນສົດຂາດ/ເກີນ ຫຼື ໝາຍເຫດປະຈໍາວັນ"
                />
              </label>
              <Button type="submit" className="w-full sm:w-auto">
                ບັນທຶກປິດຍອດ
              </Button>
            </form>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="space-y-3">
            <p className="text-lg font-bold text-zinc-950">ສະຖານະການປິດຍອດ</p>
            {data.closing ? (
              <div className="grid gap-2 text-sm">
                <Line label="ເລກປິດຍອດ" value={data.closing.closingNo ?? "-"} />
                <Line
                  label="ປິດເມື່ອ"
                  value={formatDate(new Date(data.closing.closedAt))}
                />
                <Line
                  label="ເງິນສົດຈິງ"
                  value={formatCurrency(data.closing.countedCash)}
                />
                <Line
                  label="ສ່ວນຕ່າງ"
                  value={formatCurrency(data.closing.cashDifference)}
                  success={data.closing.cashDifference === 0}
                  danger={data.closing.cashDifference !== 0}
                />
              </div>
            ) : (
              <p className="text-sm text-zinc-500">ຍັງບໍ່ໄດ້ປິດຍອດວັນນີ້</p>
            )}
          </CardContent>
        </Card>
      </div>
    </section>
  );
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

function Line({
  label,
  value,
  success = false,
  danger = false
}: {
  label: string;
  value: string;
  success?: boolean;
  danger?: boolean;
}) {
  return (
    <div className="flex items-center justify-between gap-3">
      <span className="text-zinc-500">{label}</span>
      <span
        className={
          success
            ? "font-bold text-emerald-700"
            : danger
              ? "font-bold text-rose-700"
              : "font-bold text-zinc-950"
        }
      >
        {value}
      </span>
    </div>
  );
}
