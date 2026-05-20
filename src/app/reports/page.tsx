import { getDetailedReport } from "@/actions/report.action";
import { PageHeader } from "@/components/layout/page-header";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input, Select } from "@/components/ui/input";
import { formatCurrency } from "@/lib/utils";

export default async function ReportsPage({
  searchParams
}: {
  searchParams?: Promise<{ period?: string; date?: string }>;
}) {
  const params = await searchParams;
  const report = await getDetailedReport({
    period: params?.period,
    date: params?.date
  });
  const margin =
    report.totalSales > 0 ? Math.round((report.totalProfit / report.totalSales) * 100) : 0;

  return (
    <section>
      <PageHeader
        title="ລາຍງານກໍາໄລ"
        description="ສະຫຼຸບລາຍວັນ ຫຼື ລາຍເດືອນ ແຍກອອນລາຍ, ໜ້າຮ້ານ, ເງິນສົດ, ເງິນໂອນ, COD ແລະການຄືນ/ຍົກເລີກ"
      />

      <form className="mb-4 grid gap-3 md:grid-cols-[12rem_14rem_auto]">
        <Select name="period" defaultValue={report.period}>
          <option value="DAY">ລາຍວັນ</option>
          <option value="MONTH">ລາຍເດືອນ</option>
        </Select>
        <Input
          name="date"
          type={report.period === "MONTH" ? "month" : "date"}
          defaultValue={
            report.period === "MONTH" ? report.date.slice(0, 7) : report.date
          }
        />
        <Button type="submit" className="w-full md:w-auto">
          ດຶງລາຍງານ
        </Button>
      </form>

      <div className="mb-4 rounded-md border border-zinc-200 bg-zinc-50 px-3 py-2 text-sm font-bold text-zinc-700">
        ກໍາລັງສະແດງ: {report.rangeLabel}
      </div>

      <div className="grid gap-3 sm:grid-cols-4">
        <Summary label="ຍອດຂາຍລວມ" value={formatCurrency(report.totalSales)} />
        <Summary label="ກໍາໄລລວມ" value={formatCurrency(report.totalProfit)} tone="emerald" />
        <Summary label="ອັດຕາກໍາໄລ" value={`${margin}%`} />
        <Summary
          label="ບິນ/ອໍເດີທີ່ນັບຍອດ"
          value={`${report.shippedOrders + report.posBills}`}
        />
      </div>

      <Card className="mt-4">
        <CardHeader>
          <CardTitle>ແຍກຍອດຂາຍ</CardTitle>
        </CardHeader>
        <CardContent className="grid gap-3 md:grid-cols-3">
          <ReportBlock label="ອອນລາຍ" sales={report.onlineSales} profit={report.onlineProfit} />
          <ReportBlock label="ຂາຍໜ້າຮ້ານ" sales={report.posSales} profit={report.posProfit} />
          <ReportBlock label="ລວມທັງໝົດ" sales={report.totalSales} profit={report.totalProfit} strong />
        </CardContent>
      </Card>

      <div className="mt-4 grid gap-4 xl:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle>ຊ່ອງທາງຊໍາລະ</CardTitle>
          </CardHeader>
          <CardContent className="grid gap-3 sm:grid-cols-2">
            <MiniLine label="ເງິນສົດ POS" value={formatCurrency(report.cashAmount)} />
            <MiniLine label="ເງິນໂອນ POS" value={formatCurrency(report.transferAmount)} />
            <MiniLine label="ອື່ນໆ POS" value={formatCurrency(report.otherAmount)} />
            <MiniLine label="COD ທີ່ສົ່ງແລ້ວ" value={formatCurrency(report.codAmount)} />
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>ຄືນ / ຍົກເລີກ</CardTitle>
          </CardHeader>
          <CardContent className="grid gap-3 sm:grid-cols-2">
            <MiniLine label="ອໍເດີຕີກັບ" value={`${report.returnedOrders}`} tone="rose" />
            <MiniLine label="ບິນ POS ຄືນສິນຄ້າ" value={`${report.returnedSales}`} tone="rose" />
            <MiniLine label="ອໍເດີຍົກເລີກ" value={`${report.cancelledOrders}`} />
            <MiniLine label="ບິນ POS ຍົກເລີກ" value={`${report.cancelledSales}`} />
          </CardContent>
        </Card>
      </div>

      <Card className="mt-4">
        <CardHeader>
          <CardTitle>ສິນຄ້າຂາຍດີ Top 5</CardTitle>
        </CardHeader>
        <CardContent className="space-y-2">
          {report.topProducts.length ? (
            report.topProducts.map((item, index) => (
              <div
                key={`${item.sku}-${index}`}
                className="grid grid-cols-[2rem_1fr_auto] items-center gap-3 rounded-md border border-zinc-200 p-3"
              >
                <div className="flex h-8 w-8 items-center justify-center rounded-md bg-teal-50 text-sm font-bold text-teal-700">
                  {index + 1}
                </div>
                <div>
                  <p className="font-bold text-zinc-950">{item.name}</p>
                  <p className="text-sm text-zinc-500">
                    SKU: {item.sku} · ຂາຍ {item.quantity}
                  </p>
                </div>
                <strong>{formatCurrency(item.amount)}</strong>
              </div>
            ))
          ) : (
            <p className="text-sm text-zinc-500">ບໍ່ມີຂໍ້ມູນຂາຍໃນຊ່ວງນີ້</p>
          )}
        </CardContent>
      </Card>
    </section>
  );
}

function Summary({
  label,
  value,
  tone = "zinc"
}: {
  label: string;
  value: string;
  tone?: "zinc" | "emerald";
}) {
  return (
    <Card>
      <CardContent>
        <p className="text-sm text-zinc-500">{label}</p>
        <p className={tone === "emerald" ? "mt-1 text-2xl font-bold text-emerald-700" : "mt-1 text-2xl font-bold"}>
          {value}
        </p>
      </CardContent>
    </Card>
  );
}

function ReportBlock({
  label,
  sales,
  profit,
  strong = false
}: {
  label: string;
  sales: number;
  profit: number;
  strong?: boolean;
}) {
  return (
    <div className="rounded-md border border-zinc-200 p-3">
      <p className="text-sm font-bold text-zinc-950">{label}</p>
      <div className="mt-3 space-y-2">
        <MiniLine label="ຍອດຂາຍ" value={formatCurrency(sales)} strong={strong} />
        <MiniLine label="ກໍາໄລ" value={formatCurrency(profit)} tone="emerald" strong={strong} />
      </div>
    </div>
  );
}

function MiniLine({
  label,
  value,
  tone = "zinc",
  strong = false
}: {
  label: string;
  value: string;
  tone?: "zinc" | "emerald" | "rose";
  strong?: boolean;
}) {
  const color =
    tone === "emerald"
      ? "text-emerald-700"
      : tone === "rose"
        ? "text-rose-700"
        : "text-zinc-950";

  return (
    <div className="flex items-center justify-between gap-3 rounded-md bg-zinc-50 p-3">
      <span className="text-sm text-zinc-500">{label}</span>
      <strong className={`${color} ${strong ? "text-lg" : ""}`}>{value}</strong>
    </div>
  );
}
