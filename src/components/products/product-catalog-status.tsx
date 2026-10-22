"use client";

import Link from "next/link";
import { CatalogAttributionNote } from "./catalog-attribution";
import type { ProductLookupResponse } from "@/lib/product-catalog";

export function ProductCatalogStatus({ result, loading, useImage, onUseImage }: {
  result: ProductLookupResponse | null; loading: boolean; useImage: boolean; onUseImage: (value: boolean) => void;
}) {
  if (loading) return <p role="status" className="text-sm text-indigo-800">ກຳລັງຄົ້ນຫາຂໍ້ມູນສິນຄ້າ...</p>;
  if (!result) return null;
  if (result.status === "found") {
    const product = result.product;
    return <div className="space-y-2 rounded-xl border border-emerald-200 bg-white p-3 text-sm">
      <p role="status" className="font-bold text-emerald-800">ພົບຂໍ້ມູນ · ເຕີມສະເພາະຊ່ອງວ່າງແລ້ວ ກະລຸນາກວດກ່ອນບັນທຶກ</p>
      <p className="break-words text-slate-700">{[product.name, product.brand, product.quantity].filter(Boolean).join(" · ") || product.barcode}</p>
      {product.imageUrl ? <label className="flex items-center gap-2 text-slate-700">
        <input type="checkbox" checked={useImage} onChange={event => onUseImage(event.target.checked)} className="h-4 w-4 accent-indigo-600" />
        ໃຊ້ຮູບຈາກຖານຂໍ້ມູນ (ບີບອັດ WebP ເມື່ອບັນທຶກ)
      </label> : <p className="text-xs text-slate-500">ບໍ່ມີຮູບ · ສາມາດເລືອກຮູບເອງໄດ້</p>}
      <CatalogAttributionNote source={{ ...product, imageImported: useImage }} />
      <p className="text-xs text-slate-500">ຊື່ອາດບໍ່ແມ່ນພາສາລາວ · ຂະໜາດແມ່ນຂະໜາດຂວດຕົ້ນສະບັບ ບໍ່ແມ່ນຂະໜາດແບ່ງຂາຍ</p>
    </div>;
  }
  if (result.status === "existing") return <p role="status" className="text-sm text-amber-900">
    Barcode ນີ້ມີແລ້ວ: {result.name}{" · "}
    <Link className="font-bold underline" href={`/products?search=${encodeURIComponent(result.barcode)}`}>ເບິ່ງສິນຄ້າເກົ່າ</Link>
  </p>;
  const message = result.status === "not_found" ? "ບໍ່ພົບໃນຖານຂໍ້ມູນ · ປ້ອນຂໍ້ມູນເອງໄດ້ຕາມປົກກະຕິ"
    : result.status === "invalid" ? "ປ້ອນ Barcode ຕົວເລກ 8, 12, 13 ຫຼື 14 ຫຼັກໃນ SKU ທຳອິດ · SKU ຂອງຮ້ານໃຊ້ກອກເອງໄດ້"
    : result.status === "rate_limited" ? `ຄົ້ນຫາຖີ່ເກີນໄປ · ລໍຖ້າ ${result.retryAfter} ວິນາທີແລ້ວລອງໃໝ່ ຫຼື ກອກເອງ`
    : result.status === "unauthorized" || result.status === "forbidden" ? "ການຄົ້ນຫານີ້ໃຊ້ໄດ້ສະເພາະເຈົ້າຂອງຮ້ານ ກະລຸນາກວດການເຂົ້າລະບົບ"
    : "ເຊື່ອມຕໍ່ຖານຂໍ້ມູນບໍ່ໄດ້ · ລອງໃໝ່ ຫຼື ປ້ອນຂໍ້ມູນເອງ ຂໍ້ມູນໃນຟອມຍັງຢູ່";
  return <p role="status" className="text-sm text-amber-900">{message}</p>;
}
