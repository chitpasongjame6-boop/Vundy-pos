"use client";

import { useMemo, useState } from "react";
import {
  Barcode,
  ClipboardCheck,
  Minus,
  Plus,
  ShoppingBasket,
  Trash2
} from "lucide-react";
import { submitCreateOrder } from "@/actions/order.action";
import type { Product } from "@/types";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Input, Select, Textarea } from "@/components/ui/input";
import {
  formatCurrency,
  formatProductVariantName,
  getProductVariants
} from "@/lib/utils";

const fieldClass = "space-y-1.5";
const labelClass = "text-sm font-semibold text-zinc-700";

type ProductOption = {
  key: string;
  productId: string;
  variantId: string;
  productName: string;
  variantName: string;
  displayName: string;
  sku: string;
  stock: number;
  price: number;
  cost: number;
  label: string;
};

type CartItem = ProductOption & {
  quantity: number;
};

export function OrderForm({
  products,
  shippingCompanies
}: {
  products: Product[];
  shippingCompanies: string[];
}) {
  const productOptions = useMemo<ProductOption[]>(
    () =>
      products.flatMap((product) =>
        getProductVariants(product).map((variant) => {
          const displayName = formatProductVariantName(product.name, variant.name);

          return {
            key: `${product.id}::${variant.id}`,
            productId: product.id,
            variantId: variant.id,
            productName: product.name,
            variantName: variant.name,
            displayName,
            sku: variant.sku,
            stock: variant.stock,
            price: variant.sellPrice,
            cost: variant.costPrice,
            label: `${displayName} (${variant.sku}) - ${formatCurrency(variant.sellPrice)} · ສະຕ໋ອກ ${variant.stock}`
          };
        })
      ),
    [products]
  );
  const [selectedProductKey, setSelectedProductKey] = useState("");
  const [scanValue, setScanValue] = useState("");
  const [quantity, setQuantity] = useState(1);
  const [cart, setCart] = useState<CartItem[]>([]);
  const [message, setMessage] = useState("");
  const [messageTone, setMessageTone] = useState<"success" | "error">("success");

  const subtotal = cart.reduce((sum, item) => sum + item.price * item.quantity, 0);
  const totalCost = cart.reduce((sum, item) => sum + item.cost * item.quantity, 0);
  const profit = subtotal - totalCost;

  function showMessage(text: string, tone: "success" | "error") {
    setMessage(text);
    setMessageTone(tone);
  }

  function addCartItem(productKey: string, amount = 1) {
    const option = productOptions.find((item) => item.key === productKey);
    const safeAmount = Math.max(1, Math.round(amount));

    if (!option) {
      showMessage("ບໍ່ພົບ SKU / Barcode ນີ້", "error");
      return;
    }

    if (option.stock <= 0) {
      showMessage("ສິນຄ້ານີ້ສະຕ໋ອກໝົດ ຕ້ອງເພີ່ມສະຕ໋ອກກ່ອນ", "error");
      return;
    }

    const existing = cart.find((item) => item.key === option.key);
    const currentQuantity = existing?.quantity ?? 0;
    const nextQuantity = Math.min(option.stock, currentQuantity + safeAmount);

    if (nextQuantity === currentQuantity) {
      showMessage("ຈໍານວນໃນອໍເດີເທົ່າກັບສະຕ໋ອກແລ້ວ", "error");
      return;
    }

    if (existing) {
      setCart((current) =>
        current.map((item) =>
          item.key === option.key ? { ...item, quantity: nextQuantity } : item
        )
      );
    } else {
      setCart((current) => [...current, { ...option, quantity: nextQuantity }]);
    }

    showMessage(`ເພີ່ມແລ້ວ: ${option.displayName}`, "success");
  }

  function selectAndAddProduct(productKey: string) {
    setSelectedProductKey(productKey);

    const selected = productOptions.find((option) => option.key === productKey);
    setScanValue(selected?.sku ?? "");

    if (selected) {
      addCartItem(productKey, quantity);
    }
  }

  function addByBarcode(value: string) {
    const barcode = value.trim().toLowerCase();

    if (!barcode) {
      return;
    }

    const matched = productOptions.find(
      (option) => option.sku.toLowerCase() === barcode
    );

    if (!matched) {
      showMessage("ບໍ່ພົບ SKU / Barcode ນີ້", "error");
      return;
    }

    setSelectedProductKey(matched.key);
    addCartItem(matched.key, 1);
    setScanValue("");
  }

  function updateCartQuantity(productKey: string, nextQuantity: number) {
    setCart((current) =>
      current
        .map((item) =>
          item.key === productKey
            ? {
                ...item,
                quantity: Math.min(item.stock, Math.max(1, Math.round(nextQuantity)))
              }
            : item
        )
        .filter((item) => item.quantity > 0)
    );
  }

  function removeCartItem(productKey: string) {
    setCart((current) => current.filter((item) => item.key !== productKey));
  }

  return (
    <Card>
      <CardContent>
        <form action={submitCreateOrder} className="grid gap-4 lg:grid-cols-[1fr_24rem]">
          <div className="grid gap-4">
            <div className="grid gap-3 rounded-md border border-zinc-200 p-3">
              <label className={fieldClass}>
                <span className={labelClass}>ສະແກນ SKU / Barcode</span>
                <div className="relative">
                  <Barcode
                    className="pointer-events-none absolute left-3 top-1/2 h-5 w-5 -translate-y-1/2 text-zinc-400"
                    aria-hidden
                  />
                  <Input
                    value={scanValue}
                    onChange={(event) => {
                      const value = event.target.value;
                      setScanValue(value);

                      const matched = productOptions.find(
                        (option) => option.sku.toLowerCase() === value.trim().toLowerCase()
                      );

                      if (matched) {
                        addByBarcode(value);
                      }
                    }}
                    onKeyDown={(event) => {
                      if (event.key === "Enter") {
                        event.preventDefault();
                        addByBarcode(scanValue);
                      }
                    }}
                    placeholder="ຍິງ Barcode ຫຼື ພິມ SKU ແລ້ວກົດ Enter"
                    className="pl-10"
                    autoComplete="off"
                  />
                </div>
                {message ? (
                  <p
                    className={
                      messageTone === "error"
                        ? "text-xs font-semibold text-rose-600"
                        : "text-xs font-semibold text-emerald-700"
                    }
                  >
                    {message}
                  </p>
                ) : (
                  <p className="text-xs text-zinc-500">
                    ສະແກນ ຫຼື ເລືອກສິນຄ້າແລ້ວລະບົບຈະເພີ່ມເຂົ້າອໍເດີໃຫ້ເອງ
                  </p>
                )}
              </label>

              <div className="grid gap-3 sm:grid-cols-[1fr_8rem_auto]">
                <label className={fieldClass}>
                  <span className={labelClass}>ສິນຄ້າ</span>
                  <Select
                    value={selectedProductKey}
                    onChange={(event) => selectAndAddProduct(event.target.value)}
                  >
                    <option value="">ເລືອກສິນຄ້າ / ຂະໜາດ</option>
                    {productOptions.map((option) => (
                      <option key={option.key} value={option.key}>
                        {option.label}
                      </option>
                    ))}
                  </Select>
                </label>
                <label className={fieldClass}>
                  <span className={labelClass}>ຈໍານວນ</span>
                  <Input
                    min={1}
                    type="number"
                    value={quantity}
                    onChange={(event) => setQuantity(Number(event.target.value))}
                  />
                </label>
                <div className="flex items-end">
                  <Button
                    type="button"
                    className="w-full"
                    onClick={() => addCartItem(selectedProductKey, quantity)}
                  >
                    <Plus className="h-4 w-4" aria-hidden />
                    ເພີ່ມ
                  </Button>
                </div>
              </div>
            </div>

            <div className="grid gap-3 sm:grid-cols-2">
              <label className={fieldClass}>
                <span className={labelClass}>ຊື່ລູກຄ້າ</span>
                <Input name="customerName" required />
              </label>
              <label className={fieldClass}>
                <span className={labelClass}>ເບີຜູ້ຮັບ</span>
                <Input name="phone" required />
              </label>
              <label className={fieldClass}>
                <span className={labelClass}>ແຂວງ</span>
                <Input name="province" required />
              </label>
              <label className={fieldClass}>
                <span className={labelClass}>ເມືອງ</span>
                <Input name="city" required />
              </label>
              <label className={fieldClass}>
                <span className={labelClass}>ການຊໍາລະ</span>
                <Select name="paymentStatus" defaultValue="PAID" required>
                  <option value="PAID">ຈ່າຍແລ້ວ</option>
                  <option value="COD">COD / ເກັບເງິນປາຍທາງ</option>
                </Select>
              </label>
              <label className={fieldClass}>
                <span className={labelClass}>ບໍລິສັດຂົນສົ່ງ</span>
                <Select name="shippingCompany" required>
                  <option value="">ເລືອກບໍລິສັດຂົນສົ່ງ</option>
                  {shippingCompanies.map((company) => (
                    <option key={company} value={company}>
                      {company}
                    </option>
                  ))}
                </Select>
              </label>
              <label className={fieldClass}>
                <span className={labelClass}>ສາຂາຮັບເຄື່ອງ</span>
                <Input name="pickupBranch" placeholder="ຕົວຢ່າງ: ສາຂາໂພນຕ້ອງ" />
              </label>
              <label className={`${fieldClass} sm:col-span-2`}>
                <span className={labelClass}>ໝາຍເຫດ</span>
                <Textarea name="note" placeholder="ລາຍລະອຽດເພີ່ມເຕີມ" />
              </label>
            </div>
          </div>

          <aside className="grid content-start gap-3">
            <div className="rounded-md border border-zinc-200 p-3">
              <div className="mb-3 flex items-center justify-between gap-3">
                <p className="flex items-center gap-2 font-bold text-zinc-950">
                  <ShoppingBasket className="h-5 w-5" aria-hidden />
                  ລາຍການອໍເດີ
                </p>
                <p className="text-sm font-semibold text-zinc-500">
                  {cart.reduce((sum, item) => sum + item.quantity, 0)} ຊິ້ນ
                </p>
              </div>

              {cart.length ? (
                <div className="grid gap-2">
                  {cart.map((item) => (
                    <div key={item.key} className="rounded-md border border-zinc-200 p-3">
                      <input type="hidden" name="productVariantKey" value={item.key} />
                      <input type="hidden" name="quantity" value={item.quantity} />
                      <div className="flex items-start justify-between gap-3">
                        <div className="min-w-0">
                          <p className="font-semibold text-zinc-950">
                            {item.displayName}
                          </p>
                          <p className="text-xs text-zinc-500">
                            {item.sku} · {formatCurrency(item.price)} · ສະຕ໋ອກ {item.stock}
                          </p>
                        </div>
                        <Button
                          type="button"
                          variant="ghost"
                          className="min-h-8 px-2 text-rose-600"
                          onClick={() => removeCartItem(item.key)}
                        >
                          <Trash2 className="h-4 w-4" aria-hidden />
                        </Button>
                      </div>
                      <div className="mt-3 flex items-center justify-between gap-2">
                        <div className="flex items-center gap-1">
                          <Button
                            type="button"
                            variant="secondary"
                            className="min-h-8 px-2"
                            onClick={() => updateCartQuantity(item.key, item.quantity - 1)}
                          >
                            <Minus className="h-4 w-4" aria-hidden />
                          </Button>
                          <span className="min-w-10 text-center font-bold">
                            {item.quantity}
                          </span>
                          <Button
                            type="button"
                            variant="secondary"
                            className="min-h-8 px-2"
                            onClick={() => updateCartQuantity(item.key, item.quantity + 1)}
                          >
                            <Plus className="h-4 w-4" aria-hidden />
                          </Button>
                        </div>
                        <p className="font-bold text-zinc-950">
                          {formatCurrency(item.price * item.quantity)}
                        </p>
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="rounded-md border border-dashed border-zinc-300 p-6 text-center text-sm text-zinc-500">
                  ສະແກນ ຫຼື ເພີ່ມສິນຄ້າເຂົ້າອໍເດີ
                </div>
              )}
            </div>

            <div className="rounded-md bg-zinc-50 p-3">
              <SummaryRow label="ຍອດຂາຍ" value={formatCurrency(subtotal)} />
              <SummaryRow label="ຕົ້ນທຶນ" value={formatCurrency(totalCost)} />
              <SummaryRow label="ກໍາໄລ" value={formatCurrency(profit)} success />
            </div>

            <Button type="submit" className="w-full" disabled={!cart.length}>
              <ClipboardCheck className="h-4 w-4" aria-hidden />
              ສ້າງອໍເດີ
            </Button>
          </aside>
        </form>
      </CardContent>
    </Card>
  );
}

function SummaryRow({
  label,
  value,
  success = false
}: {
  label: string;
  value: string;
  success?: boolean;
}) {
  return (
    <div className="flex items-center justify-between gap-3 py-1 text-sm">
      <span className="text-zinc-500">{label}</span>
      <strong className={success ? "text-emerald-700" : "text-zinc-950"}>
        {value}
      </strong>
    </div>
  );
}
