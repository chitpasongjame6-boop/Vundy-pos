import { catalogProviders, catalogSourceUrl, isCatalogBarcode, type CatalogAttribution } from "@/lib/product-catalog";

export function CatalogAttributionNote({ source }: { source?: CatalogAttribution | null }) {
  if (!source || !Object.hasOwn(catalogProviders, source.provider) || !isCatalogBarcode(source.barcode)) return null;
  return (
    <p className="text-xs leading-5 text-slate-500">
      ຂໍ້ມູນອ້າງອີງ: <a className="underline" href={catalogSourceUrl(source.provider, source.barcode)} target="_blank" rel="noreferrer">
        {catalogProviders[source.provider].name} · {source.barcode}
      </a>{" · "}
      <a className="underline" href="https://opendatacommons.org/licenses/odbl/1-0/" target="_blank" rel="noreferrer">ODbL</a>
      {source.imageImported ? <>{" · ຮູບ: "}<a className="underline" href="https://creativecommons.org/licenses/by-sa/3.0/" target="_blank" rel="noreferrer">CC BY-SA 3.0</a>{" (ປັບຂະໜາດ / WebP)"}</> : null}
    </p>
  );
}
