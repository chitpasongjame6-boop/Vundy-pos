import { getProducts } from "@/actions/product.action";
import { getCurrentUser } from "@/lib/auth";
import { getShopDate } from "@/lib/product-expiry";
import { buildProductPriceCsv } from "@/lib/product-export";

export async function GET() {
  const user = await getCurrentUser();
  if (!user) {
    return Response.json({ message: "Authentication required" }, { status: 401 });
  }
  if (user.role !== "OWNER") {
    return Response.json({ message: "Owner access required" }, { status: 403 });
  }

  try {
    // Export the complete catalogue, not only the first 80 cards or the current filter.
    const products = await getProducts({ activeOnly: false });
    return new Response(buildProductPriceCsv(products), {
      headers: {
        "content-type": "text/csv; charset=utf-8",
        "content-disposition": `attachment; filename="product-prices-${getShopDate()}.csv"`,
        "cache-control": "private, no-store",
        "x-content-type-options": "nosniff"
      }
    });
  } catch {
    return Response.json(
      { message: "Unable to export products. Please try again." },
      { status: 500, headers: { "cache-control": "no-store" } }
    );
  }
}
