"use client";

import Image from "next/image";
import { useState } from "react";
import { Banknote, Eye, Package, Printer, X } from "lucide-react";
import { voidPosSale } from "@/actions/pos.action";
import type { Sale, StoreSettings } from "@/types";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Select, Textarea } from "@/components/ui/input";
import { printPosReceiptCopy } from "@/components/pos/pos-receipt-printer";
import { cn, formatCurrency, formatDate } from "@/lib/utils";

export function PosSaleHistory({
  sales,
  storeSettings
}: {
  sales: Sale[];
  storeSettings: StoreSettings;
}) {
  const [selectedSaleId, setSelectedSaleId] = useState<string | null>(null);
  const selectedSale = sales.find((sale) => sale.id === selectedSaleId);

  if (!sales.length) {
    return (
      <Card>
        <CardContent>
          <p className="text-sm text-zinc-500">ບໍ່ພົບບິນຕາມເງື່ອນໄຂທີ່ເລືອກ</p>
        </CardContent>
      </Card>
    );
  }

  return (
    <>
      <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-3">
        {sales.map((sale) => (
          <Card key={sale.id}>
            <CardContent className="space-y-3">
              <div className="flex items-start justify-between gap-3">
                <div className="min-w-0">
                  <p className="font-bold text-zinc-950">
                    {sale.saleNo ?? `Bill #${sale.id.slice(-8).toUpperCase()}`}
                  </p>
                  <p className="text-sm text-zinc-500">
                    {formatDate(new Date(sale.createdAt))}
                  </p>
                  {sale.cashierName ? (
                    <p className="text-xs font-semibold text-zinc-500">
                      ຜູ້ຂາຍ: {sale.cashierName}
                    </p>
                  ) : null}
                  {sale.memberName ? (
                    <p className="text-xs font-semibold text-emerald-700">
                      ສະມາຊິກ: {sale.memberName} / {sale.memberPhone}
                    </p>
                  ) : null}
                </div>
                <Badge className={saleStatusClassName(sale)}>
                  {saleStatusLabel(sale)}
                </Badge>
              </div>

              <div className="rounded-md border border-zinc-200 p-3">
                {sale.items[0] ? (
                  <div className="grid grid-cols-[3rem_1fr] items-center gap-3">
                    <SaleItemThumbnail
                      imageUrl={sale.items[0].imageUrl}
                      name={sale.items[0].name}
                      size="sm"
                    />
                    <div className="min-w-0">
                      <p className="truncate text-sm font-semibold text-zinc-950">
                        {sale.items[0].name}
                        {sale.items[0].variantName
                          ? ` - ${sale.items[0].variantName}`
                          : ""}
                      </p>
                      <p className="mt-1 truncate text-sm text-zinc-500">
                        {sale.items.reduce((sum, item) => sum + item.quantity, 0)} ຊິ້ນ
                        {sale.items.length > 1
                          ? ` · +${sale.items.length - 1} ລາຍການ`
                          : ""}
                      </p>
                    </div>
                  </div>
                ) : (
                  <p className="flex items-center gap-2 text-sm font-semibold text-zinc-950">
                    <Package className="h-4 w-4 text-zinc-500" aria-hidden />
                    ບໍ່ມີລາຍການ
                  </p>
                )}
              </div>

              <div className="grid grid-cols-2 gap-2 text-sm">
                <div className="rounded-md bg-zinc-50 p-2">
                  <p className="text-xs text-zinc-500">ຍອດສຸດທິ</p>
                  <p className="font-bold text-zinc-950">
                    {formatCurrency(sale.netAmount)}
                  </p>
                </div>
                <div className="rounded-md bg-zinc-50 p-2">
                  <p className="text-xs text-zinc-500">ກໍາໄລ</p>
                  <p className="font-bold text-emerald-700">
                    {formatCurrency(sale.profit)}
                  </p>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-2">
                <Button
                  type="button"
                  variant="secondary"
                  className="w-full"
                  onClick={() => setSelectedSaleId(sale.id)}
                >
                  <Eye className="h-4 w-4" aria-hidden />
                  ເບິ່ງ
                </Button>
                <Button
                  type="button"
                  variant="secondary"
                  className="w-full border-sky-200 bg-sky-600 text-white hover:bg-sky-700"
                  onClick={() => printPosReceiptCopy(sale, storeSettings)}
                  disabled={!isActiveSale(sale)}
                >
                  <Printer className="h-4 w-4" aria-hidden />
                  ປິ້ນ
                </Button>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      {selectedSale ? (
        <div
          className="fixed inset-0 z-50 flex items-end bg-zinc-950/45 p-0 sm:items-center sm:justify-center sm:p-4"
          role="dialog"
          aria-modal="true"
          aria-labelledby="pos-sale-detail-title"
        >
          <div className="max-h-[88vh] w-full overflow-hidden rounded-t-lg bg-white shadow-xl sm:max-w-2xl sm:rounded-lg">
            <div className="flex items-start justify-between gap-3 border-b border-zinc-200 p-4">
              <div>
                <p
                  id="pos-sale-detail-title"
                  className="text-lg font-bold text-zinc-950"
                >
                  {selectedSale.saleNo ??
                    `Bill #${selectedSale.id.slice(-8).toUpperCase()}`}
                </p>
                <p className="text-sm text-zinc-500">
                  {formatDate(new Date(selectedSale.createdAt))}
                </p>
              </div>
              <Button
                type="button"
                variant="ghost"
                className="min-h-9 px-2"
                onClick={() => setSelectedSaleId(null)}
                aria-label="ປິດລາຍລະອຽດ"
              >
                <X className="h-5 w-5" aria-hidden />
              </Button>
            </div>
            <div className="max-h-[calc(88vh-76px)] overflow-y-auto p-4">
              <SaleDetail sale={selectedSale} storeSettings={storeSettings} />
            </div>
          </div>
        </div>
      ) : null}
    </>
  );
}

function SaleDetail({
  sale,
  storeSettings
}: {
  sale: Sale;
  storeSettings: StoreSettings;
}) {
  return (
    <div className="grid gap-3 text-sm">
      <div className="rounded-md border border-zinc-200 p-3">
        <p className="mb-2 flex items-center gap-2 text-sm font-bold text-zinc-950">
          <Banknote className="h-4 w-4" aria-hidden />
          ການຊໍາລະ
        </p>
        <div className="grid gap-1.5">
          <DetailLine label="ວິທີຊໍາລະ" value={paymentMethodLabel(sale.paymentMethod)} />
          {sale.cashierName ? (
            <DetailLine label="ຜູ້ຂາຍ" value={sale.cashierName} />
          ) : null}
          {sale.memberName ? (
            <>
              <DetailLine
                label="ສະມາຊິກ"
                value={`${sale.memberName} / ${sale.memberPhone ?? "-"}`}
              />
              <DetailLine label="ລະດັບ" value={sale.memberTierName ?? "-"} />
            </>
          ) : null}
          <DetailLine label="ສະຖານະ" value={saleStatusLabel(sale)} />
          {sale.voidReason ? (
            <DetailLine label="ເຫດຜົນ" value={sale.voidReason} />
          ) : null}
          {sale.voidNote ? <DetailLine label="ໝາຍເຫດ" value={sale.voidNote} /> : null}
          {sale.paymentMethod === "CASH" ? (
            <>
              <DetailLine
                label="ຮັບເງິນ"
                value={formatCurrency(sale.receivedAmount ?? 0)}
              />
              <DetailLine
                label="ເງິນທອນ"
                value={formatCurrency(sale.changeAmount ?? 0)}
              />
            </>
          ) : null}
        </div>
      </div>

      <div>
        <p className="mb-2 text-xs font-semibold uppercase text-zinc-500">
          ລາຍການສິນຄ້າ
        </p>
        <div className="grid gap-2">
          {sale.items.map((item) => (
            <div
              key={`${sale.id}-${item.productId}-${item.variantId ?? item.sku}`}
              className="rounded-md border border-zinc-200 p-3"
            >
              <div className="flex items-start justify-between gap-3">
                <div className="grid min-w-0 grid-cols-[3.5rem_1fr] gap-3">
                  <SaleItemThumbnail
                    imageUrl={item.imageUrl}
                    name={item.name}
                    size="md"
                  />
                  <div className="min-w-0">
                    <p className="font-semibold text-zinc-950">
                      {item.name}
                      {item.variantName ? ` - ${item.variantName}` : ""}
                    </p>
                    <p className="text-zinc-500">
                      {item.sku} · x{item.quantity}
                    </p>
                  </div>
                </div>
                <p className="font-semibold text-zinc-950">
                  {formatCurrency(item.price * item.quantity)}
                </p>
              </div>
            </div>
          ))}
        </div>
      </div>

      <div className="grid grid-cols-2 gap-2 rounded-md bg-zinc-50 p-3 sm:grid-cols-4">
        <Summary label="ຍອດລວມ" value={formatCurrency(sale.totalAmount)} />
        <Summary label="ສ່ວນຫຼຸດ" value={formatCurrency(sale.discount)} />
        <Summary label="ຍອດສຸດທິ" value={formatCurrency(sale.netAmount)} />
        <Summary label="ກໍາໄລ" value={formatCurrency(sale.profit)} success />
      </div>

      {isActiveSale(sale) ? (
        <div className="grid gap-3 rounded-md border border-rose-200 bg-rose-50 p-3">
          <p className="text-sm font-bold text-rose-900">
            ຍົກເລີກ / ຄືນບິນໜ້າຮ້ານ
          </p>
          <form action={voidPosSale} className="grid gap-2">
            <input type="hidden" name="saleId" value={sale.id} />
            <label className="space-y-1.5">
              <span className="text-xs font-semibold text-rose-700">ປະເພດ</span>
              <Select name="status" defaultValue="RETURNED">
                <option value="RETURNED">ຄືນສິນຄ້າ</option>
                <option value="CANCELLED">ຍົກເລີກບິນ</option>
              </Select>
            </label>
            <label className="space-y-1.5">
              <span className="text-xs font-semibold text-rose-700">
                ເຫດຜົນ
              </span>
              <Select name="reason" defaultValue="ລູກຄ້າຄືນສິນຄ້າ">
                <option value="ລູກຄ້າຄືນສິນຄ້າ">ລູກຄ້າຄືນສິນຄ້າ</option>
                <option value="ກົດບິນຜິດ">ກົດບິນຜິດ</option>
                <option value="ລາຄາຜິດ">ລາຄາຜິດ</option>
                <option value="ລູກຄ້າປ່ຽນໃຈ">ລູກຄ້າປ່ຽນໃຈ</option>
                <option value="ອື່ນໆ">ອື່ນໆ</option>
              </Select>
            </label>
            <Textarea
              name="note"
              placeholder="ໝາຍເຫດເພີ່ມເຕີມ"
              className="min-h-20"
            />
            <Button
              type="submit"
              variant="secondary"
              className="w-full border-rose-200 bg-rose-600 text-white hover:bg-rose-700"
            >
              ບັນທຶກ ແລະຄືນສະຕ໋ອກ
            </Button>
          </form>
        </div>
      ) : null}

      <Button
        type="button"
        className="w-full"
        onClick={() => printPosReceiptCopy(sale, storeSettings)}
        disabled={!isActiveSale(sale)}
      >
        <Printer className="h-4 w-4" aria-hidden />
        ປິ້ນບິນຊໍ້າ
      </Button>
    </div>
  );
}

function SaleItemThumbnail({
  imageUrl,
  name,
  size
}: {
  imageUrl?: string | null;
  name: string;
  size: "sm" | "md";
}) {
  return (
    <div
      className={cn(
        "relative shrink-0 overflow-hidden rounded-md border border-zinc-200 bg-zinc-100",
        size === "sm" ? "h-12 w-12" : "h-14 w-14"
      )}
    >
      {imageUrl ? (
        <Image
          src={imageUrl}
          alt={name}
          fill
          sizes={size === "sm" ? "48px" : "56px"}
          className="object-cover"
        />
      ) : (
        <div className="flex h-full w-full items-center justify-center">
          <Package className="h-5 w-5 text-zinc-400" aria-hidden />
        </div>
      )}
    </div>
  );
}

function DetailLine({ label, value }: { label: string; value: string }) {
  return (
    <div className="grid grid-cols-[6rem_1fr] gap-2">
      <span className="text-zinc-500">{label} :</span>
      <strong className="text-zinc-950">{value}</strong>
    </div>
  );
}

function Summary({
  label,
  value,
  success = false
}: {
  label: string;
  value: string;
  success?: boolean;
}) {
  return (
    <div>
      <p className="text-xs text-zinc-500">{label}</p>
      <p className={success ? "font-bold text-emerald-700" : "font-bold text-zinc-950"}>
        {value}
      </p>
    </div>
  );
}

function paymentMethodLabel(value: Sale["paymentMethod"]) {
  if (value === "TRANSFER") {
    return "ເງິນໂອນ";
  }

  if (value === "OTHER") {
    return "ອື່ນໆ";
  }

  return "ເງິນສົດ";
}

function isActiveSale(sale: Sale) {
  return !sale.status || sale.status === "ACTIVE";
}

function saleStatusLabel(sale: Sale) {
  if (sale.status === "CANCELLED") {
    return "ຍົກເລີກ";
  }

  if (sale.status === "RETURNED") {
    return "ຄືນສິນຄ້າ";
  }

  return paymentMethodLabel(sale.paymentMethod);
}

function saleStatusClassName(sale: Sale) {
  if (sale.status === "CANCELLED") {
    return "border-zinc-200 bg-zinc-100 text-zinc-700";
  }

  if (sale.status === "RETURNED") {
    return "border-rose-200 bg-rose-100 text-rose-800";
  }

  return "border-emerald-200 bg-emerald-100 text-emerald-800";
}
