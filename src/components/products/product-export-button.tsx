"use client";

import { useState } from "react";
import { Download, LoaderCircle } from "lucide-react";
import { Button } from "@/components/ui/button";

export function ProductExportButton() {
  const [pending, setPending] = useState(false);
  const [error, setError] = useState("");

  async function downloadProducts() {
    if (pending) return;
    setPending(true);
    setError("");
    try {
      const response = await fetch("/api/exports/product-prices", { cache: "no-store" });
      if (response.redirected || response.status === 401 || response.status === 403) {
        setError("ກະລຸນາເຂົ້າລະບົບດ້ວຍບັນຊີເຈົ້າຂອງຮ້ານໃໝ່ ແລ້ວລອງອີກຄັ້ງ");
        return;
      }
      if (!response.ok || !response.headers.get("content-type")?.startsWith("text/csv")) {
        throw new Error("ສົ່ງອອກຂໍ້ມູນບໍ່ສຳເລັດ ກະລຸນາລອງອີກຄັ້ງ");
      }

      const url = URL.createObjectURL(await response.blob());
      const link = document.createElement("a");
      link.href = url;
      link.download = response.headers.get("content-disposition")?.match(/filename="([^"]+)"/)?.[1] ?? "product-prices.csv";
      document.body.appendChild(link);
      link.click();
      link.remove();
      window.setTimeout(() => URL.revokeObjectURL(url), 1000);
    } catch {
      setError("ສົ່ງອອກຂໍ້ມູນບໍ່ສຳເລັດ ກະລຸນາລອງອີກຄັ້ງ");
    } finally {
      setPending(false);
    }
  }

  return (
    <div className="w-full sm:w-auto">
      <Button
        variant="secondary"
        onClick={downloadProducts}
        disabled={pending}
        aria-busy={pending}
        className="w-full"
        title="ສົ່ງອອກສິນຄ້າທັງໝົດ: ຊື່, ລະຫັດ, ຕົ້ນທຶນ, ລາຄາຂາຍ ແລະ ກຳໄລຕໍ່ໜ່ວຍ — CSV ເປີດໃນ Excel ໄດ້"
      >
        {pending ? <LoaderCircle className="h-4 w-4 animate-spin" aria-hidden /> : <Download className="h-4 w-4" aria-hidden />}
        {pending ? "ກຳລັງສົ່ງອອກ..." : "Export ສິນຄ້າ (CSV)"}
      </Button>
      {error ? <p role="alert" className="mt-2 max-w-xs text-xs text-rose-600">{error}</p> : null}
    </div>
  );
}
