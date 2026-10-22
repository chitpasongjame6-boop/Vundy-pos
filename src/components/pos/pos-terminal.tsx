"use client";
import { formatRate, formatThb, lakToThbDue, parseDecimal, thbToLak } from "@/lib/currency";

import { useCallback, useEffect, useEffectEvent, useMemo, useRef, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { getPosPromotions } from "@/actions/promotion.action";
import { getPricingKey, getPromotionDiscount, resolvePromotionPrice } from "@/lib/promotions";
import {
  Barcode,
  Banknote,
  Minus,
  Plus,
  Printer,
  Search,
  Trash2,
  UserRound,
  X
} from "lucide-react";
import { createPosSale } from "@/actions/pos.action";
import { buildPosReceiptHtml } from "@/components/pos/pos-receipt-html";
import type {
  MemberSummary,
  Product,
  Promotion,
  Sale,
  SalePaymentMethod,
  StoreSettings
} from "@/types";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input, Select } from "@/components/ui/input";
import { MoneyInput } from "@/components/ui/money-input";
import { EmptyState } from "@/components/ui/patterns";
import { resolvePublicAssetUrl } from "@/lib/asset-url";
import { listenForBarcodeScan } from "@/lib/barcode-scanner";
import {
  formatCurrency,
  formatProductVariantName,
  getProductVariants
} from "@/lib/utils";

type ProductOption = {
  key: string;
  productId: string;
  variantId: string;
  productName: string;
  variantName: string;
  displayName: string;
  sku: string;
  category: string;
  price: number;
  originalPrice: number;
  promotionId: string | null;
  promotionName: string | null;
  cost: number;
  stock: number;
};

type CartItem = ProductOption & {
  quantity: number;
};

export function PosTerminal({
  initialPricing,
  products,
  storeSettings,
  members,
  userRole
}: {
  initialPricing: { promotions: Promotion[]; serverNow: number };
  products: Product[];
  storeSettings: StoreSettings;
  members: MemberSummary[];
  userRole: "OWNER" | "STAFF";
}) {
  const router = useRouter();
  const [pricing, setPricing] = useState(initialPricing);
  const [pricingNow, setPricingNow] = useState(initialPricing.serverNow);
  const [pricingError, setPricingError] = useState(false);
  const pricingClock = useRef({ server: initialPricing.serverNow, client: 0 });
  const refreshPricing = useCallback(() => getPosPromotions().then(
    latest => {
      pricingClock.current = { server: latest.serverNow, client: performance.now() };
      setPricing(latest); setPricingNow(latest.serverNow); setPricingError(false);
    },
    () => { setPricingError(true); }
  ), []);
  useEffect(() => {
    pricingClock.current = { server: initialPricing.serverNow, client: performance.now() };
    void refreshPricing();
    const clock = setInterval(() => setPricingNow(pricingClock.current.server + performance.now() - pricingClock.current.client), 1000);
    const refresh = setInterval(() => { void refreshPricing(); }, 30000);
    const onFocus = () => { void refreshPricing(); };
    window.addEventListener("focus", onFocus);
    return () => { clearInterval(clock); clearInterval(refresh); window.removeEventListener("focus", onFocus); };
  }, [initialPricing.serverNow, refreshPricing]);
  const options = useMemo(
    () =>
      products.flatMap((product) =>
        getProductVariants(product).map((variant) => ({
          key: `${product.id}::${variant.id}`,
          productId: product.id,
          variantId: variant.id,
          productName: product.name,
          variantName: variant.name,
          displayName: formatProductVariantName(product.name, variant.name),
          sku: variant.sku,
          category: product.category,
          ...resolvePromotionPrice(product.id, variant.id, variant.sellPrice, pricing.promotions, pricingNow),
          cost: variant.costPrice,
          stock: variant.stock
        }))
      ),
    [products, pricing.promotions, pricingNow]
  );
  const [scanValue, setScanValue] = useState("");
  const [selectedKey, setSelectedKey] = useState("");
  const [cart, setCart] = useState<CartItem[]>([]);
  const [discount, setDiscount] = useState(0);
  const [receivedAmount, setReceivedAmount] = useState(0);
  const [paymentMethod, setPaymentMethod] = useState<SalePaymentMethod>("CASH");
  const [paymentReference, setPaymentReference] = useState("");
  const [splitCash, setSplitCash] = useState(0);
  const [splitTransfer, setSplitTransfer] = useState(0);
  const [splitOther, setSplitOther] = useState(0);
  const [memberSearch, setMemberSearch] = useState("");
  const [selectedMemberId, setSelectedMemberId] = useState("");
  const [message, setMessage] = useState("");
  const [isPending, startTransition] = useTransition();
  const [tenderCurrency, setTenderCurrency] = useState<"LAK" | "THB">("LAK");
  const [receivedThb, setReceivedThb] = useState("");
  const idempotencyKey = useRef(crypto.randomUUID());
  const selectedMember = members.find((member) => member.id === selectedMemberId);
  const matchingMembers = useMemo(() => {
    const query = memberSearch.trim().toLocaleLowerCase();

    if (!query) {
      return [];
    }

    const queryDigits = query.replace(/\D/g, "");

    return members.filter((member) => {
      const phoneDigits = member.phone.replace(/\D/g, "");

      return (
        member.name.toLocaleLowerCase().includes(query) ||
        member.phone.toLocaleLowerCase().includes(query) ||
        Boolean(queryDigits && phoneDigits.includes(queryDigits))
      );
    });
  }, [memberSearch, members]);
  const selectedOption = options.find((item) => item.key === selectedKey) ?? null;
  const selectedOutOfStock = Boolean(selectedOption && selectedOption.stock <= 0);

  const pricedCart = cart.map(item => ({ ...item, ...resolvePromotionPrice(item.productId, item.variantId,
    options.find(option => option.key === item.key)?.originalPrice ?? item.originalPrice, pricing.promotions, pricingNow) }));
  const subtotal = pricedCart.reduce(
    (sum, item) => sum + item.originalPrice * item.quantity,
    0
  );
  const promotionDiscount = getPromotionDiscount(pricedCart);
  const safeDiscount = promotionDiscount > 0 ? 0 : Math.min(Math.max(0, discount), subtotal);
  const netAmount = subtotal - promotionDiscount - safeDiscount;
  const payingThb = paymentMethod === "CASH" && tenderCurrency === "THB";
  const thbRate = storeSettings.thbPaymentRate ?? 0;
  let receivedLak = receivedAmount;
  let thbSatang = 0;
  let validThb = true;
  if (payingThb) {
    try { thbSatang = parseDecimal(receivedThb, 2); receivedLak = thbToLak(thbSatang, thbRate); }
    catch { receivedLak = 0; validThb = false; }
    validThb = validThb && Boolean(storeSettings.thbEnabled);
  }
  let thbDue = 0;
  try { thbDue = lakToThbDue(netAmount, thbRate); } catch { /* invalid/out-of-range cart is rejected on save */ }
  const changeAmount =
    paymentMethod === "CASH" ? Math.max(0, receivedLak - netAmount) : 0;
  const memberDiscountAmount = selectedMember?.tier?.discountPercent
    ? (promotionDiscount > 0 ? 0 : Math.round((subtotal * selectedMember.tier.discountPercent) / 100))
    : 0;
  const splitTotal = splitCash + splitTransfer + splitOther;
  const paymentIsValid =
    paymentMethod === "CASH"
      ? receivedLak >= netAmount && validThb
      : paymentMethod === "SPLIT"
        ? splitTotal === netAmount && splitTotal > 0
        : true;

  function selectMember(member: MemberSummary) {
    setSelectedMemberId(member.id);
    setMemberSearch(`${member.name} - ${member.phone}`);
  }

  function clearMemberSelection() {
    setSelectedMemberId("");
    setMemberSearch("");
  }

  function addToCart(option: ProductOption) {
    setMessage("");
    if (option.promotionId) setDiscount(0);
    setCart((current) => {
      const existing = current.find((item) => item.key === option.key);
      const currentQuantity = existing?.quantity ?? 0;

      if (option.stock <= 0) {
        setMessage(
          `${option.displayName} ສິນຄ້າໝົດສະຕ໋ອກ`
        );
        return current;
      }

      if (currentQuantity + 1 > option.stock) {
        setMessage("ສະຕ໋ອກສິນຄ້າບໍ່ພໍ");
        return current;
      }

      if (existing) {
        return current.map((item) =>
          item.key === option.key
            ? { ...item, quantity: item.quantity + 1 }
            : item
        );
      }

      return [{ ...option, quantity: 1 }, ...current];
    });
  }

  function addByBarcode(value: string) {
    if (isPending) return;
    const barcode = value.trim().toLowerCase();

    if (!barcode) {
      return;
    }

    setScanValue("");
    const matched = options.find((option) => option.sku.toLowerCase() === barcode);

    if (!matched) {
      setMessage("ບໍ່ພົບ SKU / Barcode ນີ້");
      return;
    }

    setSelectedKey(matched.key);
    addToCart(matched);
  }

  // Read current stock/promotions without reinstalling the listener on every
  // pricing clock tick, which could interrupt a scan part-way through its code.
  const onBarcodeScan = useEffectEvent((barcode: string) => addByBarcode(barcode));
  useEffect(() => {
    if (isPending) return;
    return listenForBarcodeScan((barcode) => onBarcodeScan(barcode));
  }, [isPending]);

  function handleManualSelect(key: string) {
    setSelectedKey(key);

    const option = options.find((item) => item.key === key);

    if (!option) {
      return;
    }

    addToCart(option);
  }

  function updateQuantity(key: string, quantity: number) {
    const option = options.find((item) => item.key === key);

    if (!option) {
      return;
    }

    if (quantity <= 0) {
      setCart((current) => current.filter((item) => item.key !== key));
      return;
    }

    if (quantity > option.stock) {
      setMessage("ສະຕ໋ອກສິນຄ້າບໍ່ພໍ");
      return;
    }

    setMessage("");
    setCart((current) =>
      current.map((item) =>
        item.key === key ? { ...item, quantity } : item
      )
    );
  }

  function saveAndPrint() {
    setMessage("");

    startTransition(async () => {
      try {
      const result = await createPosSale({
        pricingKey: getPricingKey(pricedCart),
        expectedNetAmount: netAmount,
        items: cart.map((item) => ({
          productId: item.productId,
          variantId: item.variantId,
          quantity: item.quantity
        })),
        discount: safeDiscount,
        paymentMethod,
        receivedAmount,
        tenderCurrency: payingThb ? "THB" : "LAK",
        tenderAmountMinor: payingThb ? thbSatang : undefined,
        expectedExchangeRate: payingThb ? thbRate : undefined,
        memberId: selectedMemberId,
        paymentReference,
        payments: paymentMethod === "SPLIT" ? [
          { method: "CASH", amount: splitCash },
          { method: "TRANSFER", amount: splitTransfer, reference: paymentReference },
          { method: "OTHER", amount: splitOther }
        ] : undefined,
        idempotencyKey: idempotencyKey.current
      });

      if (!result.ok || !result.sale) {
        setMessage(result.message);
        if (result.priceChanged) { await refreshPricing(); router.refresh(); }
        return;
      }

      printPosReceipt(result.sale, storeSettings);
      setCart([]);
      setDiscount(0);
      setReceivedAmount(0);
      setReceivedThb("");
      setTenderCurrency("LAK");
      setScanValue("");
      setSelectedKey("");
      setSelectedMemberId("");
      setMemberSearch("");
      setPaymentReference("");
      setSplitCash(0);
      setSplitTransfer(0);
      setSplitOther(0);
      idempotencyKey.current = crypto.randomUUID();
      setMessage(result.message);
      } catch {
        setMessage("ເຊື່ອມຕໍ່ບໍ່ສໍາເລັດ ກະລຸນາກວດປະຫວັດບິນ ຫຼື ກົດບັນທຶກອີກຄັ້ງ (ລະບົບປ້ອງກັນບິນຊໍ້າ)");
      }
    });
  }

  return (
    <div className="grid gap-4 xl:grid-cols-[1fr_22rem]">
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Barcode className="h-5 w-5" aria-hidden />
            1. ເລືອກສິນຄ້າ
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          {pricingError && <p role="alert" className="rounded-xl bg-amber-50 p-3 text-sm text-amber-900">ຍັງອັບເດດໂປຣບໍ່ໄດ້. ລະບົບຈະກວດລາຄາອີກຄັ້ງກ່ອນບັນທຶກບິນ.</p>}
          <div className="rounded-xl border border-emerald-200 bg-emerald-50 px-3 py-2">
            <p role="status" className="text-sm font-bold text-emerald-900">
              {isPending ? "ພັກການສະແກນ — ກຳລັງບັນທຶກບິນ..." : "ພ້ອມສະແກນ Barcode — ບໍ່ຕ້ອງຄລິກຊ່ອງ"}
            </p>
            <p className="mt-1 text-xs leading-5 text-emerald-800">
              ສະແກນ 1 ຄັ້ງ ເພີ່ມ 1 ຊິ້ນ · ເຄື່ອງສະແກນແບບຄີບອດ ສົ່ງ Enter ຫຼື Tab ທ້າຍລະຫັດ.
              ຖ້າກຳລັງພິມໃນຊ່ອງອື່ນ ໃຫ້ຄລິກພື້ນທີ່ວ່າງກ່ອນສະແກນ.
            </p>
          </div>
          <div className="grid gap-3 md:grid-cols-[1fr_1fr_auto]">
            <label className="space-y-1.5">
              <span className="text-sm font-semibold text-slate-700">
                ສະແກນ SKU / Barcode
              </span>
              <Input
                value={scanValue}
                onChange={(event) => setScanValue(event.target.value)}
                onKeyDown={(event) => {
                  if (event.nativeEvent.isComposing || event.ctrlKey || event.altKey || event.metaKey || event.shiftKey) return;
                  if (event.key === "Enter" || (event.key === "Tab" && event.currentTarget.value.trim())) {
                    event.preventDefault();
                    const barcode = event.currentTarget.value;
                    // Clear immediately so a CR+LF suffix cannot add twice,
                    // even before React finishes updating this controlled input.
                    event.currentTarget.value = "";
                    addByBarcode(barcode);
                  }
                }}
                placeholder="ສະແກນ ຫຼື ພິມ SKU ແລ້ວກົດ Enter"
                autoComplete="off"
                disabled={isPending}
              />
            </label>
            <label className="space-y-1.5">
              <span className="text-sm font-semibold text-slate-700">
                ເລືອກສິນຄ້າເອງ
              </span>
              <Select
                value={selectedKey}
                onChange={(event) => handleManualSelect(event.target.value)}
              >
                <option value="">ເລືອກແລ້ວເພີ່ມອັດຕະໂນມັດ</option>
                {options.map((option) => (
                  <option key={option.key} value={option.key}>
                    {option.displayName} ({option.sku}) ·{" "}
                    {formatCurrency(option.price)} {option.promotionName ? `— ໂປຣ: ${option.promotionName} (ປົກກະຕິ ${formatCurrency(option.originalPrice)}) · ` : " · "}
                    {option.stock <= 0 ? "ໝົດສະຕ໋ອກ" : `ສະຕ໋ອກ ${option.stock}`}
                  </option>
                ))}
              </Select>
              {selectedOutOfStock ? (
                <p className="rounded-xl border border-rose-200 bg-rose-50 px-3 py-2 text-sm font-bold text-rose-700">
                  {selectedOption?.displayName} ໝົດສະຕ໋ອກ
                  ບໍ່ສາມາດເພີ່ມໃສ່ບິນໄດ້
                </p>
              ) : null}
            </label>
            <div className="flex items-end">
              <Button
                type="button"
                className="w-full md:w-auto"
                onClick={() => {
                  const option = options.find((item) => item.key === selectedKey);
                  if (option) {
                    addToCart(option);
                  }
                }}
                disabled={!selectedKey || selectedOutOfStock}
              >
                <Plus className="h-4 w-4" aria-hidden />
                ເພີ່ມ
              </Button>
            </div>
          </div>

          {message ? (
            <div className="rounded-xl border border-rose-200 bg-rose-50 px-3 py-2 text-sm font-bold text-rose-700">
              {message}
            </div>
          ) : null}

          <div className="space-y-2">
            {cart.length ? (
              pricedCart.map((item) => (
                <div
                  key={item.key}
                  className="grid gap-3 rounded-xl border border-slate-200 p-3 md:grid-cols-[1fr_auto]"
                >
                  <div className="min-w-0">
                    <p className="font-bold text-slate-950">
                      {item.displayName}
                    </p>
                    <p className="text-sm text-slate-500">
                      {item.sku} · {formatCurrency(item.price)} · ສະຕ໋ອກ{" "}
                      {item.stock}
                    </p>
                    <p className="mt-1 text-sm font-bold text-slate-950">
                      {item.promotionName && <span className="mb-1 block text-xs font-semibold text-emerald-700">ໂປຣ: {item.promotionName} · <span className="text-slate-400 line-through">{formatCurrency(item.originalPrice)}</span> → {formatCurrency(item.price)}</span>}
                      {formatCurrency(item.price * item.quantity)}
                    </p>
                  </div>
                  <div className="flex items-center gap-2">
                    <Button
                      type="button"
                      variant="secondary"
                      className="min-h-9 px-2"
                      onClick={() => updateQuantity(item.key, item.quantity - 1)}
                    >
                      <Minus className="h-4 w-4" aria-hidden />
                    </Button>
                    <Input
                      value={item.quantity}
                      min={1}
                      max={item.stock}
                      type="number"
                      onChange={(event) =>
                        updateQuantity(item.key, Number(event.target.value))
                      }
                      className="w-20 text-center"
                    />
                    <Button
                      type="button"
                      variant="secondary"
                      className="min-h-9 px-2"
                      onClick={() => updateQuantity(item.key, item.quantity + 1)}
                    >
                      <Plus className="h-4 w-4" aria-hidden />
                    </Button>
                    <Button
                      type="button"
                      variant="ghost"
                      className="min-h-9 px-2 text-rose-600 hover:bg-rose-50"
                      onClick={() => updateQuantity(item.key, 0)}
                    >
                      <Trash2 className="h-4 w-4" aria-hidden />
                    </Button>
                  </div>
                </div>
              ))
            ) : (
              <EmptyState
                icon={Barcode}
                title="ບິນຍັງວ່າງ"
                description="ສະແກນ Barcode ຫຼື ເລືອກສິນຄ້າດ້ານເທິງເພື່ອເລີ່ມຂາຍ"
              />
            )}
          </div>
        </CardContent>
      </Card>

      <Card className="h-fit xl:sticky xl:top-6">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Banknote className="h-5 w-5" aria-hidden />
            2. ສະຫຼຸບ ແລະ ຊໍາລະ
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          <div className="rounded-xl border border-slate-200 p-3">
            <div className="space-y-1.5">
              <span className="flex items-center gap-2 text-sm font-semibold text-slate-700">
                <UserRound className="h-4 w-4" aria-hidden />
                ສະມາຊິກ
              </span>
              <div className="relative">
                <Search className="pointer-events-none absolute left-3 top-3 h-4 w-4 text-slate-400" aria-hidden />
                <Input
                  value={memberSearch}
                  onChange={(event) => {
                    setMemberSearch(event.target.value);
                    setSelectedMemberId("");
                  }}
                  placeholder="ຄົ້ນຫາຊື່ ຫຼື ເບີໂທສະມາຊິກ"
                  aria-label="ຄົ້ນຫາສະມາຊິກດ້ວຍຊື່ ຫຼື ເບີໂທ"
                  className="pl-9 pr-9"
                />
                {memberSearch ? (
                  <button
                    type="button"
                    onClick={clearMemberSelection}
                    className="absolute right-2 top-2 inline-flex h-7 w-7 items-center justify-center rounded-lg text-slate-400 hover:bg-slate-100 hover:text-slate-700"
                    aria-label="ລ້າງການຄົ້ນຫາສະມາຊິກ"
                  >
                    <X className="h-4 w-4" aria-hidden />
                  </button>
                ) : null}
              </div>
            </div>
            {memberSearch.trim() && !selectedMember ? (
              <div className="mt-2 overflow-hidden rounded-xl border border-slate-200 bg-white">
                {matchingMembers.length ? (
                  <>
                    <div className="max-h-56 overflow-y-auto p-1">
                      {matchingMembers.slice(0, 8).map((member) => (
                        <button
                          key={member.id}
                          type="button"
                          onClick={() => selectMember(member)}
                          className="flex w-full items-center justify-between gap-3 rounded-lg px-3 py-2 text-left hover:bg-indigo-50"
                        >
                          <span className="min-w-0">
                            <span className="block truncate text-sm font-bold text-slate-950">
                              {member.name}
                            </span>
                            <span className="block text-xs text-slate-500">{member.phone}</span>
                          </span>
                          <span className="shrink-0 text-xs font-semibold text-indigo-700">
                            {member.tier?.name ?? "ສະມາຊິກ"}
                          </span>
                        </button>
                      ))}
                    </div>
                    {matchingMembers.length > 8 ? (
                      <p className="border-t border-slate-100 px-3 py-2 text-xs text-slate-500">
                        ພົບ {matchingMembers.length} ຄົນ · ກະລຸນາພິມເພີ່ມເພື່ອຄົ້ນຫາໃຫ້ແຄບລົງ
                      </p>
                    ) : null}
                  </>
                ) : (
                  <p className="px-3 py-3 text-sm text-slate-500">
                    ບໍ່ພົບສະມາຊິກທີ່ກົງກັບຄໍາຄົ້ນຫາ
                  </p>
                )}
              </div>
            ) : null}
            {selectedMember ? (
              <div className="mt-2 rounded-xl border border-emerald-200 bg-emerald-50 p-2 text-xs text-slate-600">
                <div className="flex items-start justify-between gap-2">
                  <p className="font-bold text-slate-950">
                    {selectedMember.name} / {selectedMember.phone}
                  </p>
                  <button
                    type="button"
                    onClick={clearMemberSelection}
                    className="shrink-0 rounded-md p-1 text-slate-400 hover:bg-white hover:text-slate-700"
                    aria-label="ຍົກເລີກສະມາຊິກທີ່ເລືອກ"
                  >
                    <X className="h-4 w-4" aria-hidden />
                  </button>
                </div>
                <p>
                  ລະດັບ: {selectedMember.tier?.name ?? "-"}
                  {userRole === "OWNER"
                    ? ` · ສ່ວນຫຼຸດ ${selectedMember.tier?.discountPercent ?? 0}%`
                    : ""}
                </p>
                {userRole === "OWNER" && memberDiscountAmount > 0 ? (
                  <Button
                    type="button"
                    variant="secondary"
                    className="mt-2 min-h-8 w-full text-xs"
                    onClick={() => setDiscount(memberDiscountAmount)}
                  >
                    ໃຊ້ສ່ວນຫຼຸດ {formatCurrency(memberDiscountAmount)}
                  </Button>
                ) : null}
              </div>
            ) : null}
          </div>
          <SummaryRow label="ຍອດກ່ອນຫຼຸດ" value={formatCurrency(subtotal)} />
          {promotionDiscount > 0 && <><SummaryRow label="ສ່ວນຫຼຸດໂປຣໂມຊັນ" value={`−${formatCurrency(promotionDiscount)}`} /><p className="rounded-xl bg-emerald-50 p-3 text-xs text-emerald-800">ໃຊ້ໂປຣອັດຕະໂນມັດ · ບໍ່ຫຼຸດສະມາຊິກ / ທ້າຍບິນຊໍ້າ</p></>}
          {userRole === "OWNER" && promotionDiscount === 0 ? (
            <label className="space-y-1.5">
              <span className="text-sm font-semibold text-slate-700">ສ່ວນຫຼຸດ</span>
              <MoneyInput
                value={discount}
                min={0}
                onValueChange={setDiscount}
              />
            </label>
          ) : userRole === "STAFF" && promotionDiscount === 0 ? (
            <p className="rounded-xl border border-slate-200 bg-slate-50 p-3 text-xs font-semibold text-slate-600">
              ສ່ວນຫຼຸດຈັດການໂດຍເຈົ້າຂອງຮ້ານເທົ່ານັ້ນ
            </p>
          ) : null}
          <label className="space-y-1.5">
            <span className="text-sm font-semibold text-slate-700">
              ວິທີຊໍາລະ
            </span>
            <Select
              value={paymentMethod}
              onChange={(event) =>
                setPaymentMethod(event.target.value as SalePaymentMethod)
              }
            >
              <option value="CASH">ເງິນສົດ</option>
              <option value="TRANSFER">ໂອນເງິນ</option>
              <option value="OTHER">ອື່ນໆ</option>
              <option value="SPLIT">ແບ່ງຈ່າຍຫຼາຍວິທີ</option>
            </Select>
          </label>
          {paymentMethod === "CASH" ? (
            <div className="space-y-3">
              {storeSettings.thbEnabled || payingThb ? <label className="block space-y-1.5 text-sm font-semibold">ສະກຸນເງິນທີ່ຮັບ
                <Select value={tenderCurrency} onChange={event => { setTenderCurrency(event.target.value as "LAK" | "THB"); setReceivedAmount(0); setReceivedThb(""); }} disabled={isPending}>
                  <option value="LAK">ກີບ (LAK)</option><option value="THB">ບາດ (THB) · ທອນເປັນກີບ</option>
                </Select>
              </label> : null}
              {payingThb ? <div className="space-y-3 rounded-xl border border-indigo-200 bg-indigo-50/50 p-3">
                <p className="text-sm font-bold text-indigo-800">ຕ້ອງຊໍາລະ {formatThb(thbDue)}</p>
                <p className="text-xs text-slate-600">ເຣດຮ້ານ: 1 ບາດ = {formatRate(thbRate)} ກີບ</p>
                <label className="block space-y-1.5 text-sm font-semibold">ຮັບເງິນ (ບາດ)
                  <Input type="number" inputMode="decimal" step="0.01" min="0" value={receivedThb} onChange={event => setReceivedThb(event.target.value)} disabled={isPending} placeholder="0.00" />
                </label>
                <p className="text-sm">ມູນຄ່າທຽບກີບ: {formatCurrency(receivedLak)}</p>
                <p className="text-xs leading-5 text-slate-500">ຕ້ອງເປີດກະກ່ອນຮັບບາດ. ທອນ/ຄືນເງິນເປັນກີບ · ໃບເສັດສະແດງກີບເທົ່ານັ້ນ.</p>
              </div> : (
            <label className="space-y-1.5">
              <span className="text-sm font-semibold text-slate-700">ຮັບເງິນ</span>
              <MoneyInput
                value={receivedAmount}
                min={0}
                onValueChange={setReceivedAmount}
              />
            </label>
              )}
            </div>
          ) : null}
          {paymentMethod === "TRANSFER" || paymentMethod === "OTHER" ? (
            <label className="space-y-1.5">
              <span className="text-sm font-semibold text-slate-700">ເລກອ້າງອີງ / ໝາຍເຫດຊໍາລະ</span>
              <Input
                value={paymentReference}
                onChange={(event) => setPaymentReference(event.target.value)}
                placeholder="ເຊັ່ນ ເລກທຸລະກໍາ QR"
              />
            </label>
          ) : null}
          {paymentMethod === "SPLIT" ? (
            <div className="grid gap-2 rounded-xl border border-slate-200 p-3">
              <p className="text-sm font-bold text-slate-950">ແບ່ງຍອດຊໍາລະ</p>
              <label className="grid grid-cols-[6rem_1fr] items-center gap-2 text-sm">
                <span>ເງິນສົດ</span>
                <MoneyInput value={splitCash} min={0} onValueChange={setSplitCash} />
              </label>
              <label className="grid grid-cols-[6rem_1fr] items-center gap-2 text-sm">
                <span>ເງິນໂອນ</span>
                <MoneyInput value={splitTransfer} min={0} onValueChange={setSplitTransfer} />
              </label>
              <label className="grid grid-cols-[6rem_1fr] items-center gap-2 text-sm">
                <span>ອື່ນໆ</span>
                <MoneyInput value={splitOther} min={0} onValueChange={setSplitOther} />
              </label>
              <Input
                value={paymentReference}
                onChange={(event) => setPaymentReference(event.target.value)}
                placeholder="ເລກອ້າງອີງການໂອນ"
              />
              <p className={splitTotal === netAmount ? "text-xs font-bold text-emerald-700" : "text-xs font-bold text-rose-700"}>
                ລວມ {formatCurrency(splitTotal)} / ຕ້ອງຊໍາລະ {formatCurrency(netAmount)}
              </p>
            </div>
          ) : null}
          <div className="rounded-xl bg-slate-50 p-3">
            <SummaryRow label="ຍອດສຸດທິ" value={formatCurrency(netAmount)} strong />
            {paymentMethod === "CASH" ? (
              <SummaryRow label="ເງິນທອນ" value={formatCurrency(changeAmount)} />
            ) : null}
            {storeSettings.taxEnabled && storeSettings.taxRate > 0 ? (
              <SummaryRow
                label={`ລວມອາກອນ ${storeSettings.taxRate}%`}
                value={formatCurrency(Math.round((netAmount * storeSettings.taxRate) / (100 + storeSettings.taxRate)))}
              />
            ) : null}
          </div>
          {!paymentIsValid ? (
            <p className="rounded-xl bg-rose-50 p-2 text-xs font-semibold text-rose-700">
              {paymentMethod === "CASH"
                ? "ເງິນທີ່ຮັບຕ້ອງບໍ່ຕໍ່າກວ່າຍອດສຸດທິ"
                : "ຍອດແບ່ງຊໍາລະຕ້ອງເທົ່າກັບຍອດສຸດທິ"}
            </p>
          ) : null}
          <Button
            type="button"
            className="w-full"
            onClick={saveAndPrint}
            disabled={!cart.length || isPending || !paymentIsValid}
          >
            <Printer className="h-4 w-4" aria-hidden />
            {isPending ? "ກໍາລັງບັນທຶກ..." : "ບັນທຶກ / ປິ້ນບິນ"}
          </Button>
        </CardContent>
      </Card>
    </div>
  );
}

function SummaryRow({
  label,
  value,
  strong = false
}: {
  label: string;
  value: string;
  strong?: boolean;
}) {
  return (
    <div className="flex items-center justify-between gap-3 py-1">
      <span className="text-sm text-slate-500">{label}</span>
      <span className={strong ? "text-xl font-bold" : "font-bold"}>{value}</span>
    </div>
  );
}

function printPosReceipt(sale: Sale, storeSettings: StoreSettings) {
  const logoUrl = resolvePublicAssetUrl(
    storeSettings.posReceiptLogoUrl,
    window.location.origin
  );
  const receiptHtml = getPosReceiptHtml(sale, storeSettings, logoUrl);
  const printWindow = window.open("", "_blank", "width=420,height=720");

  if (!printWindow) {
    printReceiptInFrame(receiptHtml);
    return;
  }

  printWindow.document.write(receiptHtml);
  printWindow.document.close();
  printWhenReady(printWindow);
}

function getPosReceiptHtml(
  sale: Sale,
  storeSettings: StoreSettings,
  logoUrl: string
) {
  return buildPosReceiptHtml(sale, storeSettings, logoUrl, window.location.origin);

  const receiptWidth = storeSettings.posReceiptSize === "POS_58MM" ? "58mm" : "80mm";
  const logoWidth = storeSettings.posReceiptSize === "POS_58MM" ? "76px" : "96px";
  const logoHeight = storeSettings.posReceiptSize === "POS_58MM" ? "52px" : "64px";

  return `
    <!doctype html>
    <html>
      <head>
        <meta charset="utf-8" />
        <base href="${window.location.origin}" />
        <title>POS Receipt</title>
        <style>
          @font-face {
            font-family: "Noto Sans Lao";
            font-style: normal;
            font-weight: 400 700;
            font-display: block;
            src: url("/fonts/noto-sans-lao-lao.woff2") format("woff2");
            unicode-range: U+0E81-0EDF, U+200C-200D, U+25CC;
          }
          @font-face {
            font-family: "Noto Sans Lao";
            font-style: normal;
            font-weight: 400 700;
            font-display: block;
            src: url("/fonts/noto-sans-lao-latin.woff2") format("woff2");
            unicode-range: U+0000-00FF, U+0131, U+0152-0153, U+02BB-02BC, U+02C6, U+02DA, U+02DC, U+0304, U+0308, U+0329, U+2000-206F, U+20AC, U+2122, U+2191, U+2193, U+2212, U+2215, U+FEFF, U+FFFD;
          }
          @font-face {
            font-family: "Noto Sans Lao";
            font-style: normal;
            font-weight: 400 700;
            font-display: block;
            src: url("/fonts/noto-sans-lao-latin-ext.woff2") format("woff2");
            unicode-range: U+0100-02BA, U+02BD-02C5, U+02C7-02CC, U+02CE-02D7, U+02DD-02FF, U+0304, U+0308, U+0329, U+1D00-1DBF, U+1E00-1E9F, U+1EF2-1EFF, U+2020, U+20A0-20AB, U+20AD-20C0, U+2113, U+2C60-2C7F, U+A720-A7FF;
          }
          @page { size: ${receiptWidth} auto; margin: 0; }
          * { box-sizing: border-box; font-family: "Noto Sans Lao", Arial, sans-serif !important; }
          html, body { width: ${receiptWidth}; margin: 0; font-family: "Noto Sans Lao", Arial, sans-serif !important; }
          body { color: #09090b; background: #ffffff; }
          .receipt { width: ${receiptWidth}; padding: 8px; background: #ffffff; }
          .header { text-align: center; border-bottom: 1px dashed #18181b; padding-bottom: 8px; }
          .logo { display: block; max-width: ${logoWidth}; max-height: ${logoHeight}; object-fit: contain; margin: 0 auto 6px; }
          h1 { font-size: 17px; margin: 0; line-height: 1.25; }
          .subtitle { font-size: 11px; font-weight: 700; margin-top: 3px; }
          .meta { font-size: 10px; color: #52525b; margin-top: 5px; }
          .items { padding: 8px 0; border-bottom: 1px dashed #18181b; }
          .item { margin-bottom: 7px; }
          .name { font-size: 12px; font-weight: 700; line-height: 1.3; }
          .line { display: flex; justify-content: space-between; gap: 8px; font-size: 11px; line-height: 1.4; }
          .totals { padding-top: 8px; }
          .total { font-size: 16px; font-weight: 700; }
          .thanks { margin-top: 10px; text-align: center; font-size: 11px; font-weight: 700; }
          @media screen { body { padding: 10px; } .receipt { border: 1px solid #18181b; } }
        </style>
      </head>
      <body>
        <div class="receipt">
          <div class="header">
            ${logoUrl ? `<img class="logo" src="${escapeHtml(logoUrl)}" alt="${escapeHtml(storeSettings.posReceiptName)}" />` : ""}
            <h1>${escapeHtml(storeSettings.posReceiptName)}</h1>
            ${storeSettings.posReceiptSubtitle ? `<div class="subtitle">${escapeHtml(storeSettings.posReceiptSubtitle)}</div>` : ""}
            ${storeSettings.posReceiptNote ? `<div class="subtitle">${escapeHtml(storeSettings.posReceiptNote)}</div>` : ""}
            <div class="meta">${formatReceiptDate(new Date(sale.createdAt))}</div>
            <div class="meta">Bill: ${escapeHtml(sale.saleNo ?? sale.id.slice(-8).toUpperCase())}</div>
            ${sale.cashierName ? `<div class="meta">Cashier: ${escapeHtml(sale.cashierName)}</div>` : ""}
            ${sale.memberName ? `<div class="meta">Member: ${escapeHtml(sale.memberName)} / ${escapeHtml(sale.memberPhone ?? "")}</div>` : ""}
          </div>
          <div class="items">
            ${sale.items
              .map(
                (item) => `
                  <div class="item">
                    <div class="name">${escapeHtml(formatProductVariantName(item.name, item.variantName))}</div>
                    <div class="line"><span>${item.quantity} x ${formatCurrency(item.price)}</span><span>${formatCurrency(item.price * item.quantity)}</span></div>
                  </div>
                `
              )
              .join("")}
          </div>
          <div class="totals">
            <div class="line"><span>ຍອດລວມ</span><strong>${formatCurrency(sale.totalAmount)}</strong></div>
            <div class="line"><span>ສ່ວນຫຼຸດ</span><strong>${formatCurrency(sale.discount)}</strong></div>
            <div class="line total"><span>ຍອດສຸດທິ</span><span>${formatCurrency(sale.netAmount)}</span></div>
            <div class="line"><span>ຊໍາລະ</span><strong>${paymentMethodLabel(sale.paymentMethod)}</strong></div>
            ${
              sale.paymentMethod === "CASH"
                ? `<div class="line"><span>ຮັບເງິນ</span><strong>${formatCurrency(sale.receivedAmount ?? 0)}</strong></div>
                   <div class="line"><span>ເງິນທອນ</span><strong>${formatCurrency(sale.changeAmount ?? 0)}</strong></div>`
                : ""
            }
          </div>
          <div class="thanks">ຂອບໃຈທີ່ອຸດໜູນຮ້ານເຮົາ</div>
        </div>
      </body>
    </html>
  `;
}

function printReceiptInFrame(receiptHtml: string) {
  const iframe = document.createElement("iframe");
  iframe.setAttribute("aria-hidden", "true");
  iframe.style.position = "fixed";
  iframe.style.right = "0";
  iframe.style.bottom = "0";
  iframe.style.width = "1px";
  iframe.style.height = "1px";
  iframe.style.border = "0";
  iframe.style.opacity = "0";
  document.body.appendChild(iframe);

  const frameWindow = iframe.contentWindow;

  if (!frameWindow) {
    iframe.remove();
    return;
  }

  let removed = false;
  const removeFrame = () => {
    if (removed) {
      return;
    }

    removed = true;
    iframe.remove();
  };

  frameWindow.document.open();
  frameWindow.document.write(receiptHtml);
  frameWindow.document.close();
  frameWindow.addEventListener("afterprint", removeFrame, { once: true });
  printWhenReady(frameWindow);
  window.setTimeout(removeFrame, 300000);
}

function printWhenReady(printWindow: Window) {
  let printed = false;

  const printOnce = () => {
    if (printed) {
      return;
    }

    printed = true;
    printWindow.focus();
    printWindow.print();
  };

  const ready = withTimeout(
    Promise.all([waitForFonts(printWindow), waitForImages(printWindow)]),
    5000
  );

  void ready.finally(printOnce);
}

function withTimeout<T>(promise: Promise<T>, timeoutMs: number) {
  return Promise.race([
    promise,
    new Promise<void>((resolve) => window.setTimeout(resolve, timeoutMs))
  ]);
}

function waitForFonts(printWindow: Window) {
  if (!("fonts" in printWindow.document)) {
    return Promise.resolve();
  }

  const fonts = printWindow.document.fonts;

  return Promise.all([
    fonts.load('400 16px "Noto Sans Lao"', 'ບິນ POS ₭'),
    fonts.load('700 16px "Noto Sans Lao"', 'ບິນ POS ₭'),
    fonts.ready
  ])
    .then(() => undefined)
    .catch(() => undefined);
}

function waitForImages(printWindow: Window) {
  const images = Array.from(printWindow.document.images);

  if (!images.length) {
    return Promise.resolve();
  }

  return Promise.all(
    images.map(
      (image) =>
        new Promise<void>((resolve) => {
          if (image.complete) {
            resolve();
            return;
          }

          image.addEventListener("load", () => resolve(), { once: true });
          image.addEventListener("error", () => resolve(), { once: true });
        })
    )
  ).then(() => undefined);
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

function paymentMethodLabel(value: SalePaymentMethod) {
  if (value === "TRANSFER") {
    return "ໂອນເງິນ";
  }

  if (value === "OTHER") {
    return "ອື່ນໆ";
  }

  return "ເງິນສົດ";
}

function escapeHtml(value: string | null | undefined) {
  return (value ?? "")
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#039;");
}
