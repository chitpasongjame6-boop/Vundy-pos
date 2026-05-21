import { ListChecks, PlusSquare, Search } from "lucide-react";
import { getProductCategories, getProducts } from "@/actions/product.action";
import { BarcodePrintButton } from "@/components/barcodes/barcode-print-button";
import { PageHeader } from "@/components/layout/page-header";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Input, Select } from "@/components/ui/input";
import { getProductVariants } from "@/lib/utils";

type PageProps = {
  searchParams?: Promise<{
    search?: string;
    category?: string;
    mode?: string;
    manualName?: string;
    manualVariant?: string;
    manualCode?: string;
  }>;
};

const code39: Record<string, string> = {
  "0": "nnnwwnwnn",
  "1": "wnnwnnnnw",
  "2": "nnwwnnnnw",
  "3": "wnwwnnnnn",
  "4": "nnnwwnnnw",
  "5": "wnnwwnnnn",
  "6": "nnwwwnnnn",
  "7": "nnnwnnwnw",
  "8": "wnnwnnwnn",
  "9": "nnwwnnwnn",
  A: "wnnnnwnnw",
  B: "nnwnnwnnw",
  C: "wnwnnwnnn",
  D: "nnnnwwnnw",
  E: "wnnnwwnnn",
  F: "nnwnwwnnn",
  G: "nnnnnwwnw",
  H: "wnnnnwwnn",
  I: "nnwnnwwnn",
  J: "nnnnwwwnn",
  K: "wnnnnnnww",
  L: "nnwnnnnww",
  M: "wnwnnnnwn",
  N: "nnnnwnnww",
  O: "wnnnwnnwn",
  P: "nnwnwnnwn",
  Q: "nnnnnnwww",
  R: "wnnnnnwwn",
  S: "nnwnnnwwn",
  T: "nnnnwnwwn",
  U: "wwnnnnnnw",
  V: "nwwnnnnnw",
  W: "wwwnnnnnn",
  X: "nwnnwnnnw",
  Y: "wwnnwnnnn",
  Z: "nwwnwnnnn",
  "-": "nwnnnnwnw",
  ".": "wwnnnnwnn",
  " ": "nwwnnnwnn",
  $: "nwnwnwnnn",
  "/": "nwnwnnnwn",
  "+": "nwnnnwnwn",
  "%": "nnnwnwnwn",
  "*": "nwnnwnwnn"
};

export default async function BarcodesPage({ searchParams }: PageProps) {
  const params = await searchParams;
  const mode = params?.mode === "manual" ? "manual" : "products";
  const [products, categories] = await Promise.all([
    getProducts({
      search: params?.search,
      category: params?.category,
      activeOnly: false
    }),
    getProductCategories()
  ]);
  const productLabels = products
    .filter((product) => product.isActive)
    .flatMap((product) =>
      getProductVariants(product).map((variant) => ({
        id: `${product.id}-${variant.id}`,
        name: product.name,
        variantName: variant.name,
        barcodeValue: normalizeCode39(variant.sku || product.sku)
      }))
    );
  const manualLabel = buildManualLabel(params);
  const labels = mode === "manual" ? (manualLabel ? [manualLabel] : []) : productLabels;

  return (
    <section>
      <div className="print:hidden">
        <PageHeader
          title="ພິມສະຕິກເກີ Barcode"
          description="ສ້າງ barcode ຈາກ SKU ເພື່ອພິມຕິດສິນຄ້າ ແລະໃຊ້ສະແກນໄດ້"
        />
        <div className="mb-4 grid gap-3 lg:grid-cols-[auto_1fr_auto]">
          <div className="grid grid-cols-2 gap-2 rounded-md border border-zinc-200 bg-white p-1">
            <a
              href="/barcodes"
              className={
                mode === "products"
                  ? "flex min-h-10 items-center justify-center gap-2 rounded-md bg-zinc-950 px-3 text-sm font-semibold text-white"
                  : "flex min-h-10 items-center justify-center gap-2 rounded-md px-3 text-sm font-semibold text-zinc-700 hover:bg-zinc-100"
              }
            >
              <ListChecks className="h-4 w-4" aria-hidden />
              ລາຍການສິນຄ້າ
            </a>
            <a
              href="/barcodes?mode=manual"
              className={
                mode === "manual"
                  ? "flex min-h-10 items-center justify-center gap-2 rounded-md bg-zinc-950 px-3 text-sm font-semibold text-white"
                  : "flex min-h-10 items-center justify-center gap-2 rounded-md px-3 text-sm font-semibold text-zinc-700 hover:bg-zinc-100"
              }
            >
              <PlusSquare className="h-4 w-4" aria-hidden />
              ສ້າງເອງ
            </a>
          </div>

          {mode === "manual" ? (
            <ManualBarcodeForm params={params} />
          ) : (
            <ProductBarcodeFilters
              categories={categories}
              search={params?.search}
              category={params?.category}
            />
          )}

          <BarcodePrintButton disabled={!labels.length} />
        </div>
      </div>

      {labels.length ? (
        <div className="barcode-sheet grid gap-3 sm:grid-cols-2 lg:grid-cols-3 print:grid-cols-3 print:gap-0">
          {labels.map((label) => (
            <Card
              key={label.id}
              className="barcode-label break-inside-avoid overflow-hidden print:rounded-none print:border-zinc-950 print:shadow-none"
            >
              <CardContent className="space-y-1 p-3 text-center print:p-2">
                <p className="line-clamp-1 text-sm font-bold text-zinc-950">
                  {label.name}
                </p>
                <p className="line-clamp-1 text-xs text-zinc-600">
                  {label.variantName}
                </p>
                <Code39Barcode value={label.barcodeValue} />
                <p className="text-xs font-bold tracking-wider">{label.barcodeValue}</p>
              </CardContent>
            </Card>
          ))}
        </div>
      ) : (
        <Card>
          <CardContent>
            <p className="text-sm text-zinc-500">
              {mode === "manual"
                ? "ກະລຸນາປ້ອນຊື່ ແລະລະຫັດ barcode ເພື່ອສ້າງສະຕິກເກີ"
                : "ບໍ່ພົບສິນຄ້າສໍາລັບພິມ barcode"}
            </p>
          </CardContent>
        </Card>
      )}
    </section>
  );
}

function ProductBarcodeFilters({
  categories,
  search,
  category
}: {
  categories: string[];
  search?: string;
  category?: string;
}) {
  return (
    <form className="grid gap-3 md:grid-cols-[1fr_14rem_auto]">
      <label className="relative">
        <Search className="pointer-events-none absolute left-3 top-3 h-5 w-5 text-zinc-400" />
        <Input
          name="search"
          defaultValue={search}
          placeholder="ຄົ້ນຫາສິນຄ້າ ຫຼື SKU"
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
      <Button type="submit" variant="secondary">
        ຄົ້ນຫາ
      </Button>
    </form>
  );
}

function ManualBarcodeForm({
  params
}: {
  params?: {
    manualName?: string;
    manualVariant?: string;
    manualCode?: string;
  };
}) {
  return (
    <form className="grid gap-3 md:grid-cols-[1fr_12rem_12rem_auto]">
      <input type="hidden" name="mode" value="manual" />
      <Input
        name="manualName"
        defaultValue={params?.manualName ?? ""}
        placeholder="ຊື່ສິນຄ້າ"
        required
      />
      <Input
        name="manualVariant"
        defaultValue={params?.manualVariant ?? ""}
        placeholder="ຂະໜາດ / ຮຸ່ນ"
      />
      <Input
        name="manualCode"
        defaultValue={params?.manualCode ?? ""}
        placeholder="ລະຫັດ barcode"
        required
      />
      <Button type="submit" variant="secondary">
        ສ້າງ
      </Button>
    </form>
  );
}

function buildManualLabel(
  params?: {
    manualName?: string;
    manualVariant?: string;
    manualCode?: string;
  }
) {
  const name = params?.manualName?.trim();
  const code = params?.manualCode?.trim();

  if (!name || !code) {
    return null;
  }

  const barcodeValue = normalizeCode39(code);

  if (!barcodeValue) {
    return null;
  }

  return {
    id: `manual-${barcodeValue}`,
    name,
    variantName: params?.manualVariant?.trim() || "ສ້າງເອງ",
    barcodeValue
  };
}

function Code39Barcode({ value }: { value: string }) {
  const bars = buildCode39Bars(value);
  const height = 52;

  return (
    <svg
      viewBox={`0 0 ${bars.width} ${height}`}
      className="mx-auto h-14 w-full max-w-[12rem]"
      role="img"
      aria-label={`Barcode ${value}`}
    >
      <rect width={bars.width} height={height} fill="#ffffff" />
      {bars.rects.map((rect, index) => (
        <rect
          key={index}
          x={rect.x}
          y={0}
          width={rect.width}
          height={height}
          fill="#000000"
        />
      ))}
    </svg>
  );
}

function buildCode39Bars(value: string) {
  const encoded = `*${value}*`;
  let x = 0;
  const rects: Array<{ x: number; width: number }> = [];

  for (const char of encoded) {
    const pattern = code39[char] ?? code39["-"];

    [...pattern].forEach((part, index) => {
      const width = part === "w" ? 3 : 1;

      if (index % 2 === 0) {
        rects.push({ x, width });
      }

      x += width;
    });

    x += 1;
  }

  return { rects, width: x };
}

function normalizeCode39(value: string) {
  return value
    .toUpperCase()
    .replace(/[^0-9A-Z ./$+%-]/g, "-")
    .slice(0, 24);
}
