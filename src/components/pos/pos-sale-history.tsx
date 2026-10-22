"use client";
import { formatRate, formatThb } from "@/lib/currency";

import Image from "next/image";
import { useActionState, useState } from "react";
import { Banknote, Eye, Package, Printer, X } from "lucide-react";
import { submitReturnPosSaleItems, submitVoidPosSale } from "@/actions/pos.action";
import type { Sale, StoreSettings } from "@/types";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Input, Select, Textarea } from "@/components/ui/input";
import { EmptyState } from "@/components/ui/patterns";
import { printPosReceiptCopy } from "@/components/pos/pos-receipt-printer";
import {
  cn,
  formatCurrency,
  formatDate,
  formatProductVariantName
} from "@/lib/utils";

export function PosSaleHistory({
  sales,
  storeSettings,
  canViewProfit = true
}: {
  sales: Sale[];
  storeSettings: StoreSettings;
  canViewProfit?: boolean;
}) {
  const [selectedSaleId, setSelectedSaleId] = useState<string | null>(null);
  const selectedSale = sales.find((sale) => sale.id === selectedSaleId);

  if (!sales.length) {
    return <EmptyState title="ບໍ່ພົບບິນ" description="ລອງປ່ຽນຄໍາຄົ້ນ ວິທີຊໍາລະ ຫຼື ວັນທີ" />;
  }

  return (
    <>
      <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-3">
        {sales.map((sale) => (
          <Card key={sale.id}>
            <CardContent className="space-y-3">
              <div className="flex items-start justify-between gap-3">
                <div className="min-w-0">
                  <p className="font-bold text-slate-950">
                    {sale.saleNo ?? `Bill #${sale.id.slice(-8).toUpperCase()}`}
                  </p>
                  <p className="text-sm text-slate-500">
                    {formatDate(new Date(sale.createdAt))}
                  </p>
                  {sale.cashierName ? (
                    <p className="text-xs font-semibold text-slate-500">
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

              <div className="rounded-xl border border-slate-200 p-3">
                {sale.items[0] ? (
                  <div className="grid grid-cols-[3rem_1fr] items-center gap-3">
                    <SaleItemThumbnail
                      imageUrl={sale.items[0].imageUrl}
                      name={sale.items[0].name}
                      size="sm"
                    />
                    <div className="min-w-0">
                      <p className="truncate text-sm font-semibold text-slate-950">
                        {formatProductVariantName(
                          sale.items[0].name,
                          sale.items[0].variantName
                        )}
                      </p>
                      <p className="mt-1 truncate text-sm text-slate-500">
                        {sale.items.reduce((sum, item) => sum + item.quantity, 0)} ຊິ້ນ
                        {sale.items.length > 1
                          ? ` · +${sale.items.length - 1} ລາຍການ`
                          : ""}
                      </p>
                    </div>
                  </div>
                ) : (
                  <p className="flex items-center gap-2 text-sm font-semibold text-slate-950">
                    <Package className="h-4 w-4 text-slate-500" aria-hidden />
                    ບໍ່ມີລາຍການ
                  </p>
                )}
              </div>

              <div
                className={cn(
                  "grid gap-2 text-sm",
                  canViewProfit ? "grid-cols-2" : "grid-cols-1"
                )}
              >
                <div className="rounded-xl bg-slate-50 p-2">
                  <p className="text-xs text-slate-500">ຍອດສຸດທິ</p>
                  <p className="font-bold text-slate-950">
                    {formatCurrency(sale.netAmount)}
                  </p>
                </div>
                {canViewProfit ? (
                  <div className="rounded-xl bg-slate-50 p-2">
                    <p className="text-xs text-slate-500">ກໍາໄລ</p>
                    <p className="font-bold text-emerald-700">
                      {formatCurrency(sale.profit)}
                    </p>
                  </div>
                ) : null}
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
          className="fixed inset-0 z-50 flex items-end bg-slate-950/45 p-0 sm:items-center sm:justify-center sm:p-4"
          role="dialog"
          aria-modal="true"
          aria-labelledby="pos-sale-detail-title"
        >
          <div className="max-h-[88vh] w-full overflow-hidden rounded-t-2xl bg-white shadow-xl sm:max-w-2xl sm:rounded-2xl">
            <div className="flex items-start justify-between gap-3 border-b border-slate-200 p-4">
              <div>
                <p
                  id="pos-sale-detail-title"
                  className="text-lg font-bold text-slate-950"
                >
                  {selectedSale.saleNo ??
                    `Bill #${selectedSale.id.slice(-8).toUpperCase()}`}
                </p>
                <p className="text-sm text-slate-500">
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
              <SaleDetail
                sale={selectedSale}
                storeSettings={storeSettings}
                canViewProfit={canViewProfit}
              />
            </div>
          </div>
        </div>
      ) : null}
    </>
  );
}

function SaleDetail({
  sale,
  storeSettings,
  canViewProfit
}: {
  sale: Sale;
  storeSettings: StoreSettings;
  canViewProfit: boolean;
}) {
  const [returnState, returnAction, returning] = useActionState(submitReturnPosSaleItems, { message: "" });
  const [voidState, voidAction, voiding] = useActionState(submitVoidPosSale, { message: "" });
  return (
    <div className="grid gap-3 text-sm">
      <div className="rounded-xl border border-slate-200 p-3">
        <p className="mb-2 flex items-center gap-2 text-sm font-bold text-slate-950">
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
                label={sale.tenderCurrency === "THB" ? "ຮັບຊໍາລະທຽບກີບ" : "ຮັບເງິນ"}
                value={formatCurrency(sale.receivedAmount ?? 0)}
              />
              {sale.tenderCurrency === "THB" ? <>
                <DetailLine label="ຮັບບາດຈິງ (ຂໍ້ມູນພາຍໃນ)" value={formatThb(sale.tenderAmountMinor ?? 0)} />
                <DetailLine label="ເຣດໃນບິນ · 1 ບາດ" value={`${formatRate(sale.exchangeRate ?? 0)} ກີບ`} />
              </> : null}
              <DetailLine
                label="ເງິນທອນ"
                value={formatCurrency(sale.changeAmount ?? 0)}
              />
            </>
          ) : null}
        </div>
      </div>

      <div>
        <p className="mb-2 text-xs font-semibold uppercase text-slate-500">
          ລາຍການສິນຄ້າ
        </p>
        <div className="grid gap-2">
          {sale.items.map((item) => (
            <div
              key={`${sale.id}-${item.productId}-${item.variantId ?? item.sku}`}
              className="rounded-xl border border-slate-200 p-3"
            >
              <div className="flex items-start justify-between gap-3">
                <div className="grid min-w-0 grid-cols-[3.5rem_1fr] gap-3">
                  <SaleItemThumbnail
                    imageUrl={item.imageUrl}
                    name={item.name}
                    size="md"
                  />
                  <div className="min-w-0">
                    <p className="font-semibold text-slate-950">
                      {formatProductVariantName(item.name, item.variantName)}
                    </p>
                    <p className="text-slate-500">
                      {item.sku} · x{item.quantity}
                    </p>
                    {item.promotionName && <p className="text-xs text-emerald-700">ໂປຣ: {item.promotionName} · <span className="line-through">{formatCurrency(item.originalPrice ?? item.price)}</span> → {formatCurrency(item.price)}</p>}
                  </div>
                </div>
                <p className="font-semibold text-slate-950">
                  {formatCurrency(item.price * item.quantity)}
                </p>
              </div>
            </div>
          ))}
        </div>
      </div>

      <div
        className={cn(
          "grid grid-cols-2 gap-2 rounded-xl bg-slate-50 p-3",
          canViewProfit ? "sm:grid-cols-4" : "sm:grid-cols-3"
        )}
      >
        <Summary label="ຍອດລວມ" value={formatCurrency(sale.totalAmount)} />
        <Summary label="ສ່ວນຫຼຸດ" value={formatCurrency(sale.discount)} />
        <Summary label="ຍອດສຸດທິ" value={formatCurrency(sale.netAmount)} />
        {canViewProfit ? (
          <Summary label="ກໍາໄລ" value={formatCurrency(sale.profit)} success />
        ) : null}
      </div>

      {isActiveSale(sale) ? (
        <div className="grid gap-3 rounded-xl border border-amber-200 bg-amber-50 p-3">
          <p className="text-sm font-bold text-amber-950">ຄືນສິນຄ້າບາງລາຍການ</p>
          {sale.tenderCurrency === "THB" ? <p className="text-xs leading-5 text-amber-900">ບິນຮັບບາດ: ຄືນ/ຍົກເລີກແລ້ວຈ່າຍຄືນເປັນເງິນສົດກີບ ຕາມຍອດບິນເດີມ (ບໍ່ໃຊ້ເຣດມື້ນີ້). ກະລຸນາເປີດກະກ່ອນ.</p> : null}
          <form action={returnAction} className="grid gap-2">
            <input type="hidden" name="saleId" value={sale.id} />
            {sale.items.map((item, index) => (
              <label key={`${item.productId}-${item.variantId}-${index}`} className="grid grid-cols-[1fr_5rem] items-center gap-2 text-xs">
                <span className="font-semibold text-slate-700">
                  {formatProductVariantName(item.name, item.variantName)} (ຂາຍ {item.quantity})
                </span>
                <Input name={`returnQty-${index}`} type="number" min={0} max={item.quantity} defaultValue={0} />
              </label>
            ))}
            <Select name="refundMethod" defaultValue={sale.paymentMethod === "SPLIT" ? "CASH" : sale.paymentMethod}>
              <option value="CASH">ຄືນເປັນເງິນສົດ</option>
              {sale.tenderCurrency !== "THB" ? <><option value="TRANSFER">ຄືນເປັນເງິນໂອນ</option>
              <option value="OTHER">ອື່ນໆ</option></> : null}
            </Select>
            <label className="space-y-1.5">
              <span className="text-xs font-semibold text-amber-800">ເຫດຜົນ</span>
              <Select name="reason" defaultValue="ລູກຄ້າຄືນສິນຄ້າ">
                <option value="ລູກຄ້າຄືນສິນຄ້າ">ລູກຄ້າຄືນສິນຄ້າ</option>
                <option value="ກົດບິນຜິດ">ກົດບິນຜິດ</option>
                <option value="ລາຄາຜິດ">ລາຄາຜິດ</option>
                <option value="ລູກຄ້າປ່ຽນໃຈ">ລູກຄ້າປ່ຽນໃຈ</option>
                <option value="ປ່ຽນສິນຄ້າ">ປ່ຽນສິນຄ້າ (ຄືນແລ້ວເປີດບິນໃໝ່)</option>
                <option value="ອື່ນໆ">ອື່ນໆ</option>
              </Select>
            </label>
            <Textarea name="note" placeholder="ໝາຍເຫດເພີ່ມເຕີມ" className="min-h-16" />
            {!canViewProfit ? <Input name="approvalPin" type="password" placeholder="PIN ເຈົ້າຂອງຮ້ານ" required autoComplete="off" /> : null}
            <p role="alert" className="text-sm text-rose-700">{returnState.message}</p>
            <Button type="submit" variant="secondary" className="w-full" disabled={returning || voiding}>{returning ? "ກຳລັງບັນທຶກ..." : "ຄືນລາຍການທີ່ເລືອກ"}</Button>
          </form>

          {sale.status !== "PARTIALLY_RETURNED" ? (
            <form action={voidAction} className="grid gap-2 border-t border-amber-200 pt-3">
              <input type="hidden" name="saleId" value={sale.id} />
              <p className="text-xs font-bold text-rose-800">ຍົກເລີກ / ຄືນທັງບິນ</p>
              <Select name="status" defaultValue="RETURNED">
                <option value="RETURNED">ຄືນສິນຄ້າທັງບິນ</option>
                <option value="CANCELLED">ຍົກເລີກບິນ</option>
              </Select>
              <Select name="reason" defaultValue="ລູກຄ້າຄືນສິນຄ້າ">
                <option value="ລູກຄ້າຄືນສິນຄ້າ">ລູກຄ້າຄືນສິນຄ້າ</option>
                <option value="ກົດບິນຜິດ">ກົດບິນຜິດ</option>
                <option value="ລາຄາຜິດ">ລາຄາຜິດ</option>
                <option value="ອື່ນໆ">ອື່ນໆ</option>
              </Select>
              <Textarea name="note" placeholder="ໝາຍເຫດ" className="min-h-16" />
              {!canViewProfit ? <Input name="approvalPin" type="password" placeholder="PIN ເຈົ້າຂອງຮ້ານ" required autoComplete="off" /> : null}
              <p role="alert" className="text-sm text-rose-700">{voidState.message}</p>
              <Button type="submit" className="w-full bg-rose-600 hover:bg-rose-700" disabled={returning || voiding}>{voiding ? "ກຳລັງບັນທຶກ..." : "ຍົກເລີກ / ຄືນທັງບິນ"}</Button>
            </form>
          ) : null}
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
        "relative shrink-0 overflow-hidden rounded-xl border border-slate-200 bg-slate-100",
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
          <Package className="h-5 w-5 text-slate-400" aria-hidden />
        </div>
      )}
    </div>
  );
}

function DetailLine({ label, value }: { label: string; value: string }) {
  return (
    <div className="grid grid-cols-[6rem_1fr] gap-2">
      <span className="text-slate-500">{label} :</span>
      <strong className="text-slate-950">{value}</strong>
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
      <p className="text-xs text-slate-500">{label}</p>
      <p className={success ? "font-bold text-emerald-700" : "font-bold text-slate-950"}>
        {value}
      </p>
    </div>
  );
}

function paymentMethodLabel(value: Sale["paymentMethod"]) {
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

function isActiveSale(sale: Sale) {
  return !sale.status || sale.status === "ACTIVE" || sale.status === "PARTIALLY_RETURNED";
}

function saleStatusLabel(sale: Sale) {
  if (sale.status === "CANCELLED") {
    return "ຍົກເລີກ";
  }

  if (sale.status === "RETURNED") {
    return "ຄືນສິນຄ້າ";
  }

  if (sale.status === "PARTIALLY_RETURNED") {
    return "ຄືນບາງສ່ວນ";
  }

  return paymentMethodLabel(sale.paymentMethod);
}

function saleStatusClassName(sale: Sale) {
  if (sale.status === "CANCELLED") {
    return "border-slate-200 bg-slate-100 text-slate-700";
  }

  if (sale.status === "RETURNED") {
    return "border-rose-200 bg-rose-100 text-rose-800";
  }

  if (sale.status === "PARTIALLY_RETURNED") {
    return "border-amber-200 bg-amber-100 text-amber-800";
  }

  return "border-emerald-200 bg-emerald-100 text-emerald-800";
}
