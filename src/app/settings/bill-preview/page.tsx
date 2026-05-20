import Image from "next/image";
import Link from "next/link";
import { ArrowLeft } from "lucide-react";
import { getStoreSettings } from "@/actions/settings.action";
import { PageHeader } from "@/components/layout/page-header";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";

const sample = {
  customerName: "nga",
  phone: "2057511888",
  shippingCompany: "ຮຸ່ງອາລຸນ",
  pickupBranch: "thahin",
  city: "dakjueng",
  province: "sekong",
  paymentStatus: "COD",
  totalAmount: 195000,
  createdAt: new Date()
};

export default async function BillPreviewPage() {
  const storeSettings = await getStoreSettings();
  const billWidth = storeSettings.orderBillSize === "A4" ? "100mm" : "100mm";

  return (
    <section>
      <PageHeader
        title="ຕົວຢ່າງບິນ"
        description="ແບບໃບປິ້ນສໍາລັບຕິດກ່ອງຂົນສົ່ງ"
      />
      <div className="mb-4">
        <Link href="/settings">
          <Button variant="secondary">
            <ArrowLeft className="h-4 w-4" aria-hidden />
            ກັບໄປຕັ້ງຄ່າ
          </Button>
        </Link>
      </div>

      <Card className="mx-auto max-w-[calc(100mm+2rem)]">
        <CardContent className="p-4">
          <div
            className="mx-auto max-w-full overflow-hidden rounded-md border border-zinc-950 bg-white font-sans text-zinc-950"
            style={{ width: billWidth }}
          >
            <div className="px-2 pt-1 text-left text-[10px] leading-tight text-zinc-600">
              {formatBillDate(sample.createdAt)}
            </div>
            <div className="px-4 pb-5 pt-1 text-center">
              {storeSettings.logoUrl ? (
                <div className="relative mx-auto mb-2 h-[82px] w-32">
                  <Image
                    src={storeSettings.logoUrl}
                    alt={storeSettings.storeName}
                    fill
                    sizes="8rem"
                    className="object-contain"
                  />
                </div>
              ) : null}
              <h3 className="text-lg font-bold leading-snug">
                {storeSettings.storeName}
              </h3>
              {storeSettings.storeSubtitle ? (
                <p className="mt-1 text-sm font-bold text-zinc-800">
                  {storeSettings.storeSubtitle}
                </p>
              ) : null}
              {storeSettings.storeNote ? (
                <p className="mt-1 text-sm font-bold text-zinc-800">
                  {storeSettings.storeNote}
                </p>
              ) : null}
            </div>

            <div className="border-t border-zinc-950 px-4 py-3">
              <p className="mb-2 font-bold">ຜູ້ຮັບ</p>
              <PreviewRow label="ຊື່" value={sample.customerName} strong />
              <PreviewRow label="ເບີຜູ້ຮັບ" value={sample.phone} />
            </div>

            <div className="border-t border-zinc-950 px-4 py-3">
              <p className="mb-2 font-bold">ຂົນສົ່ງ</p>
              <PreviewRow label="ຂົນສົ່ງ" value={sample.shippingCompany} strong />
              <PreviewRow label="ສາຂາ" value={sample.pickupBranch} />
              <PreviewRow label="ເມືອງ" value={sample.city} />
              <PreviewRow label="ແຂວງ" value={sample.province} />
            </div>

            {sample.paymentStatus === "COD" ? (
              <div className="border-t border-zinc-950 px-4 py-3 text-xl font-bold">
                COD : ₭195,000
              </div>
            ) : null}

          </div>
        </CardContent>
      </Card>
    </section>
  );
}

function PreviewRow({
  label,
  value,
  strong = false
}: {
  label: string;
  value: string;
  strong?: boolean;
}) {
  return (
    <div className="grid grid-cols-[32mm_1fr] gap-2 py-1 text-base leading-snug">
      <span className="text-zinc-500">{label} :</span>
      <span className={strong ? "font-bold" : undefined}>{value}</span>
    </div>
  );
}

function formatBillDate(value: Date) {
  const date = new Date(value);
  const day = date.getDate();
  const month = date.getMonth() + 1;
  const year = date.getFullYear();
  const hours = String(date.getHours()).padStart(2, "0");
  const minutes = String(date.getMinutes()).padStart(2, "0");

  return `${day}/${month}/${year} ${hours}:${minutes}`;
}
