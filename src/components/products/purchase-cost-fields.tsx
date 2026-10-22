"use client";

import { useState } from "react";
import { Input, Select } from "@/components/ui/input";
import { MoneyInput } from "@/components/ui/money-input";
import { parsePurchaseCost, RATE_SCALE, type Currency } from "@/lib/currency";
import { formatCurrency } from "@/lib/utils";

export function PurchaseCostFields({ prefix = "variant", defaultRate = 0 }: { prefix?: "variant" | "purchase"; defaultRate?: number }) {
  const [currency, setCurrency] = useState<Currency>("LAK");
  const [lak, setLak] = useState(0);
  const [baht, setBaht] = useState("");
  const [rate, setRate] = useState(defaultRate ? String(defaultRate / RATE_SCALE) : "");
  let preview: number | null = null;
  try { preview = parsePurchaseCost(currency, currency === "THB" ? baht : lak, rate).costPrice; } catch { /* incomplete input */ }
  return <div className="grid gap-3 rounded-xl border border-indigo-100 bg-indigo-50/40 p-3 sm:col-span-2 xl:col-span-4">
    <div className={prefix === "purchase" ? "grid gap-3" : "grid gap-3 sm:grid-cols-2"}>
      <label className="space-y-1.5 text-sm font-semibold">ສະກຸນເງິນຕົ້ນທຶນ
        <Select name={`${prefix}CostCurrency`} value={currency} onChange={event => setCurrency(event.target.value as Currency)}>
          <option value="LAK">ກີບ (LAK)</option><option value="THB">ບາດ (THB)</option>
        </Select>
      </label>
      <label className="space-y-1.5 text-sm font-semibold">ຕົ້ນທຶນຕໍ່ໜ່ວຍ ({currency === "THB" ? "ບາດ" : "ກີບ"}) *
        {currency === "THB" ? <Input name={`${prefix}CostAmount`} type="number" min="0" step="0.01" inputMode="decimal" value={baht} onChange={event => setBaht(event.target.value)} placeholder="0.00" required />
          : <MoneyInput name={prefix === "variant" ? "variantCostPrice" : "unitCost"} value={lak} onValueChange={setLak} required />}
      </label>
    </div>
    {currency === "THB" ? <>
      <label className="space-y-1.5 text-sm font-semibold">ເຣດຊື້ຮອບນີ້ · 1 ບາດ = ກີບ
        <Input name={`${prefix}CostRate`} type="number" min="0.0001" step="0.0001" inputMode="decimal" value={rate} onChange={event => setRate(event.target.value)} placeholder="ປ້ອນເຣດຊື້" required />
      </label>
      <input type="hidden" name={prefix === "variant" ? "variantCostPrice" : "unitCost"} value={preview ?? ""} />
      <p aria-live="polite" className="text-sm font-bold text-indigo-800">ຕົ້ນທຶນເທົ່າກັບ {preview === null ? "—" : formatCurrency(preview)} / ໜ່ວຍ</p>
    </> : <><input type="hidden" name={`${prefix}CostAmount`} value={lak} /><input type="hidden" name={`${prefix}CostRate`} value="" /></>}
    <p className="text-xs leading-5 text-slate-500">ລາຄາຂາຍຍັງເປັນກີບ · ເກັບເຣດຊື້ໄວ້ ບໍ່ປ່ຽນຕາມເຣດມື້ຫຼັງ</p>
  </div>;
}
