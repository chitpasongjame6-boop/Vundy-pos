"use client";

import Link from "next/link";
import type { ChangeEvent, ReactNode } from "react";
import { startTransition, useActionState, useEffect, useState } from "react";
import type { LucideIcon } from "lucide-react";
import {
  ArrowLeft,
  Barcode,
  Boxes,
  Check,
  CircleDollarSign,
  ImagePlus,
  Layers3,
  Package,
  Plus,
  Save,
  Trash2
} from "lucide-react";
import { submitCreateProduct } from "@/actions/product.action";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { Input, Select } from "@/components/ui/input";
import { MoneyInput } from "@/components/ui/money-input";
import { cn } from "@/lib/utils";
import { ProductExpiryField } from "./product-expiry-field";
import type { ProductFormState } from "@/types";

const fieldClass = "space-y-1.5";
const labelClass = "text-sm font-bold text-slate-700";
const helpClass = "text-xs leading-5 text-slate-500";

type VariantRow = {
  id: string;
  name: string;
};

type ProductFormProps = {
  categories: string[];
};

export function ProductForm({ categories }: ProductFormProps) {
  const [formState, formAction, pending] = useActionState<ProductFormState, FormData>(
    submitCreateProduct, { ok: null, message: "" }
  );
  const [hasVariants, setHasVariants] = useState(false);
  const [variants, setVariants] = useState<VariantRow[]>([
    { id: "variant-1", name: "ມາດຕະຖານ" }
  ]);
  const [imagePreview, setImagePreview] = useState("");
  const [imageFileName, setImageFileName] = useState("");

  useEffect(() => {
    return () => {
      if (imagePreview) URL.revokeObjectURL(imagePreview);
    };
  }, [imagePreview]);

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

  function handleImageChange(event: ChangeEvent<HTMLInputElement>) {
    const file = event.target.files?.[0];

    if (imagePreview) URL.revokeObjectURL(imagePreview);
    setImagePreview(file ? URL.createObjectURL(file) : "");
    setImageFileName(file?.name ?? "");
  }

  const visibleVariants = hasVariants ? variants : variants.slice(0, 1);

  return (
    <form
      action={formAction}
      onSubmit={(event) => {
        event.preventDefault();
        const data = new FormData(event.currentTarget);
        startTransition(() => formAction(data));
      }}
      className="grid items-start gap-5 xl:grid-cols-[minmax(0,1fr)_19rem]"
    >
      <div className="grid min-w-0 gap-5">
        <Card className="overflow-hidden">
          <CardHeader className="border-b border-slate-100 bg-gradient-to-r from-indigo-50/80 to-white p-5 sm:p-6">
            <SectionHeading
              step="1"
              icon={Package}
              title="ຂໍ້ມູນສິນຄ້າ"
              description="ລະບຸຊື່ ແລະ ໝວດໝູ່ທີ່ໃຊ້ຄົ້ນຫາສິນຄ້າ"
            />
          </CardHeader>
          <CardContent className="grid gap-5 p-5 sm:p-6 lg:grid-cols-[minmax(0,1fr)_17rem]">
            <div className="grid content-start gap-4">
              <label className={fieldClass}>
                <span className={labelClass}>
                  ຊື່ສິນຄ້າ <RequiredMark />
                </span>
                <Input
                  name="name"
                  placeholder="ຕົວຢ່າງ: Dior Sauvage"
                  autoComplete="off"
                  required
                />
                <span className={helpClass}>ໃຊ້ຊື່ທີ່ພະນັກງານຈື່ ແລະ ຄົ້ນຫາໄດ້ງ່າຍ</span>
              </label>

              <label className={fieldClass}>
                <span className={labelClass}>
                  ໝວດໝູ່ <RequiredMark />
                </span>
                <Select name="category" required defaultValue="">
                  <option value="" disabled>
                    ເລືອກໝວດໝູ່ສິນຄ້າ
                  </option>
                  {categories.map((category) => (
                    <option key={category} value={category}>
                      {category}
                    </option>
                  ))}
                </Select>
              </label>
            </div>

            <div className={fieldClass}>
              <span className={labelClass}>ຮູບສິນຄ້າ</span>
              <label
                className={cn(
                  "group relative flex min-h-52 cursor-pointer flex-col items-center justify-center overflow-hidden rounded-2xl border-2 border-dashed px-5 py-6 text-center transition",
                  imagePreview
                    ? "border-indigo-300 bg-slate-900"
                    : "border-slate-200 bg-slate-50 hover:border-indigo-300 hover:bg-indigo-50/50"
                )}
              >
                {imagePreview ? (
                  <span
                    className="absolute inset-0 bg-cover bg-center opacity-65 transition group-hover:opacity-45"
                    style={{ backgroundImage: `url(\"${imagePreview}\")` }}
                    aria-hidden
                  />
                ) : null}
                <span
                  className={cn(
                    "relative z-10 flex h-12 w-12 items-center justify-center rounded-2xl shadow-sm",
                    imagePreview ? "bg-white/90 text-indigo-700" : "bg-white text-indigo-600"
                  )}
                >
                  <ImagePlus className="h-6 w-6" aria-hidden />
                </span>
                <span
                  className={cn(
                    "relative z-10 mt-3 text-sm font-extrabold",
                    imagePreview ? "text-white" : "text-slate-800"
                  )}
                >
                  {imagePreview ? "ປ່ຽນຮູບສິນຄ້າ" : "ເລືອກຮູບສິນຄ້າ"}
                </span>
                <span
                  className={cn(
                    "relative z-10 mt-1 max-w-full truncate text-xs",
                    imagePreview ? "text-white/80" : "text-slate-500"
                  )}
                >
                  {imageFileName || "JPG, PNG, WEBP ຫຼື GIF"}
                </span>
                <input
                  name="productImage"
                  type="file"
                  accept="image/jpeg,image/png,image/webp,image/gif"
                  onChange={handleImageChange}
                  className="sr-only"
                />
              </label>
              <p className={helpClass}>ສູງສຸດ 5 MB · ບີບອັດເປັນ WebP ອັດຕະໂນມັດເມື່ອບັນທຶກ (GIF ໃຊ້ຮູບທຳອິດ)</p>
            </div>
          </CardContent>
        </Card>

        <Card className="overflow-hidden">
          <CardHeader className="border-b border-slate-100 p-5 sm:p-6">
            <SectionHeading
              step="2"
              icon={Layers3}
              title="ເລືອກຮູບແບບການຂາຍ"
              description="ເລືອກພຽງແບບດຽວ ຫຼື ແຍກຫຼາຍຂະໜາດ"
            />
          </CardHeader>
          <CardContent className="grid gap-3 p-5 sm:grid-cols-2 sm:p-6">
            <SaleModeCard
              selected={!hasVariants}
              icon={Package}
              title="ສິນຄ້າແບບດຽວ"
              description="ມີ 1 SKU, 1 ລາຄາ ແລະ 1 ຈຳນວນສະຕ໋ອກ"
            >
              <input
                type="radio"
                name="saleMode"
                value="single"
                checked={!hasVariants}
                onChange={() => setHasVariants(false)}
                className="sr-only"
              />
            </SaleModeCard>
            <SaleModeCard
              selected={hasVariants}
              icon={Boxes}
              title="ມີຫຼາຍຂະໜາດ"
              description="ເຊັ່ນ 10ml, 20ml ແລະ ຂວດເຕັມ"
            >
              <input
                type="radio"
                name="saleMode"
                value="variants"
                checked={hasVariants}
                onChange={() => setHasVariants(true)}
                className="sr-only"
              />
            </SaleModeCard>
          </CardContent>
        </Card>

        <Card className="overflow-hidden">
          <CardHeader className="flex flex-col gap-4 border-b border-slate-100 p-5 sm:flex-row sm:items-center sm:justify-between sm:p-6">
            <SectionHeading
              step="3"
              icon={CircleDollarSign}
              title={hasVariants ? "ລາຄາ ແລະ ສະຕ໋ອກແຕ່ລະຂະໜາດ" : "ລາຄາ ແລະ ສະຕ໋ອກ"}
              description="ປ້ອນຂໍ້ມູນທີ່ໃຊ້ຂາຍ ແລະ ຄຳນວນກຳໄລ"
            />
            {hasVariants ? (
              <Button type="button" variant="secondary" onClick={addVariant} className="shrink-0">
                <Plus className="h-4 w-4" aria-hidden />
                ເພີ່ມຂະໜາດ
              </Button>
            ) : null}
          </CardHeader>
          <CardContent className="grid gap-4 p-5 sm:p-6">
            {visibleVariants.map((variant, index) => (
              <div
                key={variant.id}
                className="overflow-hidden rounded-2xl border border-slate-200 bg-slate-50/70"
              >
                <div className="flex items-center justify-between gap-3 border-b border-slate-200 bg-white px-4 py-3">
                  <div className="flex min-w-0 items-center gap-3">
                    <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-indigo-100 text-sm font-extrabold text-indigo-700">
                      {index + 1}
                    </span>
                    <div className="min-w-0">
                      <p className="truncate text-sm font-extrabold text-slate-900">
                        {hasVariants ? `ຂະໜາດທີ ${index + 1}` : "ຂໍ້ມູນສິນຄ້າສຳລັບຂາຍ"}
                      </p>
                      <p className="text-xs text-slate-500">
                        ຊ່ອງທີ່ມີ <RequiredMark /> ຕ້ອງປ້ອນຂໍ້ມູນ
                      </p>
                    </div>
                  </div>
                  {hasVariants ? (
                    <Button
                      type="button"
                      variant="ghost"
                      className="min-h-9 shrink-0 px-2.5 text-xs text-rose-600 hover:bg-rose-50 hover:text-rose-700"
                      onClick={() => removeVariant(variant.id)}
                      disabled={variants.length === 1}
                    >
                      <Trash2 className="h-4 w-4" aria-hidden />
                      ລຶບ
                    </Button>
                  ) : null}
                </div>

                <div className="grid gap-4 p-4 sm:grid-cols-2 xl:grid-cols-4">
                  {hasVariants ? (
                    <label className={fieldClass}>
                      <span className={labelClass}>
                        ຊື່ຂະໜາດ <RequiredMark />
                      </span>
                      <Input
                        name="variantName"
                        placeholder="10ml / 20ml / ຂວດເຕັມ"
                        defaultValue={index === 0 ? "ມາດຕະຖານ" : ""}
                        required
                      />
                    </label>
                  ) : (
                    <input type="hidden" name="variantName" value="ມາດຕະຖານ" />
                  )}

                  <label className={cn(fieldClass, !hasVariants && "sm:col-span-2 xl:col-span-2")}>
                    <span className={labelClass}>
                      SKU / Barcode <RequiredMark />
                    </span>
                    <div className="relative">
                      <Barcode
                        className="pointer-events-none absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400"
                        aria-hidden
                      />
                      <Input
                        name="variantSku"
                        placeholder="ສະແກນ Barcode ຫຼື ພິມ SKU"
                        autoComplete="off"
                        className="pl-10"
                        required
                      />
                    </div>
                  </label>

                  {hasVariants ? (
                    <label className={fieldClass}>
                      <span className={labelClass}>ຫົວໜ່ວຍ</span>
                      <Input name="variantUnit" placeholder="ml / ຂວດ / pcs" />
                    </label>
                  ) : (
                    <input type="hidden" name="variantUnit" value="pcs" />
                  )}

                  <label className={fieldClass}>
                    <span className={labelClass}>
                      ຈຳນວນເລີ່ມຕົ້ນ <RequiredMark />
                    </span>
                    <Input
                      name="variantStock"
                      min={0}
                      type="number"
                      inputMode="numeric"
                      placeholder="0"
                      required
                    />
                  </label>

                  <label className={fieldClass}>
                    <span className={labelClass}>
                      ຕົ້ນທຶນ <RequiredMark />
                    </span>
                    <MoneyInput
                      name="variantCostPrice"
                      min={0}
                      step={1000}
                      placeholder="0"
                      required
                    />
                  </label>

                  <label className={fieldClass}>
                    <span className={labelClass}>
                      ລາຄາຂາຍ <RequiredMark />
                    </span>
                    <MoneyInput
                      name="variantSellPrice"
                      min={0}
                      step={1000}
                      placeholder="0"
                      required
                    />
                  </label>

                  <label className={fieldClass}>
                    <span className={labelClass}>
                      ແຈ້ງເຕືອນເມື່ອເຫຼືອ <RequiredMark />
                    </span>
                    <Input
                      name="variantLowStockAlert"
                      min={0}
                      type="number"
                      inputMode="numeric"
                      defaultValue={5}
                      required
                    />
                  </label>
                  <div className="sm:col-span-2 xl:col-span-4">
                    <ProductExpiryField />
                  </div>
                </div>
              </div>
            ))}
          </CardContent>
        </Card>
      </div>

      <aside className="grid gap-4 xl:sticky xl:top-5">
        <Card className="overflow-hidden border-indigo-100">
          <div className="bg-indigo-600 px-5 py-4 text-white">
            <p className="text-base font-extrabold">ກວດກ່ອນບັນທຶກ</p>
            <p className="mt-1 text-xs leading-5 text-indigo-100">
              ກວດສອບ 3 ສ່ວນຫຼັກໃຫ້ຄົບຖ້ວນ
            </p>
          </div>
          <CardContent className="grid gap-4 p-5">
            <div className="grid gap-3">
              <ChecklistItem text="ຊື່ ແລະ ໝວດໝູ່" />
              <ChecklistItem text="SKU / Barcode ບໍ່ຊ້ຳ" />
              <ChecklistItem text="ຕົ້ນທຶນ, ລາຄາ ແລະ ສະຕ໋ອກ" />
            </div>

            <label className="flex cursor-pointer items-start gap-3 rounded-xl border border-emerald-200 bg-emerald-50 p-3.5">
              <input
                name="isActive"
                type="checkbox"
                defaultChecked
                className="mt-0.5 h-4 w-4 shrink-0 accent-emerald-600"
              />
              <span>
                <span className="block text-sm font-extrabold text-emerald-900">
                  ເປີດຂາຍທັນທີ
                </span>
                <span className="mt-0.5 block text-xs leading-5 text-emerald-700">
                  ສິນຄ້າຈະສະແດງໃນໜ້າຂາຍຫຼັງຈາກບັນທຶກ
                </span>
              </span>
            </label>

            {formState.message ? (
              <p role="alert" className="rounded-xl bg-rose-50 p-3 text-sm text-rose-700">{formState.message}</p>
            ) : null}
            <Button type="submit" className="w-full" disabled={pending}>
              <Save className="h-4 w-4" aria-hidden />
              {pending ? "ກຳລັງບັນທຶກ..." : "ບັນທຶກສິນຄ້າ"}
            </Button>

            <Link
              href="/products"
              className="inline-flex min-h-11 items-center justify-center gap-2 rounded-xl border border-slate-200 bg-white px-4 py-2 text-sm font-bold text-slate-700 transition hover:bg-slate-50"
            >
              <ArrowLeft className="h-4 w-4" aria-hidden />
              ກັບໄປລາຍການສິນຄ້າ
            </Link>
          </CardContent>
        </Card>

        <div className="rounded-2xl border border-amber-200 bg-amber-50 p-4 text-sm text-amber-900">
          <p className="font-extrabold">ຄຳແນະນຳ</p>
          <p className="mt-1 text-xs leading-5 text-amber-800">
            ລາຄາຂາຍຄວນສູງກວ່າຕົ້ນທຶນ ເພື່ອໃຫ້ລະບົບຄຳນວນກຳໄລໄດ້ຖືກຕ້ອງ
          </p>
        </div>
      </aside>
    </form>
  );
}

function RequiredMark() {
  return (
    <span className="text-rose-500" aria-label="ຈຳເປັນ">
      *
    </span>
  );
}

function SectionHeading({
  step,
  icon: Icon,
  title,
  description
}: {
  step: string;
  icon: LucideIcon;
  title: string;
  description: string;
}) {
  return (
    <div className="flex min-w-0 items-start gap-3">
      <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-indigo-600 text-white shadow-sm shadow-indigo-200">
        <Icon className="h-5 w-5" aria-hidden />
      </span>
      <div className="min-w-0">
        <div className="flex flex-wrap items-center gap-2">
          <span className="rounded-full bg-indigo-100 px-2 py-0.5 text-[11px] font-extrabold text-indigo-700">
            ຂັ້ນຕອນ {step}
          </span>
          <h2 className="text-base font-extrabold text-slate-950 sm:text-lg">{title}</h2>
        </div>
        <p className="mt-1 text-sm leading-6 text-slate-500">{description}</p>
      </div>
    </div>
  );
}

function SaleModeCard({
  selected,
  icon: Icon,
  title,
  description,
  children
}: {
  selected: boolean;
  icon: LucideIcon;
  title: string;
  description: string;
  children: ReactNode;
}) {
  return (
    <label
      className={cn(
        "relative flex min-h-28 cursor-pointer items-start gap-3 rounded-2xl border-2 p-4 transition",
        selected
          ? "border-indigo-500 bg-indigo-50 shadow-sm"
          : "border-slate-200 bg-white hover:border-indigo-200 hover:bg-slate-50"
      )}
    >
      {children}
      <span
        className={cn(
          "flex h-10 w-10 shrink-0 items-center justify-center rounded-xl",
          selected ? "bg-indigo-600 text-white" : "bg-slate-100 text-slate-500"
        )}
      >
        <Icon className="h-5 w-5" aria-hidden />
      </span>
      <span className="min-w-0 pr-6">
        <span className="block text-sm font-extrabold text-slate-950">{title}</span>
        <span className="mt-1 block text-xs leading-5 text-slate-500">{description}</span>
      </span>
      <span
        className={cn(
          "absolute right-3 top-3 flex h-5 w-5 items-center justify-center rounded-full border",
          selected
            ? "border-indigo-600 bg-indigo-600 text-white"
            : "border-slate-300 bg-white text-transparent"
        )}
      >
        <Check className="h-3.5 w-3.5" aria-hidden />
      </span>
    </label>
  );
}

function ChecklistItem({ text }: { text: string }) {
  return (
    <div className="flex items-center gap-2.5 text-sm text-slate-700">
      <span className="flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-emerald-100 text-emerald-700">
        <Check className="h-3.5 w-3.5" aria-hidden />
      </span>
      <span>{text}</span>
    </div>
  );
}
