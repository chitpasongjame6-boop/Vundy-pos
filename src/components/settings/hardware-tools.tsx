"use client";

import { useState } from "react";
import { Printer, WalletCards } from "lucide-react";
import { Button } from "@/components/ui/button";

type SerialPortLike = {
  open(options: { baudRate: number }): Promise<void>;
  close(): Promise<void>;
  writable?: { getWriter(): { write(data: Uint8Array): Promise<void>; releaseLock(): void } };
};

export function HardwareTools() {
  const [message, setMessage] = useState("");

  async function pulseDrawer() {
    const serial = (navigator as Navigator & {
      serial?: { requestPort(): Promise<SerialPortLike> };
    }).serial;
    if (!serial) {
      setMessage("Browser ນີ້ບໍ່ຮອງຮັບ Web Serial; ໃຊ້ Chrome/Edge ຜ່ານ HTTPS ຫຼື localhost");
      return;
    }
    let port: SerialPortLike | null = null;
    try {
      port = await serial.requestPort();
      await port.open({ baudRate: 9600 });
      const writer = port.writable?.getWriter();
      if (!writer) throw new Error("Printer port is not writable");
      await writer.write(new Uint8Array([27, 112, 0, 25, 250]));
      writer.releaseLock();
      setMessage("ສົ່ງຄໍາສັ່ງເປີດລິ້ນຊັກແລ້ວ");
    } catch {
      setMessage("ບໍ່ສາມາດເປີດລິ້ນຊັກໄດ້ — ກວດສາຍ, baud rate ແລະ ESC/POS");
    } finally {
      await port?.close().catch(() => undefined);
    }
  }

  return (
    <div className="grid gap-2 rounded-xl border border-slate-200 p-3">
      <p className="font-bold text-slate-900">ທົດສອບອຸປະກອນ POS</p>
      <Button type="button" variant="secondary" onClick={() => window.print()}>
        <Printer className="h-4 w-4" /> ທົດສອບ Print dialog
      </Button>
      <Button type="button" variant="secondary" onClick={pulseDrawer}>
        <WalletCards className="h-4 w-4" /> ເຊື່ອມຕໍ່ / ເປີດລິ້ນຊັກ ESC/POS
      </Button>
      {message ? <p className="text-xs leading-5 text-slate-600">{message}</p> : null}
    </div>
  );
}
