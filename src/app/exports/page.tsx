import type { ReactNode } from "react";
import Link from "next/link";
import { getMembers } from "@/actions/member.action";
import { getOrders } from "@/actions/order.action";
import { getSales, getDailyClosings } from "@/actions/pos.action";
import { getProducts } from "@/actions/product.action";
import { getStoreSettings } from "@/actions/settings.action";
import { ExportPrintButton } from "@/components/exports/export-print-button";
import { PageHeader } from "@/components/layout/page-header";
import { Card, CardContent } from "@/components/ui/card";
import { effectiveSaleAmount, isRevenueSale } from "@/lib/sales";
import {
  formatCurrency,
  formatDate,
  formatProductVariantName,
  getProductVariants,
  isDefaultVariantName,
  statusConfig
} from "@/lib/utils";

export default async function ExportsPage() {
  const [products, orders, sales, closings, settings, members] = await Promise.all([
    getProducts(),
    getOrders(),
    getSales({ includeInactive: true }),
    getDailyClosings(),
    getStoreSettings(),
    getMembers()
  ]);
  const shippedOrders = orders.filter((order) => order.status === "SHIPPED");
  const activeSales = sales.filter(isRevenueSale);
  const onlineTotal = shippedOrders.reduce((sum, order) => sum + order.totalAmount, 0);
  const posTotal = activeSales.reduce((sum, sale) => sum + effectiveSaleAmount(sale), 0);

  return (
    <section>
      <div className="print:hidden">
        <PageHeader
          title="Export ຂໍ້ມູນ"
          description="ລວມຂໍ້ມູນສິນຄ້າ ອໍເດີ ບິນໜ້າຮ້ານ ແລະປິດຍອດ ໃນຮູບແບບອ່ານງ່າຍ"
        />
        <div className="mb-4">
          <div className="flex flex-wrap gap-2">
            <ExportPrintButton />
            <Link href="/api/exports/sales" className="inline-flex min-h-11 items-center rounded-xl bg-emerald-600 px-4 text-sm font-bold text-white hover:bg-emerald-700">
              CSV ການຂາຍ (Excel)
            </Link>
            <Link href="/api/exports/products" className="inline-flex min-h-11 items-center rounded-xl bg-sky-600 px-4 text-sm font-bold text-white hover:bg-sky-700">
              CSV ສິນຄ້າ
            </Link>
            <Link href="/api/exports/stock-movements" className="inline-flex min-h-11 items-center rounded-xl bg-amber-600 px-4 text-sm font-bold text-white hover:bg-amber-700">
              CSV ປະຫວັດສະຕ໋ອກ
            </Link>
          </div>
        </div>
      </div>

      <Card className="export-report">
        <CardContent className="space-y-6">
          <div className="border-b border-slate-200 pb-4 text-center">
            <p className="text-2xl font-bold text-slate-950">{settings.storeName}</p>
            <p className="text-sm text-slate-500">
              Export: {formatDate(new Date())}
            </p>
          </div>

          <section>
            <h3 className="mb-2 text-lg font-bold">ສະຫຼຸບລວມ</h3>
            <div className="grid gap-2 sm:grid-cols-5">
              <Summary label="ສິນຄ້າ" value={`${products.length}`} />
              <Summary label="ອໍເດີ" value={`${orders.length}`} />
              <Summary label="ບິນ POS" value={`${sales.length}`} />
              <Summary label="ສະມາຊິກ" value={`${members.length}`} />
              <Summary label="ຍອດຂາຍລວມ" value={formatCurrency(onlineTotal + posTotal)} />
            </div>
          </section>

          <ExportTable title="ສະມາຊິກ">
            <thead>
              <tr>
                <th>ຊື່</th>
                <th>ເບີໂທ</th>
                <th>ລະດັບ</th>
                <th>ສ່ວນຫຼຸດ</th>
                <th>ຍອດຊື້ສະສົມ</th>
                <th>ຈໍານວນບິນ</th>
                <th>ຊື້ຫຼ້າສຸດ</th>
                <th>ສະຖານະ</th>
              </tr>
            </thead>
            <tbody>
              {members.map((member) => (
                <tr key={member.id}>
                  <td>{member.name}</td>
                  <td>{member.phone}</td>
                  <td>{member.tier?.name ?? "-"}</td>
                  <td>{member.tier?.discountPercent ?? 0}%</td>
                  <td>{formatCurrency(member.totalSpend)}</td>
                  <td>{member.billCount}</td>
                  <td>
                    {member.lastPurchaseAt
                      ? formatDate(new Date(member.lastPurchaseAt))
                      : "-"}
                  </td>
                  <td>{member.isActive ? "ໃຊ້ງານ" : "ປິດໃຊ້ງານ"}</td>
                </tr>
              ))}
            </tbody>
          </ExportTable>

          <ExportTable title="ສິນຄ້າ">
            <thead>
              <tr>
                <th>SKU</th>
                <th>ຊື່ສິນຄ້າ</th>
                <th>ໝວດໝູ່</th>
                <th>ຂະໜາດ/Variant</th>
                <th>ຕົ້ນທຶນ</th>
                <th>ລາຄາຂາຍ</th>
                <th>ສະຕ໋ອກ</th>
              </tr>
            </thead>
            <tbody>
              {products.flatMap((product) =>
                getProductVariants(product).map((variant) => (
                  <tr key={`${product.id}-${variant.id}`}>
                    <td>{variant.sku}</td>
                    <td>{product.name}</td>
                    <td>{product.category}</td>
                    <td>{isDefaultVariantName(variant.name) ? "-" : variant.name}</td>
                    <td>{formatCurrency(variant.costPrice)}</td>
                    <td>{formatCurrency(variant.sellPrice)}</td>
                    <td>{variant.stock}</td>
                  </tr>
                ))
              )}
            </tbody>
          </ExportTable>

          <ExportTable title="ອໍເດີອອນລາຍ">
            <thead>
              <tr>
                <th>ເລກອໍເດີ</th>
                <th>ວັນທີ</th>
                <th>ລູກຄ້າ</th>
                <th>ເບີ</th>
                <th>ຂົນສົ່ງ</th>
                <th>ສະຖານະ</th>
                <th>ສິນຄ້າ</th>
                <th>ຍອດຂາຍ</th>
                <th>ກໍາໄລ</th>
              </tr>
            </thead>
            <tbody>
              {orders.map((order) => (
                <tr key={order.id}>
                  <td>{order.orderNo ?? order.id.slice(-8).toUpperCase()}</td>
                  <td>{formatDate(new Date(order.createdAt))}</td>
                  <td>{order.customerName}</td>
                  <td>{order.phone}</td>
                  <td>
                    {order.shippingCompany} / {order.pickupBranch || "-"} / {order.city} /{" "}
                    {order.province}
                  </td>
                  <td>{statusConfig[order.status].label}</td>
                  <td>
                    {order.items
                      .map((item) => `${formatProductVariantName(item.name, item.variantName)} x${item.quantity}`)
                      .join(", ")}
                  </td>
                  <td>{formatCurrency(order.totalAmount)}</td>
                  <td>{formatCurrency(order.profit)}</td>
                </tr>
              ))}
            </tbody>
          </ExportTable>

          <ExportTable title="ບິນຂາຍໜ້າຮ້ານ">
            <thead>
              <tr>
                <th>ເລກບິນ</th>
                <th>ວັນທີ</th>
                <th>ສະຖານະ</th>
                <th>ວິທີຊໍາລະ</th>
                <th>ສະມາຊິກ</th>
                <th>ສິນຄ້າ</th>
                <th>ຍອດສຸດທິ</th>
                <th>ກໍາໄລ</th>
              </tr>
            </thead>
            <tbody>
              {sales.map((sale) => (
                <tr key={sale.id}>
                  <td>{sale.saleNo ?? sale.id.slice(-8).toUpperCase()}</td>
                  <td>{formatDate(new Date(sale.createdAt))}</td>
                  <td>{saleStatusLabel(sale.status)}</td>
                  <td>{paymentLabel(sale.paymentMethod)}</td>
                  <td>
                    {sale.memberName
                      ? `${sale.memberName} / ${sale.memberPhone ?? "-"} / ${
                          sale.memberTierName ?? "-"
                        }`
                      : "-"}
                  </td>
                  <td>
                    {sale.items
                      .map((item) => `${formatProductVariantName(item.name, item.variantName)} x${item.quantity}`)
                      .join(", ")}
                  </td>
                  <td>{formatCurrency(sale.netAmount)}</td>
                  <td>{formatCurrency(sale.profit)}</td>
                </tr>
              ))}
            </tbody>
          </ExportTable>

          <ExportTable title="ປະຫວັດປິດຍອດ">
            <thead>
              <tr>
                <th>ເລກປິດຍອດ</th>
                <th>ວັນທີ</th>
                <th>ເງິນສົດ</th>
                <th>ເງິນໂອນ</th>
                <th>ລວມ</th>
                <th>ກີບຮັບສຸດທິຈິງ</th>
                <th>ສ່ວນຕ່າງກີບ</th>
                <th>ບາດຮັບຈິງ</th>
                <th>ສ່ວນຕ່າງບາດ</th>
                <th>ໝາຍເຫດ</th>
              </tr>
            </thead>
            <tbody>
              {closings.map((closing) => (
                <tr key={closing.id}>
                  <td>{closing.closingNo ?? closing.id.slice(-8).toUpperCase()}</td>
                  <td>{closing.date}</td>
                  <td>{formatCurrency(closing.cashAmount)}</td>
                  <td>{formatCurrency(closing.transferAmount)}</td>
                  <td>{formatCurrency(closing.totalAmount)}</td>
                  <td>{formatCurrency(closing.countedCash)}</td>
                  <td>{formatCurrency(closing.cashDifference)}</td>
                  <td>{formatThb(closing.countedThb ?? 0)}</td>
                  <td>{formatThb(closing.differenceThb ?? 0)}</td>
                  <td>{closing.note || "-"}</td>
                </tr>
              ))}
            </tbody>
          </ExportTable>
        </CardContent>
      </Card>
    </section>
  );
}

function Summary({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-xl bg-slate-50 p-3">
      <p className="text-sm text-slate-500">{label}</p>
      <p className="font-bold text-slate-950">{value}</p>
    </div>
  );
}

function ExportTable({
  title,
  children
}: {
  title: string;
  children: ReactNode;
}) {
  return (
    <section>
      <h3 className="mb-2 text-lg font-bold">{title}</h3>
      <div className="overflow-x-auto">
        <table className="w-full border-collapse text-left text-xs">
          {children}
        </table>
      </div>
    </section>
  );
}

function paymentLabel(value: string) {
  if (value === "SPLIT") {
    return "ແບ່ງຈ່າຍ";
  }
  if (value === "TRANSFER") {
    return "ເງິນໂອນ";
  }

  if (value === "OTHER") {
    return "ອື່ນໆ";
  }

  return "ເງິນສົດ";
}

function saleStatusLabel(value?: string) {
  if (value === "PARTIALLY_RETURNED") {
    return "ຄືນບາງສ່ວນ";
  }
  if (value === "CANCELLED") {
    return "ຍົກເລີກ";
  }

  if (value === "RETURNED") {
    return "ຄືນສິນຄ້າ";
  }

  return "ປົກກະຕິ";
}
import { formatThb } from "@/lib/currency";
