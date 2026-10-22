"use client";

import { useActionState } from "react";
import { updateCurrencySettings } from "@/actions/settings.action";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { RATE_SCALE } from "@/lib/currency";
import type { StoreSettings } from "@/types";

export function CurrencySettings({ settings }: { settings: StoreSettings }) {
  const [state, action, pending] = useActionState<{ ok: boolean | null; message: string }, FormData>(updateCurrencySettings, { ok: null, message: "" });
  return <section id="currency" className="mb-5 rounded-2xl border border-slate-200 bg-white p-5">
    <h2 className="text-lg font-bold">ເງິນບາດ / ອັດຕາແລກປ່ຽນ</h2>
    <p className="mt-1 text-sm text-slate-500">ລາຄາຂາຍ, ກໍາໄລ ແລະ ໃບເສັດຍັງເປັນກີບ. ເຈົ້າຂອງຮ້ານເປັນຜູ້ກໍານົດເຣດ.</p>
    <form action={action} className="mt-4 grid gap-4 sm:grid-cols-2">
      <label className="space-y-2 text-sm font-semibold">ເຣດຮັບເງິນລູກຄ້າ · 1 ບາດ = ກີບ
        <Input name="thbPaymentRate" type="number" min="0" step="0.0001" defaultValue={(settings.thbPaymentRate ?? 0) / RATE_SCALE || ""} placeholder="ປ້ອນເຣດຂອງຮ້ານ" />
      </label>
      <label className="space-y-2 text-sm font-semibold">ເຣດຊື້ສິນຄ້າເລີ່ມຕົ້ນ · 1 ບາດ = ກີບ
        <Input name="thbPurchaseRate" type="number" min="0" step="0.0001" defaultValue={(settings.thbPurchaseRate ?? 0) / RATE_SCALE || ""} placeholder="ປັບໄດ້ໃນແຕ່ລະຮອບຊື້" />
      </label>
      <label className="flex items-center gap-2 text-sm sm:col-span-2"><input name="thbEnabled" type="checkbox" defaultChecked={settings.thbEnabled ?? false} /> ເປີດຮັບເງິນສົດບາດໃນ POS · ທອນ/ຄືນເງິນເປັນກີບ</label>
      <p className="text-xs leading-5 text-slate-500 sm:col-span-2">ຕ້ອງເປີດກະກ່ອນຮັບເງິນບາດ ເພື່ອນັບລິ້ນຊັກແຍກກີບ/ບາດ. ການປ່ຽນເຣດບໍ່ປ່ຽນລາຄາຂາຍ ຫຼື ຂໍ້ມູນເກົ່າ.</p>
      <Button type="submit" disabled={pending}>{pending ? "ກຳລັງບັນທຶກ..." : "ບັນທຶກເຣດ"}</Button>
      <p role="status" className={state.ok === false ? "text-sm text-rose-700" : "text-sm text-emerald-700"}>{state.message}</p>
    </form>
  </section>;
}
