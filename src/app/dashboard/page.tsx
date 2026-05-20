import Link from "next/link";
import Image from "next/image";
import type { ReactNode } from "react";
import {
  AlertTriangle,
  ClipboardCheck,
  DollarSign,
  PackageX,
  ShoppingCart,
  TrendingUp
} from "lucide-react";
import { getDashboardStats } from "@/actions/dashboard.action";
import { SalesProfitChart } from "@/components/dashboard/sales-profit-chart";
import { StatCard } from "@/components/dashboard/stat-card";
import { PageHeader } from "@/components/layout/page-header";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Select } from "@/components/ui/input";
import { formatCurrency, statusConfig } from "@/lib/utils";
import type { DashboardChannel } from "@/types";

const channelLabels: Record<DashboardChannel, string> = {
  ALL: "ທັງໝົດ",
  ONLINE: "ອອນລາຍ",
  POS: "ຂາຍໜ້າຮ້ານ"
};

export default async function DashboardPage({
  searchParams
}: {
  searchParams?: Promise<{ channel?: string }>;
}) {
  const params = await searchParams;
  const selectedChannel = parseDashboardChannel(params?.channel);
  const stats = await getDashboardStats(selectedChannel);

  return (
    <section>
      <div className="mb-5 flex flex-col gap-3 lg:flex-row lg:items-end lg:justify-between">
        <PageHeader
          title="ໜ້າລວມ"
          description="ພາບລວມຍອດຂາຍ ກໍາໄລ ອໍເດີ ແລະ ສະຕ໋ອກທີ່ຕ້ອງຕິດຕາມ"
        />
        <form className="grid gap-2 sm:grid-cols-[14rem_auto] lg:mb-5">
          <label className="space-y-1.5">
            <span className="text-sm font-semibold text-zinc-700">
              ປະເພດຍອດຂາຍ
            </span>
            <Select name="channel" defaultValue={selectedChannel}>
              <option value="ALL">ທັງໝົດ</option>
              <option value="ONLINE">ອອນລາຍ</option>
              <option value="POS">ຂາຍໜ້າຮ້ານ</option>
            </Select>
          </label>
          <div className="flex items-end">
            <Button type="submit" className="w-full sm:w-auto">
              ດຶງຂໍ້ມູນ
            </Button>
          </div>
        </form>
      </div>
      <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-5">
        <StatCard
          label="ຍອດຂາຍມື້ນີ້"
          value={stats.todaySales}
          icon={<DollarSign className="h-5 w-5" aria-hidden />}
        />
        <StatCard
          label="ກໍາໄລມື້ນີ້"
          value={stats.todayProfit}
          icon={<TrendingUp className="h-5 w-5" aria-hidden />}
        />
        <StatCard
          label="ລາຍການຂາຍມື້ນີ້"
          value={stats.todayOrders}
          currency={false}
          icon={<ShoppingCart className="h-5 w-5" aria-hidden />}
        />
        <StatCard
          label="ຍອດຂາຍເດືອນນີ້"
          value={stats.monthSales}
          icon={<DollarSign className="h-5 w-5" aria-hidden />}
        />
        <StatCard
          label="ກໍາໄລເດືອນນີ້"
          value={stats.monthProfit}
          icon={<TrendingUp className="h-5 w-5" aria-hidden />}
        />
      </div>

      <Card className="mt-4">
        <CardHeader>
          <CardTitle>ແຍກຍອດຂາຍມື້ນີ້</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid gap-3 md:grid-cols-3">
            <SalesBreakdownBlock
              label="ອອນລາຍ"
              sales={stats.todayBreakdown.onlineSales}
              profit={stats.todayBreakdown.onlineProfit}
            />
            <SalesBreakdownBlock
              label="ຂາຍໜ້າຮ້ານ"
              sales={stats.todayBreakdown.posSales}
              profit={stats.todayBreakdown.posProfit}
            />
            <SalesBreakdownBlock
              label="ລວມທັງໝົດ"
              sales={stats.todayBreakdown.totalSales}
              profit={stats.todayBreakdown.totalProfit}
              strong
            />
          </div>
        </CardContent>
      </Card>

      <Card className="mt-4">
        <CardHeader>
          <CardTitle>ສິ່ງທີ່ຕ້ອງຕິດຕາມ</CardTitle>
        </CardHeader>
        <CardContent className="grid gap-3 md:grid-cols-5">
          <TaskLink
            href="/orders?status=PENDING_PACK"
            icon={<ShoppingCart className="h-5 w-5" aria-hidden />}
            label="ອໍເດີລໍຖ້າແພັກ"
            value={stats.tasks.pendingPackOrders}
            tone={stats.tasks.pendingPackOrders > 0 ? "amber" : "zinc"}
          />
          <TaskLink
            href="/orders?status=PENDING_PACK"
            icon={<DollarSign className="h-5 w-5" aria-hidden />}
            label="COD ຍັງບໍ່ສົ່ງ"
            value={stats.tasks.codToShipOrders}
            tone={stats.tasks.codToShipOrders > 0 ? "amber" : "zinc"}
          />
          <TaskLink
            href="/stock-alerts"
            icon={<PackageX className="h-5 w-5" aria-hidden />}
            label="ສິນຄ້າໝົດ"
            value={stats.tasks.outOfStockVariants}
            tone={stats.tasks.outOfStockVariants > 0 ? "rose" : "zinc"}
          />
          <TaskLink
            href="/stock-alerts"
            icon={<AlertTriangle className="h-5 w-5" aria-hidden />}
            label="ສະຕ໋ອກໃກ້ໝົດ"
            value={stats.tasks.lowStockVariants}
            tone={stats.tasks.lowStockVariants > 0 ? "amber" : "zinc"}
          />
          <TaskLink
            href="/pos/closing"
            icon={<ClipboardCheck className="h-5 w-5" aria-hidden />}
            label="ປິດຍອດມື້ນີ້"
            value={stats.tasks.todayClosingDone ? "ແລ້ວ" : "ຍັງ"}
            tone={stats.tasks.todayClosingDone ? "emerald" : "rose"}
          />
        </CardContent>
      </Card>

      <div className="mt-4 grid gap-4 xl:grid-cols-[2fr_1fr]">
        <Card>
          <CardHeader>
            <CardTitle>ກຣາຟຍອດຂາຍ ແລະ ກໍາໄລລາຍວັນ</CardTitle>
          </CardHeader>
          <CardContent>
            <SalesProfitChart data={stats.dailyChart} />
          </CardContent>
        </Card>
        <Card>
          <CardHeader>
            <CardTitle>ສິນຄ້າໃກ້ໝົດ</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            {stats.lowStockProducts.length ? (
              stats.lowStockProducts.map((product) => (
                <div
                  key={product.id}
                  className="grid grid-cols-[3rem_1fr_auto] items-center gap-3 rounded-md border border-zinc-200 p-3"
                >
                  <div className="relative h-12 w-12 overflow-hidden rounded-md bg-zinc-100">
                    {product.imageUrl ? (
                      <Image
                        src={product.imageUrl}
                        alt={product.name}
                        fill
                        sizes="3rem"
                        className="object-cover"
                      />
                    ) : (
                      <div className="flex h-full items-center justify-center text-xs font-bold text-zinc-400">
                        VL
                      </div>
                    )}
                  </div>
                  <div className="min-w-0">
                    <p className="font-semibold text-zinc-950">{product.name}</p>
                    <p className="truncate text-sm text-zinc-500">{product.sku}</p>
                  </div>
                  <Badge className="border-rose-200 bg-rose-100 text-rose-800">
                    {product.stock}
                  </Badge>
                </div>
              ))
            ) : (
              <p className="text-sm text-zinc-500">ຍັງບໍ່ມີສິນຄ້າໃກ້ໝົດ</p>
            )}
          </CardContent>
        </Card>
      </div>

      <div className="mt-4 grid gap-4 xl:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle>ສິນຄ້າຂາຍດີ Top 5 - {channelLabels[stats.channel]}</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            {stats.topProducts.length ? (
              stats.topProducts.map((product, index) => (
                <div
                  key={product.productId}
                  className="grid grid-cols-[2rem_1fr_auto] items-center gap-3 rounded-md border border-zinc-200 p-3"
                >
                  <div className="flex h-8 w-8 items-center justify-center rounded-md bg-teal-50 text-sm font-bold text-teal-700">
                    {index + 1}
                  </div>
                  <div>
                    <p className="font-semibold text-zinc-950">{product.name}</p>
                    <p className="text-sm text-zinc-500">ຂາຍ {product.quantity} ຊິ້ນ</p>
                  </div>
                  <strong className="text-sm text-zinc-950">
                    {formatCurrency(product.totalAmount)}
                  </strong>
                </div>
              ))
            ) : (
              <p className="text-sm text-zinc-500">ຍັງບໍ່ມີຂໍ້ມູນຂາຍ</p>
            )}
          </CardContent>
        </Card>
        <Card>
          <CardHeader>
            <CardTitle>ລາຍການຫຼ້າສຸດ - {channelLabels[stats.channel]}</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            {stats.recentActivity.length ? (
              stats.recentActivity.map((item) => (
                <div
                  key={`${item.type}-${item.id}`}
                  className="flex items-center justify-between gap-3 rounded-md border border-zinc-200 p-3"
                >
                  <div>
                    <p className="font-semibold text-zinc-950">{item.title}</p>
                    <p className="text-sm text-zinc-500">
                      {item.description} · {formatCurrency(item.amount)}
                    </p>
                  </div>
                  {item.type === "ONLINE" && item.status ? (
                    <Badge className={statusConfig[item.status].className}>
                      {statusConfig[item.status].label}
                    </Badge>
                  ) : (
                    <Badge className="border-teal-200 bg-teal-100 text-teal-800">
                      POS
                    </Badge>
                  )}
                </div>
              ))
            ) : (
              <p className="text-sm text-zinc-500">ຍັງບໍ່ມີລາຍການ</p>
            )}
          </CardContent>
        </Card>
      </div>
    </section>
  );
}

function parseDashboardChannel(value?: string): DashboardChannel {
  return value === "ONLINE" || value === "POS" ? value : "ALL";
}

function SalesBreakdownBlock({
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
      <div className="mt-3 grid grid-cols-2 gap-3">
        <div>
          <p className="text-xs text-zinc-500">ຍອດຂາຍ</p>
          <p className={strong ? "text-lg font-bold" : "font-bold"}>
            {formatCurrency(sales)}
          </p>
        </div>
        <div>
          <p className="text-xs text-zinc-500">ກໍາໄລ</p>
          <p
            className={
              strong
                ? "text-lg font-bold text-emerald-700"
                : "font-bold text-emerald-700"
            }
          >
            {formatCurrency(profit)}
          </p>
        </div>
      </div>
    </div>
  );
}

function TaskLink({
  href,
  icon,
  label,
  value,
  tone
}: {
  href: string;
  icon: ReactNode;
  label: string;
  value: number | string;
  tone: "zinc" | "amber" | "rose" | "emerald";
}) {
  const toneClass =
    tone === "rose"
      ? "text-rose-700 bg-rose-50 border-rose-200"
      : tone === "amber"
        ? "text-amber-700 bg-amber-50 border-amber-200"
        : tone === "emerald"
          ? "text-emerald-700 bg-emerald-50 border-emerald-200"
          : "text-zinc-700 bg-zinc-50 border-zinc-200";

  return (
    <Link
      href={href}
      className={`rounded-md border p-3 transition hover:border-zinc-400 ${toneClass}`}
    >
      <div className="mb-3 flex items-center justify-between gap-2">
        <span>{icon}</span>
        <strong className="text-xl">{value}</strong>
      </div>
      <p className="text-sm font-bold">{label}</p>
    </Link>
  );
}
