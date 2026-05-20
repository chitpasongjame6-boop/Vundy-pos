import { getOrders } from "@/actions/order.action";
import { getProductCategories } from "@/actions/product.action";
import { getStoreSettings } from "@/actions/settings.action";
import { PageHeader } from "@/components/layout/page-header";
import { OrderFilters, OrderList } from "@/components/orders/order-list";
import type { OrderStatus } from "@/types";

type PageProps = {
  searchParams?: Promise<{
    search?: string;
    category?: string;
    status?: string;
    date?: string;
  }>;
};

const orderStatuses: OrderStatus[] = [
  "PENDING_PACK",
  "PACKED",
  "SHIPPED",
  "CANCELLED",
  "RETURNED"
];

export default async function OrderHistoryPage({ searchParams }: PageProps) {
  const params = await searchParams;
  const status = parseStatus(params?.status);
  const [orders, categories, storeSettings] = await Promise.all([
    getOrders({
      search: params?.search,
      category: params?.category,
      status,
      date: params?.date
    }),
    getProductCategories(),
    getStoreSettings()
  ]);

  return (
    <section>
      <PageHeader
        title="ປະຫວັດອໍເດີ"
        description="ຄົ້ນຫາ ກອງຕາມໝວດໝູ່ ແລະ ກວດປະຫວັດອໍເດີທັງໝົດ"
      />
      <OrderFilters
        search={params?.search}
        category={params?.category}
        status={status}
        date={params?.date}
        categories={categories}
      />
      <OrderList orders={orders} showHistoryActions storeSettings={storeSettings} />
    </section>
  );
}

function parseStatus(value?: string): OrderStatus | "ALL" {
  if (!value || value === "ALL") {
    return "ALL";
  }

  return orderStatuses.includes(value as OrderStatus)
    ? (value as OrderStatus)
    : "ALL";
}
