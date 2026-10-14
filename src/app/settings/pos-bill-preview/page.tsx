import Link from "next/link";
import { ArrowLeft } from "lucide-react";
import { getStoreSettings } from "@/actions/settings.action";
import { PageHeader } from "@/components/layout/page-header";
import { PosReceiptPreview } from "@/components/pos/pos-receipt-preview";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import type { Sale } from "@/types";

export default async function PosBillPreviewPage() {
  const storeSettings = await getStoreSettings();
  const sampleSale: Sale = {
    id: "sample-pos-receipt",
    saleNo: "POS-20260520-001",
    cashierName: "Staff",
    memberName: "Tay",
    memberPhone: "2058951122",
    items: [
      { productId: "sample-coffee", sku: "COFFEE-10", name: "VL Coffee Premium", variantName: "10ml", quantity: 2, price: 55000, cost: 30000 },
      { productId: "sample-snack", sku: "SNACK-S", name: "VL Snack Box", variantName: "ກ່ອງນ້ອຍ", quantity: 1, price: 85000, cost: 45000 }
    ],
    totalAmount: 195000,
    totalCost: 105000,
    profit: 80000,
    discount: 10000,
    netAmount: 185000,
    paymentMethod: "CASH",
    receivedAmount: 200000,
    changeAmount: 15000,
    createdAt: new Date(),
    updatedAt: new Date()
  };

  return (
    <section>
      <PageHeader
        title="ຕົວຢ່າງບິນ POS"
        description="ຕົວຢ່າງນີ້ໃຊ້ຮູບແບບດຽວກັບບິນທີ່ປິ້ນຈາກໜ້າຂາຍ ແລະ ປະຫວັດບິນ"
      />
      <div className="mb-4">
        <Link href="/settings">
          <Button variant="secondary">
            <ArrowLeft className="h-4 w-4" aria-hidden /> ກັບໄປຕັ້ງຄ່າ
          </Button>
        </Link>
      </div>
      <Card className="mx-auto max-w-[calc(80mm+2rem)]">
        <CardContent className="p-4">
          <PosReceiptPreview sale={sampleSale} storeSettings={storeSettings} />
        </CardContent>
      </Card>
    </section>
  );
}
