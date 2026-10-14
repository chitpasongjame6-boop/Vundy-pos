"use client";

import { useEffect, useRef, useState } from "react";
import { Printer } from "lucide-react";
import type { Sale, StoreSettings } from "@/types";
import { Button } from "@/components/ui/button";
import { buildPosReceiptHtml } from "./pos-receipt-html";
import { printPosReceiptCopy } from "./pos-receipt-printer";

export function PosReceiptPreview({ sale, storeSettings }: { sale: Sale; storeSettings: StoreSettings }) {
  const frameRef = useRef<HTMLIFrameElement>(null);
  const observerRef = useRef<ResizeObserver | null>(null);
  const [height, setHeight] = useState(480);
  const paperWidth = storeSettings.posReceiptSize === "POS_58MM" ? "58mm" : "80mm";

  useEffect(() => () => observerRef.current?.disconnect(), []);

  function resizePreview() {
    observerRef.current?.disconnect();
    const receipt = frameRef.current?.contentDocument?.querySelector(".receipt");
    if (!receipt) return;
    const measure = () => setHeight(Math.ceil(receipt.getBoundingClientRect().height) + 20);
    measure();
    observerRef.current = new ResizeObserver(measure);
    observerRef.current.observe(receipt);
  }

  return (
    <div className="space-y-4">
      <div className="overflow-x-auto rounded-xl bg-white">
        <iframe
          ref={frameRef}
          title="ຕົວຢ່າງບິນ POS"
          sandbox="allow-same-origin"
          srcDoc={buildPosReceiptHtml(sale, storeSettings, storeSettings.posReceiptLogoUrl ?? "")}
          onLoad={resizePreview}
          className="mx-auto block border-0"
          style={{ width: paperWidth, height }}
        />
      </div>
      <Button className="w-full" onClick={() => printPosReceiptCopy(sale, storeSettings)}>
        <Printer className="h-4 w-4" aria-hidden /> ປິ້ນບິນຕົວຢ່າງ
      </Button>
      <p className="text-xs leading-5 text-slate-500">
        ບິນຕົວຢ່າງນີ້ບໍ່ບັນທຶກຍອດຂາຍ. ເວລາປິ້ນ ໃຫ້ເລືອກເຈ້ຍ {paperWidth}, ຂະໜາດ 100% ແລະ ປິດ Header/Footer ຂອງ Browser.
      </p>
    </div>
  );
}
