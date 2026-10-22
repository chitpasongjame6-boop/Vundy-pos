import { createHmac, timingSafeEqual } from "node:crypto";
import {
  catalogProviders, catalogSourceUrl, isCatalogBarcode, safeCatalogImageUrl,
  type CatalogProduct, type CatalogProvider, type CatalogResult
} from "./product-catalog";
import { MAX_PRODUCT_IMAGE_BYTES, ProductImageError } from "./product-image";

const fields = "code,product_type,product_name,product_name_lo,product_name_th,product_name_en,brands,quantity,categories,categories_tags,image_front_url,image_url";
const cache = new Map<string, { until: number; result: CatalogResult }>();
const inFlight = new Map<string, Promise<CatalogResult>>();
let requests: number[] = [];
let blockedUntil = 0;

function userAgent() {
  return process.env.PRODUCT_LOOKUP_USER_AGENT?.trim() ||
    "VundyPOS/0.1 (https://github.com/chitpasongjame6-boop/Vundy-pos)";
}

function takeRequest(): number {
  const now = Date.now();
  requests = requests.filter(time => now - time < 60_000);
  const next = Math.max(blockedUntil, requests.length >= 15 ? requests[0] + 60_000 : 0);
  if (next > now) return Math.ceil((next - now) / 1000);
  requests.push(now);
  return 0;
}

async function limitedBody(response: Response, max: number) {
  if (Number(response.headers.get("content-length")) > max) {
    await response.body?.cancel();
    throw new Error("Response too large");
  }
  const reader = response.body?.getReader();
  if (!reader) throw new Error("Empty response");
  const chunks: Uint8Array[] = [];
  let size = 0;
  try {
    while (true) {
      const { done, value } = await reader.read();
      if (done) break;
      size += value.byteLength;
      if (size > max) { await reader.cancel(); throw new Error("Response too large"); }
      chunks.push(value);
    }
  } finally { reader.releaseLock(); }
  return Buffer.concat(chunks);
}

function cleanText(value: unknown, max = 200) {
  return typeof value === "string"
    ? value.replace(/<[^>]*>/g, "").replace(/[\p{Cc}\p{Cf}]/gu, " ").trim().slice(0, max)
    : "";
}

function record(value: unknown): Record<string, unknown> {
  return value && typeof value === "object" && !Array.isArray(value) ? value as Record<string, unknown> : {};
}

async function fetchProduct(barcode: string): Promise<CatalogResult> {
  const signal = AbortSignal.timeout(8_000);
  let url = new URL(`https://world.openfoodfacts.org/api/v3/product/${barcode}`);
  url.searchParams.set("product_type", "all");
  url.searchParams.set("fields", fields);
  try {
    for (let hop = 0; hop < 4; hop++) {
      const wait = takeRequest();
      if (wait) return { status: "rate_limited", retryAfter: wait };
      const response = await fetch(url, {
        headers: { "User-Agent": userAgent(), Accept: "application/json" },
        cache: "no-store", redirect: "manual", signal
      });
      if ([301, 302, 303, 307, 308].includes(response.status)) {
        await response.body?.cancel();
        const location = response.headers.get("location");
        if (!location) throw new Error("Missing redirect");
        const next = new URL(location, url);
        // Never forward a redirect to another host, protocol, port or API path.
        const code = next.pathname.match(/^\/api\/v3(?:\.\d+)?\/product\/(\d+)(?:\.json)?$/)?.[1];
        if (next.protocol !== "https:" || next.port || next.username || next.password ||
            !Object.values(catalogProviders).some(provider => provider.host === next.hostname) ||
            !code || code.padStart(14, "0") !== barcode.padStart(14, "0")) throw new Error("Unsafe redirect");
        next.search = "";
        next.searchParams.set("product_type", "all");
        next.searchParams.set("fields", fields);
        url = next;
        continue;
      }
      if (response.status === 404) { await response.body?.cancel(); return { status: "not_found" }; }
      if (response.status === 429) {
        const retryAfter = Math.min(3600, Math.max(60, Number(response.headers.get("retry-after")) || 60));
        blockedUntil = Date.now() + retryAfter * 1000;
        await response.body?.cancel();
        return { status: "rate_limited", retryAfter };
      }
      if (!response.ok) { await response.body?.cancel(); throw new Error("Catalog unavailable"); }
      const body = record(JSON.parse((await limitedBody(response, 512 * 1024)).toString("utf8")));
      const product = record(body.product);
      if (!Object.keys(product).length) {
        if (body.status === 0 || (Array.isArray(body.errors) && body.errors.some(error =>
          record(record(error).message).id === "product_not_found"))) return { status: "not_found" };
        throw new Error("Unexpected catalog response");
      }
      const code = cleanText(product.code ?? body.code, 14);
      if (!isCatalogBarcode(code) || code.padStart(14, "0") !== barcode.padStart(14, "0")) throw new Error("Barcode mismatch");
      const provider = (Object.keys(catalogProviders) as CatalogProvider[]).find(key =>
        catalogProviders[key].host === url.hostname) ?? "food";
      const type = product.product_type;
      const source = typeof type === "string" && Object.hasOwn(catalogProviders, type) ? type as CatalogProvider : provider;
      const categories = cleanText(product.categories, 1000).split(",").map(value => value.trim()).filter(Boolean);
      const tags = Array.isArray(product.categories_tags) ? product.categories_tags : [];
      return { status: "found", product: {
        barcode,
        name: cleanText(product.product_name_lo) || cleanText(product.product_name_th) || cleanText(product.product_name) || cleanText(product.product_name_en),
        brand: cleanText(product.brands),
        quantity: cleanText(product.quantity, 80),
        category: (categories.at(-1) || cleanText(tags.at(-1)).replace(/-/g, " ")).replace(/^[a-z]{2}:/, "").slice(0, 120),
        imageUrl: safeCatalogImageUrl(product.image_front_url) ?? safeCatalogImageUrl(product.image_url),
        provider: source, sourceUrl: catalogSourceUrl(source, code), retrievedAt: new Date().toISOString()
      } };
    }
  } catch { /* External errors must not prevent manual product entry. */ }
  return { status: "unavailable" };
}

export async function lookupCatalogProduct(barcode: string): Promise<CatalogResult> {
  if (!isCatalogBarcode(barcode)) return { status: "invalid" };
  const cached = cache.get(barcode);
  if (cached && cached.until > Date.now()) return cached.result;
  const pending = inFlight.get(barcode);
  if (pending) return pending;
  const task = fetchProduct(barcode).then(result => {
    if (result.status === "found" || result.status === "not_found") {
      if (cache.size >= 250) cache.delete(cache.keys().next().value!);
      cache.set(barcode, { result, until: Date.now() + (result.status === "found" ? 86_400_000 : 600_000) });
    }
    return result;
  }).finally(() => inFlight.delete(barcode));
  inFlight.set(barcode, task);
  return task;
}

function signature(payload: string) {
  const secret = process.env.SESSION_SECRET?.trim() || process.env.OWNER_PASSWORD?.trim();
  if (!secret) throw new Error("Session secret is required");
  return createHmac("sha256", `vundy-catalog-v1:${secret}`).update(payload).digest();
}

// A signed snapshot lets Save work without another catalog lookup, and prevents
// clients from choosing arbitrary image URLs for the server to download.
export function signCatalogProduct(product: CatalogProduct) {
  const payload = Buffer.from(JSON.stringify({ product, expires: Date.now() + 86_400_000 })).toString("base64url");
  return `${payload}.${signature(payload).toString("base64url")}`;
}

export function verifyCatalogProduct(value: string): CatalogProduct {
  try {
    if (value.length > 12_000) throw new Error();
    const [payload, sig, extra] = value.split(".");
    if (!payload || !sig || extra) throw new Error();
    const expected = signature(payload), actual = Buffer.from(sig, "base64url");
    if (actual.length !== expected.length || !timingSafeEqual(actual, expected)) throw new Error();
    const data = JSON.parse(Buffer.from(payload, "base64url").toString("utf8"));
    if (!Number.isFinite(data.expires) || data.expires <= Date.now() || !isCatalogBarcode(data.product?.barcode)) throw new Error();
    return data.product as CatalogProduct;
  } catch {
    throw new ProductImageError("ຂໍ້ມູນອ້າງອີງໝົດອາຍຸ ກະລຸນາກົດຄົ້ນຫາ Barcode ອີກຄັ້ງ");
  }
}

export async function downloadCatalogImage(product: CatalogProduct): Promise<File> {
  const url = safeCatalogImageUrl(product.imageUrl);
  try {
    if (!url) throw new Error("Invalid image");
    const response = await fetch(url, {
      headers: { "User-Agent": userAgent() }, cache: "no-store", redirect: "error", signal: AbortSignal.timeout(8_000)
    });
    if (!response.ok) { await response.body?.cancel(); throw new Error("Image unavailable"); }
    const type = response.headers.get("content-type")?.split(";")[0].trim() ?? "";
    if (!["image/jpeg", "image/png", "image/webp"].includes(type)) { await response.body?.cancel(); throw new Error("Invalid image type"); }
    const bytes = await limitedBody(response, MAX_PRODUCT_IMAGE_BYTES);
    return new File([new Uint8Array(bytes)], "catalog-image", { type });
  } catch {
    throw new ProductImageError("ດຶງຮູບບໍ່ໄດ້ ກະລຸນາລອງໃໝ່ ຫຼື ປິດການໃຊ້ຮູບຈາກຖານຂໍ້ມູນ ແລ້ວບັນທຶກອີກຄັ້ງ");
  }
}
