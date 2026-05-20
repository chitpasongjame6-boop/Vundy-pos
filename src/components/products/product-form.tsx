"use client";

import { useState } from "react";
import { ImagePlus, Plus, Save, Trash2 } from "lucide-react";
import { submitCreateProduct } from "@/actions/product.action";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input, Select } from "@/components/ui/input";
import { MoneyInput } from "@/components/ui/money-input";

const fieldClass = "space-y-1.5";
const labelClass = "text-sm font-semibold text-zinc-700";

type VariantRow = {
  id: string;
  name: string;
};

type ProductFormProps = {
  categories: string[];
};

export function ProductForm({ categories }: ProductFormProps) {
  const [hasVariants, setHasVariants] = useState(false);
  const [variants, setVariants] = useState<VariantRow[]>([
    { id: "variant-1", name: "ມາດຕະຖານ" }
  ]);

  function addVariant() {
    setVariants((current) => [
      ...current,
      { id: crypto.randomUUID(), name: `${current.length + 1}` }
    ]);
  }

  function removeVariant(id: string) {
    setVariants((current) =>
      current.length > 1 ? current.filter((variant) => variant.id !== id) : current
    );
  }

  return (
    <Card>
      <CardContent>
        <form action={submitCreateProduct} className="grid gap-5">
          <section className="grid gap-4 sm:grid-cols-2">
            <label className={fieldClass}>
              <span className={labelClass}>ຊື່ສິນຄ້າຫຼັກ</span>
              <Input name="name" placeholder="Dior Sauvage" required />
            </label>
            <label className={fieldClass}>
              <span className={labelClass}>ໝວດໝູ່</span>
              <Select
                name="category"
                required
                defaultValue=""
              >
                <option value="" disabled>
                  ເລືອກໝວດໝູ່
                </option>
                {categories.map((category) => (
                  <option key={category} value={category}>
                    {category}
                  </option>
                ))}
              </Select>
            </label>
            <label className={`${fieldClass} sm:col-span-2`}>
              <span className={labelClass}>ອັບໂຫຼດຮູບສິນຄ້າ</span>
              <div className="flex min-h-28 flex-col items-center justify-center gap-2 rounded-md border border-dashed border-zinc-300 bg-zinc-50 px-4 py-5 text-center">
                <ImagePlus className="h-7 w-7 text-zinc-500" aria-hidden />
                <input
                  name="productImage"
                  type="file"
                  accept="image/jpeg,image/png,image/webp,image/gif"
                  className="w-full max-w-sm rounded-md border border-zinc-200 bg-white px-3 py-2 text-sm file:mr-3 file:rounded-md file:border-0 file:bg-zinc-950 file:px-3 file:py-2 file:text-sm file:font-semibold file:text-white"
                />
                <p className="text-xs text-zinc-500">
                  ຮອງຮັບ JPG, PNG, WEBP, GIF
                </p>
              </div>
            </label>
          </section>

          <section className="grid gap-3">
            <div className="grid gap-3">
              <div>
                <h3 className="text-base font-bold text-zinc-950">
                  ຮູບແບບການຂາຍ
                </h3>
                <p className="text-sm text-zinc-500">
                  ເລືອກວ່າສິນຄ້ານີ້ຂາຍແບບດຽວ ຫຼື ແຍກຫຼາຍຂະໜາດ
                </p>
              </div>

              <div className="grid gap-2 sm:grid-cols-2">
                <label className="flex min-h-12 cursor-pointer items-center gap-3 rounded-md border border-zinc-200 bg-white px-3">
                  <input
                    type="radio"
                    name="saleMode"
                    value="single"
                    checked={!hasVariants}
                    onChange={() => setHasVariants(false)}
                    className="h-4 w-4 accent-zinc-950"
                  />
                  <span>
                    <span className="block text-sm font-bold text-zinc-950">
                      ສິນຄ້າປົກກະຕິ
                    </span>
                    <span className="block text-xs text-zinc-500">
                      ມີລາຄາ ແລະ ສະຕ໋ອກຊຸດດຽວ
                    </span>
                  </span>
                </label>
                <label className="flex min-h-12 cursor-pointer items-center gap-3 rounded-md border border-zinc-200 bg-white px-3">
                  <input
                    type="radio"
                    name="saleMode"
                    value="variants"
                    checked={hasVariants}
                    onChange={() => setHasVariants(true)}
                    className="h-4 w-4 accent-zinc-950"
                  />
                  <span>
                    <span className="block text-sm font-bold text-zinc-950">
                      ມີຫຼາຍຂະໜາດ
                    </span>
                    <span className="block text-xs text-zinc-500">
                      ເຊັ່ນ 10ml, 20ml, ຂວດເຕັມ
                    </span>
                  </span>
                </label>
              </div>

              {hasVariants ? (
                <div className="flex justify-end">
                  <Button type="button" variant="secondary" onClick={addVariant}>
                    <Plus className="h-4 w-4" aria-hidden />
                    ເພີ່ມຂະໜາດ
                  </Button>
                </div>
              ) : null}
            </div>

            <div className="grid gap-3">
              {(hasVariants ? variants : variants.slice(0, 1)).map((variant, index) => (
                <Card key={variant.id} className="bg-zinc-50 shadow-none">
                  <CardHeader className="flex flex-row items-center justify-between gap-3 p-3 pb-0">
                    <CardTitle className="text-sm">
                      {hasVariants ? `ຂະໜາດ ${index + 1}` : "ຂໍ້ມູນລາຄາ ແລະ ສະຕ໋ອກ"}
                    </CardTitle>
                    {hasVariants ? (
                      <Button
                        type="button"
                        variant="ghost"
                        className="min-h-9 px-2 text-xs"
                        onClick={() => removeVariant(variant.id)}
                        disabled={variants.length === 1}
                      >
                        <Trash2 className="h-4 w-4" aria-hidden />
                        ລຶບ
                      </Button>
                    ) : null}
                  </CardHeader>
                  <CardContent className="grid gap-3 p-3 sm:grid-cols-2 lg:grid-cols-4">
                    <label className={hasVariants ? fieldClass : "hidden"}>
                      <span className={labelClass}>ຊື່ຂະໜາດ</span>
                      <Input
                        name="variantName"
                        placeholder="10ml / 20ml / ຂວດເຕັມ"
                        defaultValue={index === 0 ? "ມາດຕະຖານ" : ""}
                        required={hasVariants}
                      />
                    </label>
                    {!hasVariants ? (
                      <input type="hidden" name="variantName" value="ມາດຕະຖານ" />
                    ) : null}
                    <label className={fieldClass}>
                      <span className={labelClass}>SKU / Barcode</span>
                      <Input
                        name="variantSku"
                        placeholder="ສະແກນ Barcode ຫຼື ພິມ SKU"
                        autoComplete="off"
                        required
                      />
                    </label>
                    <label className={hasVariants ? fieldClass : "hidden"}>
                      <span className={labelClass}>ຫົວໜ່ວຍ</span>
                      <Input name="variantUnit" placeholder="ml / ຂວດ / pcs" />
                    </label>
                    {!hasVariants ? (
                      <input type="hidden" name="variantUnit" value="pcs" />
                    ) : null}
                    <label className={fieldClass}>
                      <span className={labelClass}>ສະຕ໋ອກ</span>
                      <Input name="variantStock" min={0} type="number" required />
                    </label>
                    <label className={fieldClass}>
                      <span className={labelClass}>ຕົ້ນທຶນ</span>
                      <MoneyInput
                        name="variantCostPrice"
                        min={0}
                        step={1000}
                        required
                      />
                    </label>
                    <label className={fieldClass}>
                      <span className={labelClass}>ລາຄາຂາຍ</span>
                      <MoneyInput
                        name="variantSellPrice"
                        min={0}
                        step={1000}
                        required
                      />
                    </label>
                    <label className={fieldClass}>
                      <span className={labelClass}>ແຈ້ງເຕືອນຕໍ່າກວ່າ</span>
                      <Input
                        name="variantLowStockAlert"
                        min={0}
                        type="number"
                        defaultValue={5}
                        required
                      />
                    </label>
                  </CardContent>
                </Card>
              ))}
            </div>
          </section>

          <label className="flex min-h-11 items-center gap-3 rounded-md border border-zinc-200 px-3">
            <input
              name="isActive"
              type="checkbox"
              defaultChecked
              className="h-4 w-4 accent-zinc-950"
            />
            <span className={labelClass}>ເປີດການຂາຍສິນຄ້າ</span>
          </label>
          <div>
            <Button type="submit" className="w-full sm:w-auto">
              <Save className="h-4 w-4" aria-hidden />
              ບັນທຶກສິນຄ້າ
            </Button>
          </div>
        </form>
      </CardContent>
    </Card>
  );
}
