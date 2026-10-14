import { getPromotions } from "@/actions/promotion.action";
import { getProducts } from "@/actions/product.action";
import { PageHeader } from "@/components/layout/page-header";
import { PromotionManager } from "@/components/promotions/promotion-manager";
import { requireOwner } from "@/lib/auth";

export default async function PromotionsPage() {
  await requireOwner();
  const [workspace, products] = await Promise.all([getPromotions(), getProducts()]);
  return <section>
    <PageHeader title="ໂປຣໂມຊັນ" description="ກໍານົດລາຄາພິເສດຕາມສິນຄ້າ / ຂະໜາດ — POS ຄິດລາຄາໃຫ້ອັດຕະໂນມັດ" />
    <PromotionManager promotions={workspace.promotions} products={products} serverNow={workspace.serverNow} />
  </section>;
}
