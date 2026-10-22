export const catalogProviders = {
  food: { name: "Open Food Facts", host: "world.openfoodfacts.org" },
  beauty: { name: "Open Beauty Facts", host: "world.openbeautyfacts.org" },
  petfood: { name: "Open Pet Food Facts", host: "world.openpetfoodfacts.org" },
  product: { name: "Open Products Facts", host: "world.openproductsfacts.org" }
} as const;

export type CatalogProvider = keyof typeof catalogProviders;
export type CatalogProduct = {
  barcode: string;
  name: string;
  brand: string;
  quantity: string;
  category: string;
  imageUrl: string | null;
  provider: CatalogProvider;
  sourceUrl: string;
  retrievedAt: string;
};

export type CatalogAttribution = {
  provider: CatalogProvider;
  barcode: string;
  sourceUrl: string;
  retrievedAt: string;
  imageImported: boolean;
};

export type CatalogResult =
  | { status: "found"; product: CatalogProduct }
  | { status: "not_found" | "unavailable" | "invalid" }
  | { status: "rate_limited"; retryAfter: number };

export type ProductLookupResult = CatalogResult
  | { status: "existing"; name: string; barcode: string }
  | { status: "unauthorized" | "forbidden" };
export type ProductLookupResponse = ProductLookupResult & { token?: string };

// Only retail GTIN formats are sent outside the shop. Keep leading zeroes.
export function isCatalogBarcode(value: string) {
  return /^(?:\d{8}|\d{12}|\d{13}|\d{14})$/.test(value);
}

export function catalogSourceUrl(provider: CatalogProvider, barcode: string) {
  return `https://${catalogProviders[provider].host}/product/${barcode}`;
}

export function safeCatalogImageUrl(value: unknown): string | null {
  if (typeof value !== "string" || value.length > 1000) return null;
  try {
    const url = new URL(value);
    const hosts = ["images.openfoodfacts.org", "images.openbeautyfacts.org",
      "images.openpetfoodfacts.org", "images.openproductsfacts.org",
      "static.openfoodfacts.org", "static.openbeautyfacts.org",
      "static.openpetfoodfacts.org", "static.openproductsfacts.org"];
    if (url.protocol !== "https:" || !hosts.includes(url.hostname) || url.port ||
        url.username || url.password || url.search || url.hash ||
        !/^\/images\/products\/[\d/]+\/[a-zA-Z0-9_.-]+\.(?:jpg|jpeg|png|webp)$/.test(url.pathname)) return null;
    return url.href;
  } catch { return null; }
}

export function catalogProductName(product: CatalogProduct) {
  if (!product.name) return "";
  return product.brand && !product.name.toLowerCase().includes(product.brand.toLowerCase())
    ? `${product.brand} ${product.name}` : product.name;
}
