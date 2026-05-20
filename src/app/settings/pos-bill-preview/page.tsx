import Image from "next/image";
import Link from "next/link";
import { ArrowLeft } from "lucide-react";
import { getStoreSettings } from "@/actions/settings.action";
import { PageHeader } from "@/components/layout/page-header";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { formatCurrency } from "@/lib/utils";

const sampleSale = {
  saleNo: "POS-20260520-001",
  cashierName: "Staff",
  memberName: "Tay",
  memberPhone: "2058951122",
  items: [
    {
      name: "VL Coffee Premium",
      variantName: "10ml",
      quantity: 2,
      price: 55000
    },
    {
      name: "VL Snack Box",
      variantName: "ກ່ອງນ້ອຍ",
      quantity: 1,
      price: 85000
    }
  ],
  totalAmount: 195000,
  discount: 10000,
  netAmount: 185000,
  paymentMethod: "CASH",
  receivedAmount: 200000,
  changeAmount: 15000,
  createdAt: new Date()
};

export default async function PosBillPreviewPage() {
  const storeSettings = await getStoreSettings();
  const receiptWidth = storeSettings.posReceiptSize === "POS_58MM" ? "58mm" : "80mm";

  return (
    <section>
      <PageHeader
        title="ຕົວຢ່າງບິນ POS"
        description="ຮູບແບບບິນສໍາລັບຂາຍໜ້າຮ້ານ ໂດຍໃຊ້ຂໍ້ມູນ POS ທີ່ຕັ້ງໄວ້"
      />

      <div className="mb-4">
        <Link href="/settings">
          <Button variant="secondary">
            <ArrowLeft className="h-4 w-4" aria-hidden />
            ກັບໄປຕັ້ງຄ່າ
          </Button>
        </Link>
      </div>

      <Card className="mx-auto max-w-[calc(80mm+2rem)]">
        <CardContent className="p-4">
          <div
            className="mx-auto max-w-full border border-zinc-950 bg-white p-2 text-zinc-950"
            style={{ width: receiptWidth }}
          >
            <div className="border-b border-dashed border-zinc-900 pb-2 text-center">
              {storeSettings.posReceiptLogoUrl ? (
                <div className="relative mx-auto mb-1 h-16 w-24">
                  <Image
                    src={storeSettings.posReceiptLogoUrl}
                    alt={storeSettings.posReceiptName}
                    fill
                    sizes="6rem"
                    className="object-contain"
                  />
                </div>
              ) : null}
              <h3 className="text-lg font-bold leading-snug">
                {storeSettings.posReceiptName}
              </h3>
              {storeSettings.posReceiptSubtitle ? (
                <p className="mt-1 text-xs font-bold text-zinc-800">
                  {storeSettings.posReceiptSubtitle}
                </p>
              ) : null}
              {storeSettings.posReceiptNote ? (
                <p className="mt-1 text-xs font-bold text-zinc-800">
                  {storeSettings.posReceiptNote}
                </p>
              ) : null}
              <p className="mt-1 text-[10px] text-zinc-600">
                {formatReceiptDate(sampleSale.createdAt)}
              </p>
              <p className="text-[10px] text-zinc-600">
                Bill: {sampleSale.saleNo}
              </p>
              <p className="text-[10px] text-zinc-600">
                Cashier: {sampleSale.cashierName}
              </p>
              <p className="text-[10px] text-zinc-600">
                Member: {sampleSale.memberName} / {sampleSale.memberPhone}
              </p>
            </div>

            <div className="border-b border-dashed border-zinc-900 py-2">
              {sampleSale.items.map((item) => (
                <div key={`${item.name}-${item.variantName}`} className="mb-2 last:mb-0">
                  <p className="text-xs font-bold leading-snug">
                    {item.name} - {item.variantName}
                  </p>
                  <div className="flex justify-between gap-2 text-[11px]">
                    <span>
                      {item.quantity} x {formatCurrency(item.price)}
                    </span>
                    <span>{formatCurrency(item.quantity * item.price)}</span>
                  </div>
                </div>
              ))}
            </div>

            <div className="space-y-1 pt-2 text-[11px]">
              <ReceiptLine label="ຍອດລວມ" value={formatCurrency(sampleSale.totalAmount)} />
              <ReceiptLine label="ສ່ວນຫຼຸດ" value={formatCurrency(sampleSale.discount)} />
              <ReceiptLine
                label="ຍອດສຸດທິ"
                value={formatCurrency(sampleSale.netAmount)}
                strong
              />
              <ReceiptLine label="ຊໍາລະ" value="ເງິນສົດ" />
              <ReceiptLine label="ຮັບເງິນ" value={formatCurrency(sampleSale.receivedAmount)} />
              <ReceiptLine label="ເງິນທອນ" value={formatCurrency(sampleSale.changeAmount)} />
            </div>

            <p className="mt-3 text-center text-xs font-bold">
              ຂອບໃຈທີ່ອຸດໜູນ
            </p>
          </div>
        </CardContent>
      </Card>
    </section>
  );
}

function ReceiptLine({
  label,
  value,
  strong = false
}: {
  label: string;
  value: string;
  strong?: boolean;
}) {
  return (
    <div className={strong ? "flex justify-between gap-2 text-base font-bold" : "flex justify-between gap-2"}>
      <span>{label}</span>
      <span className="font-bold">{value}</span>
    </div>
  );
}

function formatReceiptDate(value: Date) {
  const date = new Date(value);
  const day = date.getDate();
  const month = date.getMonth() + 1;
  const year = date.getFullYear();
  const hours = String(date.getHours()).padStart(2, "0");
  const minutes = String(date.getMinutes()).padStart(2, "0");

  return `${day}/${month}/${year} ${hours}:${minutes}`;
}
