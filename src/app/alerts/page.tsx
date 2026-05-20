import Link from "next/link";
import {
  AlertTriangle,
  ClipboardCheck,
  PackagePlus,
  RotateCcw,
  ShoppingCart,
  Truck
} from "lucide-react";
import { getOrders } from "@/actions/order.action";
import { getProducts, updateProductVariantStock } from "@/actions/product.action";
import { getDailyClosing } from "@/actions/pos.action";
import { PageHeader } from "@/components/layout/page-header";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import {
  formatCurrency,
  formatDate,
  getProductVariants,
  statusConfig
} from "@/lib/utils";

export default async function AlertsPage() {
  const [orders, products, dailyClosing] = await Promise.all([
    getOrders(),
    getProducts({ activeOnly: false }),
    getDailyClosing()
  ]);

  const pendingPackOrders = orders.filter((order) => order.status === "PENDING_PACK");
  const codToShipOrders = orders.filter(
    (order) =>
      order.paymentStatus === "COD" &&
      !["SHIPPED", "CANCELLED", "RETURNED"].includes(order.status)
  );
  const returnedOrders = orders.filter((order) => order.status === "RETURNED");
  const stockRows = products
    .filter((product) => product.isActive)
    .flatMap((product) =>
      getProductVariants(product).map((variant) => ({
        product,
        variant,
        status: variant.stock <= 0 ? "OUT" : "LOW"
      }))
    )
    .filter(({ variant }) => variant.stock <= variant.lowStockAlert)
    .sort((a, b) => a.variant.stock - b.variant.stock);
  const outOfStockRows = stockRows.filter((row) => row.status === "OUT");
  const totalAlerts =
    pendingPackOrders.length +
    codToShipOrders.length +
    stockRows.length +
    returnedOrders.length +
    (dailyClosing.closing ? 0 : 1);

  return (
    <section>
      <PageHeader
        title="ແຈ້ງເຕືອນລວມ"
        description="ລວມວຽກທີ່ຕ້ອງຕິດຕາມ: ລໍຖ້າແພັກ, COD, ສະຕ໋ອກ, ປິດຍອດ ແລະ ອໍເດີຕີກັບ"
      />

      <div className="mb-4 grid gap-3 sm:grid-cols-2 xl:grid-cols-5">
        <SummaryCard label="ແຈ້ງເຕືອນທັງໝົດ" value={totalAlerts} />
        <SummaryCard label="ລໍຖ້າແພັກ" value={pendingPackOrders.length} tone="amber" />
        <SummaryCard label="COD ຍັງບໍ່ສົ່ງ" value={codToShipOrders.length} tone="sky" />
        <SummaryCard label="ສະຕ໋ອກໝົດ" value={outOfStockRows.length} tone="rose" />
        <SummaryCard
          label="ປິດຍອດມື້ນີ້"
          value={dailyClosing.closing ? "ປິດແລ້ວ" : "ຍັງບໍ່ປິດ"}
          tone={dailyClosing.closing ? "emerald" : "amber"}
        />
      </div>

      <div className="grid gap-4 xl:grid-cols-2">
        <AlertSection
          title="ອໍເດີລໍຖ້າແພັກ"
          icon={<ShoppingCart className="h-5 w-5" aria-hidden />}
          actionHref="/orders/history?status=PENDING_PACK"
          actionLabel="ເບິ່ງອໍເດີລໍຖ້າແພັກ"
        >
          <OrderRows orders={pendingPackOrders} emptyText="ບໍ່ມີອໍເດີລໍຖ້າແພັກ" />
        </AlertSection>

        <AlertSection
          title="COD ຍັງບໍ່ສົ່ງ"
          icon={<Truck className="h-5 w-5" aria-hidden />}
          actionHref="/orders/history?status=ALL"
          actionLabel="ໄປກວດອໍເດີ COD"
        >
          <OrderRows orders={codToShipOrders} showAmount emptyText="ບໍ່ມີ COD ຄ້າງສົ່ງ" />
        </AlertSection>

        <AlertSection
          title="ສະຕ໋ອກໃກ້ໝົດ / ໝົດ"
          icon={<AlertTriangle className="h-5 w-5" aria-hidden />}
          actionHref="/stock-alerts"
          actionLabel="ໄປໜ້າແຈ້ງເຕືອນສະຕ໋ອກ"
        >
          {stockRows.length ? (
            <div className="grid gap-2">
              {stockRows.slice(0, 8).map(({ product, variant, status }) => (
                <div
                  key={`${product.id}-${variant.id}`}
                  className="grid gap-3 rounded-md border border-zinc-200 p-3 md:grid-cols-[1fr_auto]"
                >
                  <div className="min-w-0">
                    <div className="flex flex-wrap items-center gap-2">
                      <p className="font-bold text-zinc-950">{product.name}</p>
                      <Badge
                        className={
                          status === "OUT"
                            ? "border-rose-200 bg-rose-100 text-rose-800"
                            : "border-amber-200 bg-amber-100 text-amber-800"
                        }
                      >
                        {status === "OUT" ? "ໝົດສະຕ໋ອກ" : "ໃກ້ໝົດ"}
                      </Badge>
                    </div>
                    <p className="text-sm text-zinc-500">
                      {variant.name} · SKU: {variant.sku}
                    </p>
                    <p className="mt-1 text-sm font-semibold text-zinc-950">
                      ສະຕ໋ອກ {variant.stock} / ແຈ້ງເຕືອນ {variant.lowStockAlert}
                    </p>
                  </div>
                  <form action={updateProductVariantStock} className="flex gap-2">
                    <input type="hidden" name="productId" value={product.id} />
                    <input type="hidden" name="variantId" value={variant.id} />
                    <Input
                      name="quantity"
                      type="number"
                      min={1}
                      defaultValue={1}
                      className="w-24"
                      aria-label={`ເພີ່ມສະຕ໋ອກ ${product.name}`}
                    />
                    <Button type="submit" className="shrink-0">
                      <PackagePlus className="h-4 w-4" aria-hidden />
                      ເພີ່ມ
                    </Button>
                  </form>
                </div>
              ))}
            </div>
          ) : (
            <EmptyText text="ບໍ່ມີສິນຄ້າໃກ້ໝົດ ຫຼື ໝົດສະຕ໋ອກ" />
          )}
        </AlertSection>

        <AlertSection
          title="ປິດຍອດປະຈໍາວັນ"
          icon={<ClipboardCheck className="h-5 w-5" aria-hidden />}
          actionHref="/pos/closing"
          actionLabel="ໄປປິດຍອດ"
        >
          {dailyClosing.closing ? (
            <div className="rounded-md border border-emerald-200 bg-emerald-50 p-3">
              <p className="font-bold text-emerald-800">ປິດຍອດມື້ນີ້ແລ້ວ</p>
              <p className="text-sm text-emerald-700">
                {dailyClosing.closing.closingNo ?? dailyClosing.closing.id}
              </p>
            </div>
          ) : (
            <div className="rounded-md border border-amber-200 bg-amber-50 p-3">
              <p className="font-bold text-amber-800">ຍັງບໍ່ປິດຍອດມື້ນີ້</p>
              <p className="text-sm text-amber-700">
                ຍອດ POS ມື້ນີ້ {formatCurrency(dailyClosing.summary.totalAmount)}
              </p>
            </div>
          )}
        </AlertSection>

        <AlertSection
          title="ອໍເດີຕີກັບ"
          icon={<RotateCcw className="h-5 w-5" aria-hidden />}
          actionHref="/orders/history?status=RETURNED"
          actionLabel="ເບິ່ງອໍເດີຕີກັບ"
        >
          <OrderRows
            orders={returnedOrders}
            showReturn
            emptyText="ບໍ່ມີອໍເດີຕີກັບ"
          />
        </AlertSection>
      </div>
    </section>
  );
}

function SummaryCard({
  label,
  value,
  tone = "zinc"
}: {
  label: string;
  value: string | number;
  tone?: "zinc" | "amber" | "rose" | "sky" | "emerald";
}) {
  const color =
    tone === "amber"
      ? "text-amber-700"
      : tone === "rose"
        ? "text-rose-700"
        : tone === "sky"
          ? "text-sky-700"
          : tone === "emerald"
            ? "text-emerald-700"
            : "text-zinc-950";

  return (
    <Card>
      <CardContent>
        <p className="text-sm text-zinc-500">{label}</p>
        <p className={`mt-1 text-2xl font-bold ${color}`}>{value}</p>
      </CardContent>
    </Card>
  );
}

function AlertSection({
  title,
  icon,
  children,
  actionHref,
  actionLabel
}: {
  title: string;
  icon: React.ReactNode;
  children: React.ReactNode;
  actionHref: string;
  actionLabel: string;
}) {
  return (
    <Card>
      <CardHeader>
        <div className="flex items-start justify-between gap-3">
          <CardTitle className="flex items-center gap-2">
            {icon}
            {title}
          </CardTitle>
          <Link
            href={actionHref}
            className="text-sm font-semibold text-zinc-600 hover:text-zinc-950"
          >
            {actionLabel}
          </Link>
        </div>
      </CardHeader>
      <CardContent>{children}</CardContent>
    </Card>
  );
}

function OrderRows({
  orders,
  emptyText,
  showAmount = false,
  showReturn = false
}: {
  orders: Awaited<ReturnType<typeof getOrders>>;
  emptyText: string;
  showAmount?: boolean;
  showReturn?: boolean;
}) {
  if (!orders.length) {
    return <EmptyText text={emptyText} />;
  }

  return (
    <div className="grid gap-2">
      {orders.slice(0, 8).map((order) => (
        <Link
          key={order.id}
          href={`/orders/history?search=${encodeURIComponent(
            order.orderNo ?? order.id
          )}`}
          className="block rounded-md border border-zinc-200 p-3 hover:bg-zinc-50"
        >
          <div className="flex items-start justify-between gap-3">
            <div className="min-w-0">
              <p className="truncate font-bold text-zinc-950">{order.customerName}</p>
              <p className="text-xs font-semibold text-zinc-500">
                {order.orderNo ?? order.id.slice(-8).toUpperCase()}
              </p>
              <p className="mt-1 text-sm text-zinc-500">
                {order.phone} · {order.shippingCompany}
              </p>
            </div>
            <Badge className={statusConfig[order.status].className}>
              {statusConfig[order.status].label}
            </Badge>
          </div>
          <div className="mt-2 flex flex-wrap items-center justify-between gap-2 text-sm">
            <span className="text-zinc-500">
              {formatDate(new Date(order.createdAt))}
            </span>
            {showAmount ? (
              <strong className="text-zinc-950">
                COD {formatCurrency(order.totalAmount)}
              </strong>
            ) : null}
          </div>
          {showReturn ? (
            <p className="mt-2 rounded-md bg-rose-50 px-2 py-1 text-sm text-rose-700">
              {order.returnReason || "ບໍ່ລະບຸເຫດຜົນ"}
            </p>
          ) : null}
        </Link>
      ))}
    </div>
  );
}

function EmptyText({ text }: { text: string }) {
  return (
    <div className="rounded-md border border-dashed border-zinc-300 p-6 text-center text-sm text-zinc-500">
      {text}
    </div>
  );
}
