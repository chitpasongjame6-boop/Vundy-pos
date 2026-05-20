import { getProductCategories, getProducts } from "@/actions/product.action";
import { PageHeader } from "@/components/layout/page-header";
import { ProductFilters, ProductGrid } from "@/components/products/product-grid";

type PageProps = {
  searchParams?: Promise<{
    search?: string;
    category?: string;
  }>;
};

export default async function ProductsPage({ searchParams }: PageProps) {
  const params = await searchParams;
  const [products, categories] = await Promise.all([
    getProducts({
      search: params?.search,
      category: params?.category,
      activeOnly: false
    }),
    getProductCategories()
  ]);

  return (
    <section>
      <PageHeader
        title="ສິນຄ້າ"
        description="ຄົ້ນຫາ ກອງໝວດໝູ່ ເບິ່ງສະຕ໋ອກ ແລະ ຈັດການສິນຄ້າທັງໝົດ"
        actionHref="/products/new"
        actionLabel="ເພີ່ມສິນຄ້າ"
      />
      <ProductFilters
        categories={categories}
        search={params?.search}
        category={params?.category}
      />
      <ProductGrid products={products} />
    </section>
  );
}
