import { getOrders } from "@/actions/order.action";
import { getStoreSettings } from "@/actions/settings.action";
import { PageHeader } from "@/components/layout/page-header";
import { OrderList } from "@/components/orders/order-list";

export default async function OrdersPage() {
  const [orders, storeSettings] = await Promise.all([
    getOrders(),
    getStoreSettings()
  ]);

  return (
    <section>
      <PageHeader
        title="ອໍເດີ"
        description="ລາຍການອໍເດີຫຼັກ ແລະ ສ້າງອໍເດີໃໝ່"
        actionHref="/orders/new"
        actionLabel="ສ້າງອໍເດີ"
      />
      <OrderList orders={orders} storeSettings={storeSettings} />
    </section>
  );
}
