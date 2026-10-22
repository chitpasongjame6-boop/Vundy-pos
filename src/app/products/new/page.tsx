import { PageHeader } from "@/components/layout/page-header";
import { ProductForm } from "@/components/products/product-form";
import { getCategories, getStoreSettings } from "@/actions/settings.action";

export default async function NewProductPage() {
  const [categories, settings] = await Promise.all([getCategories(), getStoreSettings()]);

  return (
    <section>
      <PageHeader
        title="ເພີ່ມສິນຄ້າ"
        description="ສ້າງສິນຄ້າໃໝ່ຕາມ 3 ຂັ້ນຕອນ: ຂໍ້ມູນ, ຮູບແບບການຂາຍ, ລາຄາ ແລະ ສະຕ໋ອກ"
      />
      <ProductForm categories={categories} purchaseRate={settings.thbPurchaseRate} />
    </section>
  );
}
