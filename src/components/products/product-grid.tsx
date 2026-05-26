"use client";

import Image from "next/image";
import { useState } from "react";
import {
  AlertTriangle,
  Edit3,
  PackagePlus,
  Search,
  Tags,
  Save,
  X
} from "lucide-react";
import {
  updateProductInfo,
  updateProductVariantStock
} from "@/actions/product.action";
import type { Product } from "@/types";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Input, Select } from "@/components/ui/input";
import { MoneyInput } from "@/components/ui/money-input";
import {
  cn,
  formatCurrency,
  formatProductVariantName,
  getProductSummary
} from "@/lib/utils";

export function ProductFilters({
  categories,
  search,
  category
}: {
  categories: string[];
  search?: string;
  category?: string;
}) {
  return (
    <form className="mb-4 grid gap-3 md:grid-cols-[1fr_14rem_auto]">
      <label className="relative">
        <Search className="pointer-events-none absolute left-3 top-3 h-5 w-5 text-zinc-400" />
        <Input
          name="search"
          defaultValue={search}
          placeholder="ຄົ້ນຫາຊື່ສິນຄ້າ, SKU ຫຼື Barcode"
          className="pl-10"
        />
      </label>
      <Select name="category" defaultValue={category ?? ""}>
        <option value="">ທຸກໝວດໝູ່</option>
        {categories.map((item) => (
          <option key={item} value={item}>
            {item}
          </option>
        ))}
      </Select>
      <Button type="submit" className="w-full md:w-auto">
        ຄົ້ນຫາ
      </Button>
    </form>
  );
}

export function ProductGrid({ products }: { products: Product[] }) {
  const [selectedProductId, setSelectedProductId] = useState<string | null>(null);
  const selectedProduct =
    products.find((product) => product.id === selectedProductId) ?? null;

  return (
    <>
      <div className="grid grid-cols-2 gap-3 lg:grid-cols-3 xl:grid-cols-4">
        {products.map((product) => {
          const summary = getProductSummary(product);
          const priceLabel = formatCurrency(summary.maxPrice);

          return (
            <Card
              key={product.id}
              className="h-full overflow-hidden transition hover:border-zinc-400 hover:shadow-md"
            >
              <button
                type="button"
                onClick={() => setSelectedProductId(product.id)}
                className="grid h-full w-full grid-rows-[auto_1fr] text-left"
              >
                <div className="relative aspect-[4/3] bg-zinc-100">
                  {product.imageUrl ? (
                    <Image
                      src={product.imageUrl}
                      alt={product.name}
                      fill
                      sizes="(max-width: 1024px) 50vw, 25vw"
                      className="object-cover"
                    />
                  ) : (
                    <div className="flex h-full items-center justify-center text-sm text-zinc-400">
                      ບໍ່ມີຮູບ
                    </div>
                  )}
                </div>
                <CardContent className="grid h-full grid-rows-[4rem_auto_2.25rem] gap-2.5 p-3">
                  <div className="space-y-1 overflow-hidden">
                    <div className="flex h-10 items-start justify-between gap-2">
                      <h3 className="line-clamp-2 text-sm font-bold leading-snug tracking-normal text-zinc-950">
                        {product.name}
                      </h3>
                      {!product.isActive ? (
                        <Badge className="border-zinc-200 bg-zinc-100 text-zinc-600">
                          ປິດ
                        </Badge>
                      ) : null}
                    </div>
                    <div className="flex h-5 flex-wrap items-center gap-1.5 overflow-hidden text-[11px] text-zinc-500">
                      <span className="truncate">{product.category}</span>
                    </div>
                  </div>

                  <div className="grid h-[5.75rem] gap-1 rounded-md bg-zinc-50 p-2 text-xs">
                    <div className="grid grid-cols-[minmax(0,1fr)_auto] items-center gap-2">
                      <span className="text-zinc-500">ລາຄາເຕັມ</span>
                      <strong className="max-w-[7.5rem] truncate text-right font-bold text-zinc-950">
                        {priceLabel}
                      </strong>
                    </div>
                    <div className="grid grid-cols-[minmax(0,1fr)_auto] items-center gap-2">
                      <span className="text-zinc-500">ສະຕ໋ອກລວມ</span>
                      <strong
                        className={
                          summary.lowStock
                            ? "font-bold text-rose-700"
                            : "font-bold text-zinc-950"
                        }
                      >
                        {summary.totalStock}
                      </strong>
                    </div>
                    <div className="grid grid-cols-[minmax(0,1fr)_auto] items-center gap-2">
                      <span className="text-zinc-500">ຂະໜາດ</span>
                      <strong className="font-bold text-zinc-950">
                        {summary.variantCount}
                      </strong>
                    </div>
                  </div>

                  <div className="flex h-9 items-center justify-between gap-2 border-t border-zinc-100 pt-2">
                    {summary.lowStock ? (
                      <Badge className="border-rose-200 bg-rose-100 px-2 py-1 text-rose-800">
                        <AlertTriangle className="mr-1 h-3.5 w-3.5" aria-hidden />
                        ໃກ້ໝົດ
                      </Badge>
                    ) : (
                      <span className="text-xs font-semibold text-emerald-700">
                        ພ້ອມຂາຍ
                      </span>
                    )}
                    <span className="text-xs font-semibold text-zinc-500">
                      ກົດເພື່ອເບິ່ງ
                    </span>
                  </div>
                </CardContent>
              </button>
            </Card>
          );
        })}
      </div>

      {selectedProduct ? (
        <ProductDetailDialog
          product={selectedProduct}
          onClose={() => setSelectedProductId(null)}
        />
      ) : null}
    </>
  );
}

function ProductDetailDialog({
  product,
  onClose
}: {
  product: Product;
  onClose: () => void;
}) {
  const summary = getProductSummary(product);
  const [isEditing, setIsEditing] = useState(false);

  return (
    <div className="fixed inset-0 z-50 bg-black/40 p-3 sm:p-6" role="dialog" aria-modal>
      <div className="mx-auto flex max-h-[92vh] max-w-3xl flex-col overflow-hidden rounded-lg bg-white shadow-xl">
        <div className="flex items-start justify-between gap-3 border-b border-zinc-200 p-4">
          <div>
            <p className="text-xs font-semibold uppercase text-zinc-500">
              ລາຍລະອຽດສິນຄ້າ
            </p>
            <h3 className="mt-1 text-xl font-bold text-zinc-950">{product.name}</h3>
            <p className="text-sm text-zinc-500">{product.category}</p>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="flex h-10 w-10 items-center justify-center rounded-md hover:bg-zinc-100"
            aria-label="Close"
          >
            <X className="h-5 w-5" aria-hidden />
          </button>
        </div>

        <div className="grid gap-4 overflow-y-auto p-4 md:grid-cols-[16rem_1fr]">
          <div>
            <div className="relative aspect-square overflow-hidden rounded-md bg-zinc-100">
              {product.imageUrl ? (
                <Image
                  src={product.imageUrl}
                  alt={product.name}
                  fill
                  sizes="16rem"
                  className="object-cover"
                />
              ) : (
                <div className="flex h-full items-center justify-center text-sm text-zinc-400">
                  ບໍ່ມີຮູບ
                </div>
              )}
            </div>
            <div className="mt-3 grid grid-cols-3 gap-2 rounded-md bg-zinc-50 p-3 text-center text-xs">
              <div>
                <p className="text-zinc-500">ຂະໜາດ</p>
                <p className="font-bold text-zinc-950">{summary.variantCount}</p>
              </div>
              <div>
                <p className="text-zinc-500">ສະຕ໋ອກ</p>
                <p
                  className={cn(
                    "font-bold",
                    summary.lowStock ? "text-rose-700" : "text-zinc-950"
                  )}
                >
                  {summary.totalStock}
                </p>
              </div>
              <div>
                <p className="text-zinc-500">ສະຖານະ</p>
                <p className="font-bold text-zinc-950">
                  {product.isActive ? "ເປີດ" : "ປິດ"}
                </p>
              </div>
            </div>
          </div>

          <div className="grid gap-4">
            <div className="flex items-center gap-2 text-sm font-bold text-zinc-950">
              <Tags className="h-4 w-4" aria-hidden />
              ຂະໜາດ ແລະ ລາຄາ
            </div>
            <div className="grid gap-2">
              {summary.variants.map((variant) => {
                const variantLowStock = variant.stock <= variant.lowStockAlert;

                return (
                  <div
                    key={variant.id}
                    className="rounded-md border border-zinc-200 p-3"
                  >
                    <div className="flex items-start justify-between gap-3">
                      <div>
                        <p className="font-bold text-zinc-950">
                          {formatProductVariantName(product.name, variant.name)}
                        </p>
                        <p className="text-sm text-zinc-500">
                          {variant.sku}
                          {variant.unit ? ` · ${variant.unit}` : ""}
                        </p>
                      </div>
                      {variantLowStock ? (
                        <Badge className="border-rose-200 bg-rose-100 text-rose-800">
                          ໃກ້ໝົດ
                        </Badge>
                      ) : null}
                    </div>
                    <div className="mt-3 grid grid-cols-2 gap-2 text-sm sm:grid-cols-4">
                      <InfoBlock label="ຕົ້ນທຶນ" value={formatCurrency(variant.costPrice)} />
                      <InfoBlock label="ລາຄາຂາຍ" value={formatCurrency(variant.sellPrice)} />
                      <InfoBlock
                        label="ກໍາໄລ/ຊິ້ນ"
                        value={formatCurrency(variant.sellPrice - variant.costPrice)}
                        valueClassName="text-emerald-700"
                      />
                      <InfoBlock
                        label="ສະຕ໋ອກ"
                        value={`${variant.stock}`}
                        valueClassName={variantLowStock ? "text-rose-700" : undefined}
                      />
                    </div>
                    <form
                      action={updateProductVariantStock}
                      className="mt-3 grid grid-cols-[1fr_auto] gap-2"
                    >
                      <input type="hidden" name="productId" value={product.id} />
                      <input type="hidden" name="variantId" value={variant.id} />
                      <Input
                        name="quantity"
                        type="number"
                        min={1}
                        defaultValue={1}
                        aria-label={`ເພີ່ມສະຕ໋ອກ ${variant.name}`}
                      />
                      <Button type="submit" variant="secondary" className="px-3">
                        <PackagePlus className="h-4 w-4" aria-hidden />
                        ເພີ່ມ
                      </Button>
                    </form>
                  </div>
                );
              })}
            </div>

            {!isEditing ? (
              <Button
                type="button"
                variant="secondary"
                className="w-full border-t border-zinc-100"
                onClick={() => setIsEditing(true)}
              >
                <Edit3 className="h-4 w-4" aria-hidden />
                ແກ້ໄຂຂໍ້ມູນສິນຄ້າ
              </Button>
            ) : null}

            <form
              action={updateProductInfo}
              className={cn(
                "gap-3 border-t border-zinc-100 pt-3",
                isEditing ? "grid" : "hidden"
              )}
            >
              <input type="hidden" name="productId" value={product.id} />
              <input
                type="hidden"
                name="currentImageUrl"
                value={product.imageUrl ?? ""}
              />
              <p className="flex items-center gap-2 text-sm font-bold text-zinc-950">
                <Edit3 className="h-4 w-4" aria-hidden />
                ແກ້ໄຂຂໍ້ມູນສິນຄ້າ
              </p>
              <Button
                type="button"
                variant="ghost"
                className="w-full"
                onClick={() => setIsEditing(false)}
              >
                ປິດຟອມແກ້ໄຂ
              </Button>
              <div className="grid gap-3 sm:grid-cols-2">
                <label className="space-y-1.5">
                  <span className="text-xs font-semibold text-zinc-500">
                    ຊື່ສິນຄ້າ
                  </span>
                  <Input name="name" defaultValue={product.name} required />
                </label>
                <label className="space-y-1.5">
                  <span className="text-xs font-semibold text-zinc-500">
                    ໝວດໝູ່
                  </span>
                  <Input name="category" defaultValue={product.category} required />
                </label>
                <label className="space-y-1.5 sm:col-span-2">
                  <span className="text-xs font-semibold text-zinc-500">
                    ຮູບສິນຄ້າ
                  </span>
                  <input
                    type="file"
                    name="productImage"
                    accept="image/*"
                    className="w-full rounded-md border border-zinc-200 bg-white px-3 py-2 text-sm file:mr-3 file:rounded-md file:border-0 file:bg-zinc-950 file:px-3 file:py-2 file:text-sm file:font-semibold file:text-white"
                  />
                </label>
                <label className="flex min-h-11 items-center gap-2 rounded-md border border-zinc-200 px-3 text-sm font-semibold text-zinc-700 sm:col-span-2">
                  <input
                    type="checkbox"
                    name="isActive"
                    defaultChecked={product.isActive}
                    className="h-4 w-4"
                  />
                  ເປີດການຂາຍ
                </label>
              </div>

              <div className="grid gap-2">
                {summary.variants.map((variant, index) => (
                  <div
                    key={`edit-${variant.id}`}
                    className="grid gap-2 rounded-md border border-zinc-200 p-3"
                  >
                    <input type="hidden" name="variantId" value={variant.id} />
                    <p className="text-xs font-bold uppercase text-zinc-500">
                      ຂະໜາດ {index + 1}
                    </p>
                    <div className="grid gap-2 sm:grid-cols-2">
                      <label className="space-y-1.5">
                        <span className="text-xs font-semibold text-zinc-500">
                          ຊື່ຂະໜາດ
                        </span>
                        <Input
                          name="variantName"
                          defaultValue={variant.name}
                          required
                        />
                      </label>
                      <label className="space-y-1.5">
                        <span className="text-xs font-semibold text-zinc-500">
                          SKU / Barcode
                        </span>
                        <Input
                          name="variantSku"
                          defaultValue={variant.sku}
                          autoComplete="off"
                          required
                        />
                      </label>
                      <label className="space-y-1.5">
                        <span className="text-xs font-semibold text-zinc-500">
                          ຫົວໜ່ວຍ
                        </span>
                        <Input
                          name="variantUnit"
                          defaultValue={variant.unit ?? ""}
                        />
                      </label>
                      <label className="space-y-1.5">
                        <span className="text-xs font-semibold text-zinc-500">
                          ຕົ້ນທຶນ
                        </span>
                        <MoneyInput
                          name="variantCostPrice"
                          min={0}
                          defaultValue={variant.costPrice}
                          required
                        />
                      </label>
                      <label className="space-y-1.5">
                        <span className="text-xs font-semibold text-zinc-500">
                          ລາຄາຂາຍ
                        </span>
                        <MoneyInput
                          name="variantSellPrice"
                          min={0}
                          defaultValue={variant.sellPrice}
                          required
                        />
                      </label>
                      <label className="space-y-1.5">
                        <span className="text-xs font-semibold text-zinc-500">
                          ສະຕ໋ອກ
                        </span>
                        <Input
                          name="variantStock"
                          type="number"
                          min={0}
                          defaultValue={variant.stock}
                          required
                        />
                      </label>
                      <label className="space-y-1.5 sm:col-span-2">
                        <span className="text-xs font-semibold text-zinc-500">
                          ແຈ້ງເຕືອນໃກ້ໝົດ
                        </span>
                        <Input
                          name="variantLowStockAlert"
                          type="number"
                          min={0}
                          defaultValue={variant.lowStockAlert}
                          required
                        />
                      </label>
                    </div>
                  </div>
                ))}
              </div>

              <Button type="submit" variant="secondary" className="w-full">
                <Save className="h-4 w-4" aria-hidden />
                ບັນທຶກການແກ້ໄຂ
              </Button>
            </form>
          </div>
        </div>
      </div>
    </div>
  );
}

function InfoBlock({
  label,
  value,
  valueClassName
}: {
  label: string;
  value: string;
  valueClassName?: string;
}) {
  return (
    <div className="rounded-md bg-zinc-50 p-2">
      <p className="text-xs text-zinc-500">{label}</p>
      <p className={cn("mt-1 font-bold text-zinc-950", valueClassName)}>{value}</p>
    </div>
  );
}
