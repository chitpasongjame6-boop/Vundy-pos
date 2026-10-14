import Link from "next/link";
import { PackagePlus } from "lucide-react";
import { getProducts } from "@/actions/product.action";
import { updateProductVariantStock } from "@/actions/product.action";
import { PageHeader } from "@/components/layout/page-header";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { EmptyState, MetricCard } from "@/components/ui/patterns";
import { formatProductVariantName, getProductVariants } from "@/lib/utils";

export default async function StockAlertsPage() {
  const products = await getProducts({ activeOnly: false });
  const rows = products
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
  const outCount = rows.filter((row) => row.status === "OUT").length;

  return (
    <section>
      <PageHeader
        title="ແຈ້ງເຕືອນສະຕ໋ອກ"
        description="ລວມສິນຄ້າທີ່ໃກ້ໝົດ ຫຼື ໝົດສະຕ໋ອກ ພ້ອມເພີ່ມສະຕ໋ອກໄດ້ທັນທີ"
        actionHref="/products"
        actionLabel="ໄປໜ້າສິນຄ້າ"
      />

      <div className="mb-4 grid grid-cols-2 gap-3 sm:grid-cols-3">
        <MetricCard label="ລາຍການແຈ້ງເຕືອນ" value={rows.length} tone="indigo" />
        <MetricCard label="ໝົດສະຕ໋ອກ" value={outCount} tone="rose" />
        <MetricCard label="ໃກ້ໝົດ" value={rows.length - outCount} tone="amber" />
      </div>

      {rows.length ? (
        <div className="grid gap-3 xl:grid-cols-2">
          {rows.map(({ product, variant, status }) => (
            <Card key={`${product.id}-${variant.id}`}>
              <CardContent className="grid gap-3 md:grid-cols-[1fr_auto]">
                <div className="min-w-0">
                  <div className="flex flex-wrap items-start gap-2">
                    <div className="min-w-0 flex-1">
                      <p className="font-bold text-slate-950">{product.name}</p>
                      <p className="text-sm text-slate-500">
                        {formatProductVariantName(product.name, variant.name)} · SKU: {variant.sku}
                      </p>
                    </div>
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
                  <div className="mt-3 grid grid-cols-3 gap-2 text-sm">
                    <Info label="ສະຕ໋ອກ" value={variant.stock} strong={status === "OUT"} />
                    <Info label="ແຈ້ງເຕືອນຕໍ່າກວ່າ" value={variant.lowStockAlert} />
                    <Info label="ໝວດໝູ່" value={product.category} />
                  </div>
                </div>
                <form action={updateProductVariantStock} className="grid min-w-0 gap-2 md:min-w-[14rem]">
                  <input type="hidden" name="productId" value={product.id} />
                  <input type="hidden" name="variantId" value={variant.id} />
                  <Input
                    name="quantity"
                    type="number"
                    min={1}
                    defaultValue={1}
                    aria-label={`ເພີ່ມສະຕ໋ອກ ${product.name}`}
                  />
                  <Button type="submit">
                    <PackagePlus className="h-4 w-4" aria-hidden />
                    ເພີ່ມສະຕ໋ອກ
                  </Button>
                  <Link
                    href={`/products?search=${encodeURIComponent(variant.sku)}`}
                    className="text-center text-sm font-semibold text-slate-600 hover:text-slate-950"
                  >
                    ເບິ່ງລາຍລະອຽດ
                  </Link>
                </form>
              </CardContent>
            </Card>
          ))}
        </div>
      ) : (
        <EmptyState
          title="ສະຕ໋ອກຢູ່ໃນລະດັບປົກກະຕິ"
          description="ຍັງບໍ່ມີສິນຄ້າໃກ້ໝົດ ຫຼື ໝົດສະຕ໋ອກ"
        />
      )}
    </section>
  );
}

function Info({
  label,
  value,
  strong = false
}: {
  label: string;
  value: string | number;
  strong?: boolean;
}) {
  return (
    <div className="rounded-xl bg-slate-50 p-2">
      <p className="text-xs text-slate-500">{label}</p>
      <p className={strong ? "font-bold text-rose-700" : "font-bold text-slate-950"}>
        {value}
      </p>
    </div>
  );
}
