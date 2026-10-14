"use client";

import { useEffect, useRef, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { CalendarClock, Pencil, Plus, Search, Tags, Trash2 } from "lucide-react";
import { deletePromotion, savePromotion, setPromotionEnabled } from "@/actions/promotion.action";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Input, Select } from "@/components/ui/input";
import { EmptyState } from "@/components/ui/patterns";
import { formatCurrency, formatProductVariantName, getProductVariants } from "@/lib/utils";
import { promotionPrice, promotionStatus, toLaoDateTimeInput } from "@/lib/promotions";
import type { Product, Promotion, PromotionInput } from "@/types";

const statusLabels = { ACTIVE: "ກໍາລັງໃຊ້", SCHEDULED: "ລໍຖ້າເລີ່ມ", EXPIRED: "ໝົດເວລາ", PAUSED: "ຢຸດໄວ້" };
const statusColors = { ACTIVE: "bg-emerald-50 text-emerald-700", SCHEDULED: "bg-sky-50 text-sky-700", EXPIRED: "bg-slate-100 text-slate-500", PAUSED: "bg-amber-50 text-amber-700" };

export function PromotionManager({ products, promotions, serverNow }: { products: Product[]; promotions: Promotion[]; serverNow: number }) {
  const router = useRouter();
  const editor = useRef<HTMLDivElement>(null);
  const [pending, startTransition] = useTransition();
  const [now, setNow] = useState(serverNow);
  const blank = (): PromotionInput => ({ name: "", kind: "FIXED_PRICE", value: 0, targets: [], isActive: true,
    startsAt: toLaoDateTimeInput(new Date(now)), endsAt: toLaoDateTimeInput(new Date(now + 86400000)) });
  const [draft, setDraft] = useState<PromotionInput>(blank);
  const [amountText, setAmountText] = useState("");
  const [search, setSearch] = useState("");
  const [message, setMessage] = useState<{ ok: boolean; message: string } | null>(null);
  const [deletingId, setDeletingId] = useState<string | null>(null);
  useEffect(() => {
    const started = performance.now();
    const timer = setInterval(() => setNow(serverNow + performance.now() - started), 1000);
    return () => clearInterval(timer);
  }, [serverNow]);
  const variants = products.filter(product => product.isActive).flatMap(product => getProductVariants(product).map(variant => ({
    ...variant, productId: product.id, variantId: variant.id, key: `${product.id}::${variant.id}`,
    displayName: formatProductVariantName(product.name, variant.name)
  })));
  const selected = new Set(draft.targets.map(target => `${target.productId}::${target.variantId}`));
  const filtered = variants.filter(variant => `${variant.displayName} ${variant.sku}`.toLowerCase().includes(search.trim().toLowerCase()));
  const selectedVariants = variants.filter(variant => selected.has(variant.key));
  const belowCost = amountText ? selectedVariants.filter(variant => promotionPrice(variant.sellPrice, draft.kind, draft.value) < variant.costPrice) : [];
  const missingTargets = draft.targets.length - selectedVariants.length;
  const displayDate = (date: Date | string) => toLaoDateTimeInput(date).replace("T", " ");

  function edit(promotion: Promotion) {
    setDraft({ id: promotion.id, name: promotion.name, kind: promotion.kind, value: promotion.value,
      targets: promotion.targets, isActive: promotion.isActive, startsAt: toLaoDateTimeInput(promotion.startsAt), endsAt: toLaoDateTimeInput(promotion.endsAt) });
    setAmountText(String(promotion.value)); setSearch(""); setMessage(null);
    editor.current?.scrollIntoView({ behavior: "smooth", block: "start" });
    editor.current?.querySelector<HTMLInputElement>('input[name="promotionName"]')?.focus({ preventScroll: true });
  }

  function remove(promotion: Promotion) {
    if (pending || !window.confirm(
      `ລຶບໂປຣໂມຊັນ “${promotion.name}” ຫຼືບໍ່?\n\nໂປຣນີ້ຈະບໍ່ຖືກໃຊ້ກັບການຂາຍໃໝ່ ແລະ ບໍ່ສາມາດຍ້ອນກັບໄດ້. ຍອດຂາຍ ແລະ ສ່ວນຫຼຸດໃນບິນເກົ່າຈະບໍ່ປ່ຽນ.`
    )) return;
    setMessage(null);
    setDeletingId(promotion.id);
    startTransition(async () => {
      try {
        const result = await deletePromotion(promotion.id);
        setMessage(result);
        if (result.ok) {
          if (draft.id === promotion.id) { setDraft(blank()); setAmountText(""); setSearch(""); }
          router.refresh();
        }
      } catch {
        setMessage({ ok: false, message: "ເຊື່ອມຕໍ່ບໍ່ສໍາເລັດ ກະລຸນາລອງໃໝ່" });
      } finally {
        setDeletingId(null);
      }
    });
  }

  return <div className="space-y-4">
    <div className="rounded-2xl border border-indigo-100 bg-indigo-50 p-4 text-sm leading-6 text-indigo-950">
      ເຈົ້າຂອງຮ້ານກໍານົດໂປຣ — ພະນັກງານຂາຍໄດ້ທັນທີ. ຖ້າມີຫຼາຍໂປຣຊ້ອນກັນ ລະບົບເລືອກລາຄາທີ່ຖືກທີ່ສຸດ. ບິນທີ່ມີໂປຣບໍ່ຫຼຸດສະມາຊິກ / ທ້າຍບິນຊໍ້າ.
    </div>
    {message && <p role="status" className={`rounded-xl border p-3 text-sm ${message.ok ? "border-emerald-200 bg-emerald-50 text-emerald-800" : "border-rose-200 bg-rose-50 text-rose-800"}`}>{message.message}</p>}
    <div className="grid items-start gap-5 xl:grid-cols-[minmax(0,1.2fr)_minmax(0,1fr)]">
      <div ref={editor} className="min-w-0 scroll-mt-6">
        <Card><CardContent>
          <h2 className="mb-5 flex items-center gap-2 text-lg font-extrabold"><Tags className="h-5 w-5 text-indigo-600" />{draft.id ? "ແກ້ໄຂໂປຣໂມຊັນ" : "ສ້າງໂປຣໂມຊັນ"}</h2>
          <form onSubmit={event => {
            event.preventDefault(); setMessage(null);
            startTransition(async () => {
              try {
                const result = await savePromotion(draft);
                setMessage(result);
                if (result.ok) { setDraft(blank()); setAmountText(""); setSearch(""); router.refresh(); }
              } catch { setMessage({ ok: false, message: "ເຊື່ອມຕໍ່ບໍ່ສໍາເລັດ ກະລຸນາລອງໃໝ່" }); }
            });
          }}>
            <fieldset disabled={pending} className="min-w-0 space-y-5 disabled:opacity-60">
              <label className="block space-y-2"><span className="text-sm font-bold">1. ຊື່ໂປຣໂມຊັນ</span>
                <Input name="promotionName" required maxLength={100} placeholder="ຕົວຢ່າງ: ໂປຣປີໃໝ່" value={draft.name} onChange={event => setDraft({ ...draft, name: event.target.value })} />
              </label>
              <div className="space-y-2">
                <div className="flex flex-wrap justify-between gap-2 text-sm font-bold"><h3>2. ສິນຄ້າ / ຂະໜາດທີ່ຮ່ວມໂປຣ</h3><span className="text-indigo-600">ເລືອກ {draft.targets.length}</span></div>
                <label className="relative block"><Search className="absolute left-3 top-3 h-4 w-4 text-slate-400" /><Input aria-label="ຄົ້ນຫາສິນຄ້າ" className="pl-9" placeholder="ຄົ້ນຫາຊື່, ຂະໜາດ ຫຼື SKU" value={search} onChange={event => setSearch(event.target.value)} /></label>
                <div className="max-h-64 overflow-y-auto rounded-xl border border-slate-200">
                  {filtered.length ? filtered.map(variant => <label key={variant.key} className={`flex cursor-pointer items-start gap-3 border-b border-slate-100 p-3 last:border-0 ${selected.has(variant.key) ? "bg-indigo-50" : "hover:bg-slate-50"}`}>
                    <input type="checkbox" className="mt-1 h-4 w-4 shrink-0 accent-indigo-600" checked={selected.has(variant.key)} onChange={event => setDraft({ ...draft, targets: event.target.checked
                      ? [...draft.targets, { productId: variant.productId, variantId: variant.variantId }]
                      : draft.targets.filter(target => `${target.productId}::${target.variantId}` !== variant.key) })} />
                    <span className="min-w-0 flex-1"><span className="block break-words text-sm font-semibold">{variant.displayName}</span><span className="text-xs text-slate-500">{variant.sku} · {formatCurrency(variant.sellPrice)}</span></span>
                  </label>) : <p className="p-4 text-sm text-slate-500">ບໍ່ພົບສິນຄ້າ</p>}
                </div>
                {missingTargets > 0 && <div role="alert" className="text-sm text-rose-700">ມີ {missingTargets} ຂະໜາດຖືກລຶບ / ປິດການຂາຍ. <button type="button" className="underline" onClick={() => setDraft({ ...draft, targets: selectedVariants.map(({ productId, variantId }) => ({ productId, variantId })) })}>ເອົາລາຍການນັ້ນອອກ</button></div>}
              </div>
              <div className="space-y-2"><h3 className="text-sm font-bold">3. ກໍານົດລາຄາໂປຣ</h3><div className="grid gap-3 sm:grid-cols-2">
                <label className="space-y-1 text-sm"><span>ຮູບແບບ</span><Select value={draft.kind} onChange={event => { setDraft({ ...draft, kind: event.target.value as Promotion["kind"], value: 0 }); setAmountText(""); }}><option value="FIXED_PRICE">ລາຄາພິເສດ (ກີບ / ຊິ້ນ)</option><option value="PERCENT">ຫຼຸດເປັນເປີເຊັນ (%)</option></Select></label>
                <label className="space-y-1 text-sm"><span>{draft.kind === "PERCENT" ? "ຫຼຸດ (%)" : "ລາຄາຂາຍໃໝ່ (ກີບ)"}</span><Input required type="number" inputMode="numeric" placeholder={draft.kind === "PERCENT" ? "10" : "200000"} min={draft.kind === "PERCENT" ? 1 : 0} max={draft.kind === "PERCENT" ? 100 : 2147483647} step={1} value={amountText} onChange={event => { setAmountText(event.target.value); setDraft({ ...draft, value: Number(event.target.value) }); }} /></label>
              </div></div>
              {selectedVariants.length > 0 && amountText !== "" && <div className="max-h-48 space-y-2 overflow-y-auto rounded-xl bg-slate-50 p-3 text-sm">
                <p className="font-bold">ຕົວຢ່າງລາຄາຫຼັງຫຼຸດ</p>
                {selectedVariants.map(variant => <div key={variant.key} className="flex flex-wrap justify-between gap-2"><span>{variant.displayName}</span><span><span className="text-slate-400 line-through">{formatCurrency(variant.sellPrice)}</span> → <strong className="text-indigo-700">{formatCurrency(promotionPrice(variant.sellPrice, draft.kind, draft.value))}</strong></span></div>)}
              </div>}
              {belowCost.length > 0 && <p role="alert" className="rounded-xl bg-amber-50 p-3 text-sm text-amber-900">ເຕືອນ: ລາຄາໂປຣຕໍ່າກວ່າຕົ້ນທຶນ {belowCost.length} ຂະໜາດ. ກະລຸນາກວດກ່ອນບັນທຶກ.</p>}
              <div className="space-y-2"><h3 className="flex items-center gap-2 text-sm font-bold"><CalendarClock className="h-4 w-4" />4. ວັນ ແລະ ເວລາ (ລາວ UTC+7)</h3>
                <div className="grid gap-3 sm:grid-cols-2"><label className="min-w-0 space-y-1 text-sm"><span>ເລີ່ມ</span><Input required type="datetime-local" value={draft.startsAt} onChange={event => setDraft({ ...draft, startsAt: event.target.value })} /></label><label className="min-w-0 space-y-1 text-sm"><span>ສິ້ນສຸດ</span><Input required type="datetime-local" value={draft.endsAt} onChange={event => setDraft({ ...draft, endsAt: event.target.value })} /></label></div>
                <p className="text-xs leading-5 text-slate-500">ລະບົບເລີ່ມຕາມເວລາທີ່ກໍານົດ ແລະ ກັບໄປລາຄາປົກກະຕິທັນທີເມື່ອຮອດເວລາສິ້ນສຸດ.</p>
              </div>
              <label className="flex items-center gap-2 text-sm font-semibold"><input type="checkbox" className="h-4 w-4 accent-indigo-600" checked={draft.isActive} onChange={event => setDraft({ ...draft, isActive: event.target.checked })} />ເປີດໃຊ້ງານຕາມຊ່ວງເວລາ</label>
              <div className="flex flex-wrap gap-2"><Button type="submit" disabled={!draft.targets.length || missingTargets > 0}>{pending ? "ກໍາລັງບັນທຶກ..." : "ບັນທຶກໂປຣໂມຊັນ"}</Button>{draft.id && <Button type="button" variant="secondary" onClick={() => { setDraft(blank()); setAmountText(""); setSearch(""); }}><Plus className="h-4 w-4" />ສ້າງໃໝ່ / ຍົກເລີກແກ້ໄຂ</Button>}</div>
            </fieldset>
          </form>
        </CardContent></Card>
      </div>
      <div className="min-w-0 space-y-3"><h2 className="text-lg font-extrabold">ໂປຣໂມຊັນທັງໝົດ ({promotions.length})</h2>
        {!promotions.length && <EmptyState icon={Tags} title="ຍັງບໍ່ມີໂປຣໂມຊັນ" description="ເລືອກສິນຄ້າ ຕັ້ງລາຄາ ແລະ ກໍານົດເວລາເພື່ອເລີ່ມໂປຣທໍາອິດ" />}
        {promotions.map(promotion => {
          const status = promotionStatus(promotion, now);
          return <Card key={promotion.id}><CardContent className="space-y-3">
            <div className="flex flex-wrap items-start justify-between gap-2"><h3 className="break-words font-extrabold">{promotion.name}</h3><span className={`rounded-full px-2.5 py-1 text-xs font-bold ${statusColors[status]}`}>{statusLabels[status]}</span></div>
            <p className="text-lg font-bold text-indigo-700">{promotion.kind === "PERCENT" ? `ຫຼຸດ ${promotion.value}%` : `${formatCurrency(promotion.value)} / ຊິ້ນ`}</p>
            <p className="text-xs leading-6 text-slate-500">{displayDate(promotion.startsAt)} → {displayDate(promotion.endsAt)}<br />ເວລາລາວ · {promotion.targets.length} ຂະໜາດ</p>
            <details className="text-sm"><summary className="cursor-pointer text-slate-600">ເບິ່ງສິນຄ້າທີ່ຮ່ວມໂປຣ</summary><ul className="mt-2 space-y-1 text-xs text-slate-500">{promotion.targets.map(target => <li key={`${target.productId}::${target.variantId}`}>{variants.find(variant => variant.productId === target.productId && variant.variantId === target.variantId)?.displayName ?? "ສິນຄ້າຖືກປິດ / ລຶບ"}</li>)}</ul></details>
            <div className="flex flex-wrap gap-2"><Button type="button" variant="secondary" disabled={pending} onClick={() => edit(promotion)}><Pencil className="h-4 w-4" />ແກ້ໄຂ</Button><Button type="button" variant="ghost" disabled={pending || status === "EXPIRED"} onClick={() => startTransition(async () => {
              try { const result = await setPromotionEnabled(promotion.id, !promotion.isActive); setMessage(result); if (result.ok) router.refresh(); }
              catch { setMessage({ ok: false, message: "ເຊື່ອມຕໍ່ບໍ່ສໍາເລັດ" }); }
            })}>{promotion.isActive ? "ຢຸດໂປຣ" : "ເປີດໂປຣ"}</Button>
              <Button type="button" variant="ghost" className="text-rose-700 hover:bg-rose-50 hover:text-rose-800" disabled={pending}
                aria-label={`ລຶບໂປຣໂມຊັນ ${promotion.name}`} onClick={() => remove(promotion)}>
                <Trash2 className="h-4 w-4" aria-hidden />{deletingId === promotion.id ? "ກໍາລັງລຶບ..." : "ລຶບ"}
              </Button>
            </div>
          </CardContent></Card>;
        })}
      </div>
    </div>
  </div>;
}
