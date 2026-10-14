import Image from "next/image";
import { PackageCheck, Search } from "lucide-react";
import { getSoldProducts } from "@/actions/sold-products.action";
import { PageHeader } from "@/components/layout/page-header";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Input, Select } from "@/components/ui/input";
import { EmptyState, FilterBar, MetricCard } from "@/components/ui/patterns";
import {
  formatCurrency,
  formatDate,
  isDefaultVariantName
} from "@/lib/utils";
import type { DashboardChannel } from "@/types";

const channelLabels: Record<DashboardChannel, string> = {
  ALL: "ທັງໝົດ",
  ONLINE: "ອອນລາຍ",
  POS: "ຂາຍໜ້າຮ້ານ"
};

export default async function SoldProductsPage({
  searchParams
}: {
  searchParams?: Promise<{
    channel?: string;
    search?: string;
    date?: string;
    day?: string;
    month?: string;
    year?: string;
  }>;
}) {
  const params = await searchParams;
  const selectedDate = buildSelectedDate(params);
  const selectedDateParts = splitDate(selectedDate);
  const data = await getSoldProducts({
    channel: params?.channel,
    search: params?.search,
    date: selectedDate
  });

  return (
    <section>
      <PageHeader
        title="ປະຫວັດສິນຄ້າທີ່ຂາຍ"
        description="ເບິ່ງສິນຄ້າທີ່ຂາຍແລ້ວ ແຍກອອນລາຍ ຂາຍໜ້າຮ້ານ ຫຼື ລວມທັງໝົດ"
      />

      <FilterBar className="md:grid-cols-[1fr_13rem_6rem_7rem_7rem_auto]">
        <label className="relative">
          <Search className="pointer-events-none absolute left-3 top-3 h-5 w-5 text-slate-400" />
          <Input
            name="search"
            defaultValue={params?.search ?? ""}
            placeholder="ຄົ້ນຫາຊື່ສິນຄ້າ ຫຼື SKU"
            className="pl-10"
          />
        </label>
        <Select name="channel" defaultValue={data.channel}>
          <option value="ALL">ທັງໝົດ</option>
          <option value="ONLINE">ອອນລາຍ</option>
          <option value="POS">ຂາຍໜ້າຮ້ານ</option>
        </Select>
        <Select name="day" defaultValue={selectedDateParts.day}>
          <option value="">ວັນ</option>
          {Array.from({ length: 31 }, (_, index) => String(index + 1)).map((day) => (
            <option key={day} value={day}>
              {day}
            </option>
          ))}
        </Select>
        <Select name="month" defaultValue={selectedDateParts.month}>
          <option value="">ເດືອນ</option>
          {Array.from({ length: 12 }, (_, index) => String(index + 1)).map((month) => (
            <option key={month} value={month}>
              {month}
            </option>
          ))}
        </Select>
        <Select name="year" defaultValue={selectedDateParts.year}>
          <option value="">ປີ</option>
          {getYearOptions().map((year) => (
            <option key={year} value={year}>
              {year}
            </option>
          ))}
        </Select>
        <Button type="submit" className="w-full md:w-auto">
          ຄົ້ນຫາ
        </Button>
      </FilterBar>

      {selectedDate ? (
        <div className="mb-4 rounded-xl border border-slate-200 bg-slate-50 px-3 py-2 text-sm font-semibold text-slate-700">
          ສະແດງສິນຄ້າຂາຍຂອງວັນທີ {selectedDate}
        </div>
      ) : null}

      <div className="mb-4 grid grid-cols-2 gap-3 sm:grid-cols-3">
        <MetricCard label="ຈໍານວນທີ່ຂາຍ" value={`${data.totalQuantity}`} tone="sky" />
        <MetricCard label="ຍອດຂາຍ" value={formatCurrency(data.totalAmount)} tone="indigo" />
        <MetricCard label="ກໍາໄລ" value={formatCurrency(data.totalProfit)} tone="emerald" />
      </div>

      {data.items.length ? (
        <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-3">
          {data.items.map((item) => (
            <Card key={`${item.productId}-${item.variantId ?? item.sku}`}>
              <CardContent className="grid grid-cols-[5.5rem_1fr] gap-3">
                <div className="relative h-24 overflow-hidden rounded-xl bg-slate-100">
                  {item.imageUrl ? (
                    <Image
                      src={item.imageUrl}
                      alt={item.name}
                      fill
                      className="object-cover"
                      sizes="88px"
                    />
                  ) : (
                    <div className="flex h-full items-center justify-center text-slate-400">
                      <PackageCheck className="h-8 w-8" aria-hidden />
                    </div>
                  )}
                </div>
                <div className="min-w-0">
                  <div className="flex items-start justify-between gap-2">
                    <div className="min-w-0">
                      <p className="truncate font-bold text-slate-950">
                        {item.name}
                      </p>
                      {item.variantName && !isDefaultVariantName(item.variantName) ? (
                        <p className="truncate text-sm text-slate-500">
                          {item.variantName}
                        </p>
                      ) : null}
                    </div>
                    <Badge className="border-emerald-200 bg-emerald-100 text-emerald-800">
                      x{item.quantity}
                    </Badge>
                  </div>
                  <p className="mt-1 text-sm text-slate-500">SKU: {item.sku}</p>
                  <div className="mt-3 grid grid-cols-2 gap-2 text-sm">
                    <div className="rounded-xl bg-slate-50 p-2">
                      <p className="text-xs text-slate-500">ລາຄາຫຼ້າສຸດ</p>
                      <p className="font-bold">{formatCurrency(item.latestPrice)}</p>
                    </div>
                    <div className="rounded-xl bg-slate-50 p-2">
                      <p className="text-xs text-slate-500">ຍອດຂາຍລວມ</p>
                      <p className="font-bold">{formatCurrency(item.totalAmount)}</p>
                    </div>
                  </div>
                  <div className="mt-2 flex items-center justify-between text-sm">
                    <span className="text-slate-500">
                      {formatDate(new Date(item.lastSoldAt))}
                    </span>
                    <span className="font-bold text-emerald-700">
                      {formatCurrency(item.profit)}
                    </span>
                  </div>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      ) : (
        <EmptyState
          title="ບໍ່ພົບສິນຄ້າທີ່ຂາຍແລ້ວ"
          description={`ບໍ່ມີລາຍການໃນຊ່ອງທາງ ${channelLabels[data.channel]} ຕາມເງື່ອນໄຂທີ່ເລືອກ`}
        />
      )}
    </section>
  );
}

function buildSelectedDate(
  params?: { date?: string; day?: string; month?: string; year?: string }
) {
  if (params?.date && /^\d{4}-\d{2}-\d{2}$/.test(params.date)) {
    return params.date;
  }

  const day = Number(params?.day);
  const month = Number(params?.month);
  const year = Number(params?.year);

  if (!day || !month || !year) {
    return "";
  }

  const date = new Date(year, month - 1, day);

  if (
    date.getFullYear() !== year ||
    date.getMonth() !== month - 1 ||
    date.getDate() !== day
  ) {
    return "";
  }

  return [
    String(year).padStart(4, "0"),
    String(month).padStart(2, "0"),
    String(day).padStart(2, "0")
  ].join("-");
}

function splitDate(value: string) {
  const match = /^(\d{4})-(\d{2})-(\d{2})$/.exec(value);

  if (!match) {
    return { day: "", month: "", year: "" };
  }

  return {
    year: String(Number(match[1])),
    month: String(Number(match[2])),
    day: String(Number(match[3]))
  };
}

function getYearOptions() {
  const currentYear = new Date().getFullYear();

  return Array.from({ length: 5 }, (_, index) =>
    String(currentYear - 3 + index)
  );
}
