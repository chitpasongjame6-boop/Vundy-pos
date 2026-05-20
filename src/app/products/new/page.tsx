import { PageHeader } from "@/components/layout/page-header";
import { ProductForm } from "@/components/products/product-form";
import { getCategories } from "@/actions/settings.action";

export default async function NewProductPage() {
  const categories = await getCategories();

  return (
    <section>
      <PageHeader
        title="ເພີ່ມສິນຄ້າ"
        description="ປ້ອນຂໍ້ມູນສິນຄ້າ ຕົ້ນທຶນ ລາຄາຂາຍ ຈໍານວນສະຕ໋ອກ ແລະ ຮູບພາບ"
      />
      <ProductForm categories={categories} />
    </section>
  );
}
