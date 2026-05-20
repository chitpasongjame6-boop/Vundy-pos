import { Search } from "lucide-react";
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
  const [products, categories] = await Promise.all([
    getProducts({
      search: params?.search,
      category: params?.category,
      activeOnly: false
    }),
    getProductCategories()
  ]);
  const labels = products
    .filter((product) => product.isActive)
    .flatMap((product) =>
      getProductVariants(product).map((variant) => ({
        product,
        variant,
        barcodeValue: normalizeCode39(variant.sku || product.sku)
      }))
    );

  return (
    <section>
      <div className="print:hidden">
        <PageHeader
          title="ພິມສະຕິກເກີ Barcode"
          description="ສ້າງ barcode ຈາກ SKU ເພື່ອພິມຕິດສິນຄ້າ ແລະໃຊ້ສະແກນໄດ້"
        />
        <form className="mb-4 grid gap-3 md:grid-cols-[1fr_14rem_auto_auto]">
          <label className="relative">
            <Search className="pointer-events-none absolute left-3 top-3 h-5 w-5 text-zinc-400" />
            <Input
              name="search"
              defaultValue={params?.search}
              placeholder="ຄົ້ນຫາສິນຄ້າ ຫຼື SKU"
              className="pl-10"
            />
          </label>
          <Select name="category" defaultValue={params?.category ?? ""}>
            <option value="">ທຸກໝວດໝູ່</option>
            {categories.map((category) => (
              <option key={category} value={category}>
                {category}
              </option>
            ))}
          </Select>
          <Button type="submit" variant="secondary">
            ຄົ້ນຫາ
          </Button>
          <BarcodePrintButton />
        </form>
      </div>

      {labels.length ? (
        <div className="barcode-sheet grid gap-3 sm:grid-cols-2 lg:grid-cols-3 print:grid-cols-3 print:gap-0">
          {labels.map(({ product, variant, barcodeValue }) => (
            <Card
              key={`${product.id}-${variant.id}`}
              className="barcode-label break-inside-avoid overflow-hidden print:rounded-none print:border-zinc-950 print:shadow-none"
            >
              <CardContent className="space-y-1 p-3 text-center print:p-2">
                <p className="line-clamp-1 text-sm font-bold text-zinc-950">
                  {product.name}
                </p>
                <p className="line-clamp-1 text-xs text-zinc-600">
                  {variant.name}
                </p>
                <Code39Barcode value={barcodeValue} />
                <p className="text-xs font-bold tracking-wider">{barcodeValue}</p>
              </CardContent>
            </Card>
          ))}
        </div>
      ) : (
        <Card>
          <CardContent>
            <p className="text-sm text-zinc-500">ບໍ່ພົບສິນຄ້າສໍາລັບພິມ barcode</p>
          </CardContent>
        </Card>
      )}
    </section>
  );
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
