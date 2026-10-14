import Link from "next/link";
import { CalendarClock } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { EmptyState } from "@/components/ui/patterns";
import { ExpiryBadge } from "./expiry-badge";
import { EXPIRY_WARNING_DAYS, formatExpiryDate, type ProductExpiryAlert } from "@/lib/product-expiry";
import { formatProductVariantName } from "@/lib/utils";

export function ExpiryAlertList({ alerts, today }: { alerts: ProductExpiryAlert[]; today: string }) {
  const expired = alerts.filter(({ expiry }) => expiry.status === "EXPIRED").length;
  const dueToday = alerts.filter(({ expiry }) => expiry.status === "TODAY").length;
  const soon = alerts.filter(({ expiry }) => expiry.status === "SOON").length;

  return (
    <Card id="expiry" className="mb-5 scroll-mt-5 border-amber-200">
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <CalendarClock className="h-5 w-5 text-amber-600" aria-hidden />
          ສິນຄ້າໃກ້ໝົດອາຍຸ / ໝົດອາຍຸ
        </CardTitle>
        <p className="mt-2 text-sm text-slate-500">
          ແຈ້ງລ່ວງໜ້າ {EXPIRY_WARNING_DAYS} ມື້ · ສະແດງສະເພາະລາຍການທີ່ຍັງມີສະຕ໋ອກ · ເວລາລາວ
        </p>
      </CardHeader>
      <CardContent>
        <div className="mb-4 grid grid-cols-1 gap-2 sm:grid-cols-3">
          <p className="rounded-xl bg-rose-50 p-3 text-sm text-rose-800">ໝົດອາຍຸແລ້ວ <strong>{expired}</strong> ລາຍການ</p>
          <p className="rounded-xl bg-orange-50 p-3 text-sm text-orange-800">ໝົດອາຍຸມື້ນີ້ <strong>{dueToday}</strong> ລາຍການ</p>
          <p className="rounded-xl bg-amber-50 p-3 text-sm text-amber-800">ໃກ້ໝົດອາຍຸ <strong>{soon}</strong> ລາຍການ</p>
        </div>
        {alerts.length ? (
          <div className="grid max-h-[32rem] gap-2 overflow-y-auto">
            {alerts.map(({ product, variant, expiry }) => (
              <Link
                key={`${product.id}-${variant.id}`}
                href={`/products?search=${encodeURIComponent(variant.sku)}`}
                className="flex flex-col gap-2 rounded-xl border border-slate-200 p-3 transition hover:border-indigo-300 hover:bg-indigo-50/30 sm:flex-row sm:items-center sm:justify-between"
              >
                <div className="min-w-0">
                  <p className="font-bold text-slate-900">{formatProductVariantName(product.name, variant.name)}</p>
                  <p className="mt-1 text-xs text-slate-500">SKU: {variant.sku} · ສະຕ໋ອກ {variant.stock}{product.isActive ? "" : " · ປິດຂາຍ"}</p>
                </div>
                <div className="flex flex-wrap items-center gap-2 sm:justify-end">
                  <span className="text-sm text-slate-600">{formatExpiryDate(expiry.expiryDate)}</span>
                  <ExpiryBadge expiryDate={variant.expiryDate} today={today} />
                </div>
              </Link>
            ))}
          </div>
        ) : (
          <EmptyState title="ບໍ່ມີສິນຄ້າໃກ້ໝົດອາຍຸ" description="ກຳນົດວັນໝົດອາຍຸໃນໜ້າເພີ່ມ ຫຼື ແກ້ໄຂສິນຄ້າ ເພື່ອເລີ່ມຕິດຕາມ" />
        )}
      </CardContent>
    </Card>
  );
}
