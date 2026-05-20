import { getProducts } from "@/actions/product.action";
import { getStoreSettings } from "@/actions/settings.action";
import { PageHeader } from "@/components/layout/page-header";
import { OrderForm } from "@/components/orders/order-form";

export default async function NewOrderPage() {
  const [products, storeSettings] = await Promise.all([
    getProducts({ activeOnly: true }),
    getStoreSettings()
  ]);

  return (
    <section>
      <PageHeader
        title="ສ້າງອໍເດີ"
        description="ກວດສະຕ໋ອກ ຄໍານວນຍອດຂາຍ ຕົ້ນທຶນ ກໍາໄລ ແລະ ຕັ້ງສະຖານະເປັນລໍຖ້າແພັກ"
      />
      <OrderForm
        products={products}
        shippingCompanies={storeSettings.shippingCompanies}
      />
    </section>
  );
}
