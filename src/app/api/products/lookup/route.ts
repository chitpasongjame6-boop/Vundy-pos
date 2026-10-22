import { getCurrentUser } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { readLocalStore } from "@/lib/local-store";
import { isCatalogBarcode, type ProductLookupResponse } from "@/lib/product-catalog";
import { lookupCatalogProduct, signCatalogProduct } from "@/lib/product-catalog.server";

export const runtime = "nodejs";

export async function GET(request: Request) {
  const reply = (body: ProductLookupResponse, status = 200) => Response.json(body, {
    status, headers: { "Cache-Control": "private, no-store", Vary: "Cookie" }
  });
  const user = await getCurrentUser();
  if (!user) return reply({ status: "unauthorized" }, 401);
  if (user.role !== "OWNER") return reply({ status: "forbidden" }, 403);
  const barcode = new URL(request.url).searchParams.get("barcode")?.trim() ?? "";
  if (!barcode || barcode.length > 128) return reply({ status: "invalid" }, 400);
  try {
    const existing = process.env.DATABASE_URL
      ? await prisma.product.findFirst({
        where: { OR: [
          { sku: { equals: barcode, mode: "insensitive" } },
          { variants: { some: { sku: { equals: barcode, mode: "insensitive" } } } }
        ] }, select: { name: true }
      })
      : (await readLocalStore()).products.find(product =>
        [product.sku, ...(product.variants ?? []).map(variant => variant.sku)]
          .some(sku => sku.trim().toLowerCase() === barcode.toLowerCase()));
    if (existing) return reply({ status: "existing", name: existing.name, barcode });
    if (!isCatalogBarcode(barcode)) return reply({ status: "invalid" });
    const result = await lookupCatalogProduct(barcode);
    return reply(result.status === "found" ? { ...result, token: signCatalogProduct(result.product) } : result);
  } catch {
    return reply({ status: "unavailable" }, 503);
  }
}
