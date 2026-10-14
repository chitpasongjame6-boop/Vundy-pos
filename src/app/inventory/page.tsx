import { Building2, ClipboardList, History, PackagePlus, Scale, Truck } from "lucide-react";
import {
  adjustInventory,
  createBranch,
  createExpense,
  createPurchaseOrder,
  createRegister,
  createSupplier,
  getInventoryWorkspace,
  receivePurchaseOrder
} from "@/actions/inventory.action";
import { PageHeader } from "@/components/layout/page-header";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input, Select, Textarea } from "@/components/ui/input";
import { MoneyInput } from "@/components/ui/money-input";
import { formatCurrency, formatDate, formatProductVariantName, getProductVariants } from "@/lib/utils";

export default async function InventoryPage() {
  const data = await getInventoryWorkspace();
  const productOptions = data.products.flatMap((product) =>
    getProductVariants(product).map((variant) => ({ product, variant }))
  );

  return (
    <section>
      <PageHeader
        title="ຈັດການສະຕ໋ອກ ແລະ ຮັບສິນຄ້າ"
        description="ຜູ້ສະໜອງ, ໃບສັ່ງຊື້, ຮັບເຂົ້າ, ປັບຍອດ ແລະ ກວດປະຫວັດຍ້ອນຫຼັງ"
      />

      <div className="grid gap-4 xl:grid-cols-4">
        <Card>
          <CardHeader><CardTitle className="flex items-center gap-2"><Truck className="h-5 w-5" />ຜູ້ສະໜອງ</CardTitle></CardHeader>
          <CardContent className="space-y-3">
            <form action={createSupplier} className="grid gap-2">
              <div className="grid grid-cols-2 gap-2"><Input name="code" placeholder="ລະຫັດ (ສ້າງເອງໄດ້)" /><Input name="name" placeholder="ຊື່ຜູ້ສະໜອງ" required /></div>
              <Input name="phone" placeholder="ເບີໂທ" /><Input name="address" placeholder="ທີ່ຢູ່" />
              <Button type="submit">ເພີ່ມຜູ້ສະໜອງ</Button>
            </form>
            <div className="space-y-2">{data.suppliers.map((supplier) => (
              <div key={supplier.id} className="rounded-xl border border-slate-200 p-3 text-sm"><p className="font-bold">{supplier.name}</p><p className="text-slate-500">{supplier.code} · {supplier.phone || "-"}</p></div>
            ))}</div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader><CardTitle className="flex items-center gap-2"><PackagePlus className="h-5 w-5" />ສ້າງໃບສັ່ງຊື້</CardTitle></CardHeader>
          <CardContent>
            <form action={createPurchaseOrder} className="grid gap-2">
              <Select name="supplierId" required defaultValue=""><option value="" disabled>ເລືອກຜູ້ສະໜອງ</option>{data.suppliers.filter((item) => item.isActive).map((item) => <option key={item.id} value={item.id}>{item.name}</option>)}</Select>
              <Select name="productVariant" required defaultValue=""><option value="" disabled>ເລືອກສິນຄ້າ</option>{productOptions.map(({ product, variant }) => <option key={`${product.id}-${variant.id}`} value={`${product.id}::${variant.id}`}>{formatProductVariantName(product.name, variant.name)} · {variant.sku}</option>)}</Select>
              <div className="grid grid-cols-2 gap-2"><Input name="quantity" type="number" min={1} placeholder="ຈໍານວນ" required /><MoneyInput name="unitCost" min={0} placeholder="ຕົ້ນທຶນ/ໜ່ວຍ" /></div>
              <Textarea name="note" placeholder="ໝາຍເຫດ" />
              <Button type="submit">ສ້າງໃບສັ່ງຊື້</Button>
            </form>
          </CardContent>
        </Card>

        <Card>
          <CardHeader><CardTitle className="flex items-center gap-2"><Scale className="h-5 w-5" />ປັບ / ກວດນັບສະຕ໋ອກ</CardTitle></CardHeader>
          <CardContent>
            <form action={adjustInventory} className="grid gap-2">
              <Select name="productVariant" required defaultValue=""><option value="" disabled>ເລືອກສິນຄ້າ</option>{productOptions.map(({ product, variant }) => <option key={`${product.id}-${variant.id}`} value={`${product.id}::${variant.id}`}>{formatProductVariantName(product.name, variant.name)} · ຄົງ {variant.stock}</option>)}</Select>
              <Select name="operation" defaultValue="ADJUSTMENT_IN"><option value="ADJUSTMENT_IN">ເພີ່ມຈາກການກວດນັບ</option><option value="ADJUSTMENT_OUT">ຫຼຸດຈາກການກວດນັບ</option><option value="DAMAGED">ສິນຄ້າເສຍຫາຍ</option></Select>
              <Input name="quantity" type="number" min={1} placeholder="ຈໍານວນ" required />
              <Input name="reason" placeholder="ເຫດຜົນ" required /><Textarea name="note" placeholder="ໝາຍເຫດ" />
              <Button type="submit" variant="secondary">ບັນທຶກການປັບສະຕ໋ອກ</Button>
            </form>
          </CardContent>
        </Card>

        <Card>
          <CardHeader><CardTitle>ຄ່າໃຊ້ຈ່າຍ</CardTitle></CardHeader>
          <CardContent className="space-y-3">
            <form action={createExpense} className="grid gap-2">
              <Input name="category" placeholder="ໝວດ: ຄ່າເຊົ່າ, ຄ່າໄຟ..." required />
              <Input name="description" placeholder="ລາຍການ" required />
              <MoneyInput name="amount" min={1} placeholder="ຈໍານວນເງິນ" required />
              <Select name="paymentMethod" defaultValue="CASH"><option value="CASH">ເງິນສົດ</option><option value="TRANSFER">ເງິນໂອນ</option><option value="OTHER">ອື່ນໆ</option></Select>
              <Input name="note" placeholder="ໝາຍເຫດ" />
              <Button type="submit">ບັນທຶກຄ່າໃຊ້ຈ່າຍ</Button>
            </form>
            <div className="space-y-2 max-h-48 overflow-y-auto">{data.expenses.map((expense) => <div key={expense.id} className="rounded-xl border border-slate-200 p-2 text-xs"><div className="flex justify-between gap-2"><strong>{expense.description}</strong><strong className="text-rose-700">-{formatCurrency(expense.amount)}</strong></div><p className="text-slate-500">{expense.category} · {formatDate(new Date(expense.expenseAt))}</p></div>)}</div>
          </CardContent>
        </Card>
      </div>

      <Card className="mt-4">
        <CardHeader><CardTitle className="flex items-center gap-2"><ClipboardList className="h-5 w-5" />ໃບສັ່ງຊື້</CardTitle></CardHeader>
        <CardContent className="overflow-x-auto">
          <table className="w-full min-w-[800px] text-left text-sm"><thead><tr className="border-b border-slate-200 text-slate-500"><th className="p-2">ເລກທີ</th><th className="p-2">ຜູ້ສະໜອງ</th><th className="p-2">ສິນຄ້າ</th><th className="p-2">ລວມ</th><th className="p-2">ສະຖານະ</th><th className="p-2">ຈັດການ</th></tr></thead><tbody>
            {data.purchaseOrders.map((purchase) => <tr key={purchase.id} className="border-b border-slate-100"><td className="p-2 font-bold">{purchase.purchaseNo}</td><td className="p-2">{purchase.supplierName}</td><td className="p-2">{purchase.items.map((item) => `${formatProductVariantName(item.name, item.variantName)} x${item.quantityOrdered}`).join(", ")}</td><td className="p-2">{formatCurrency(purchase.totalCost)}</td><td className="p-2">{purchase.status}</td><td className="p-2">{purchase.status === "ORDERED" || purchase.status === "PARTIALLY_RECEIVED" ? <form action={receivePurchaseOrder}><input type="hidden" name="purchaseId" value={purchase.id} /><Button type="submit" className="min-h-9 px-3 text-xs">ຮັບເຂົ້າທັງໝົດ</Button></form> : "-"}</td></tr>)}
          </tbody></table>
        </CardContent>
      </Card>

      <div className="mt-4 grid gap-4 xl:grid-cols-2">
        <Card>
          <CardHeader><CardTitle className="flex items-center gap-2"><Building2 className="h-5 w-5" />ສາຂາ ແລະ ເຄື່ອງ POS</CardTitle></CardHeader>
          <CardContent className="space-y-4">
            <form action={createBranch} className="grid gap-2 sm:grid-cols-2"><Input name="code" placeholder="ລະຫັດສາຂາ" required /><Input name="name" placeholder="ຊື່ສາຂາ" required /><Input name="phone" placeholder="ເບີໂທ" /><Input name="address" placeholder="ທີ່ຢູ່" /><Button type="submit" className="sm:col-span-2">ເພີ່ມສາຂາ</Button></form>
            <form action={createRegister} className="grid gap-2 sm:grid-cols-3"><Select name="branchId" required defaultValue=""><option value="" disabled>ສາຂາ</option>{data.branches.map((branch) => <option key={branch.id} value={branch.id}>{branch.name}</option>)}</Select><Input name="code" placeholder="ລະຫັດ POS" required /><Input name="name" placeholder="ຊື່ເຄື່ອງ" required /><Button type="submit" className="sm:col-span-3">ເພີ່ມເຄື່ອງ POS</Button></form>
            <div className="text-sm text-slate-600">{data.branches.map((branch) => <p key={branch.id} className="py-1"><strong>{branch.code}</strong> {branch.name} · {data.registers.filter((item) => item.branchId === branch.id).map((item) => item.name).join(", ") || "ຍັງບໍ່ມີເຄື່ອງ"}</p>)}</div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader><CardTitle className="flex items-center gap-2"><History className="h-5 w-5" />Audit log ຫຼ້າສຸດ</CardTitle></CardHeader>
          <CardContent className="space-y-2 max-h-[28rem] overflow-y-auto">{data.auditLogs.slice(0, 30).map((log) => <div key={log.id} className="rounded-xl border border-slate-200 p-3 text-sm"><div className="flex justify-between gap-2"><p className="font-bold">{log.description}</p><span className="text-xs text-slate-500">{formatDate(new Date(log.createdAt))}</span></div><p className="text-xs text-slate-500">{log.action} · {log.userName}{log.approvedByName ? ` · ອະນຸມັດ: ${log.approvedByName}` : ""}</p></div>)}</CardContent>
        </Card>
      </div>

      <Card className="mt-4">
        <CardHeader><CardTitle>ປະຫວັດການເຄື່ອນໄຫວສະຕ໋ອກ</CardTitle></CardHeader>
        <CardContent className="overflow-x-auto"><table className="w-full min-w-[900px] text-left text-sm"><thead><tr className="border-b border-slate-200 text-slate-500"><th className="p-2">ວັນທີ</th><th className="p-2">SKU</th><th className="p-2">ສິນຄ້າ</th><th className="p-2">ປະເພດ</th><th className="p-2">ຈໍານວນ</th><th className="p-2">ກ່ອນ → ຫຼັງ</th><th className="p-2">ອ້າງອີງ</th><th className="p-2">ຜູ້ເຮັດ</th></tr></thead><tbody>{data.movements.map((movement) => <tr key={movement.id} className="border-b border-slate-100"><td className="p-2">{formatDate(new Date(movement.createdAt))}</td><td className="p-2 font-mono">{movement.sku}</td><td className="p-2">{formatProductVariantName(movement.productName, movement.variantName)}</td><td className="p-2">{movement.type}</td><td className={movement.quantity >= 0 ? "p-2 font-bold text-emerald-700" : "p-2 font-bold text-rose-700"}>{movement.quantity > 0 ? "+" : ""}{movement.quantity}</td><td className="p-2">{movement.stockBefore} → {movement.stockAfter}</td><td className="p-2">{movement.referenceNo || movement.reason || "-"}</td><td className="p-2">{movement.userName}</td></tr>)}</tbody></table></CardContent>
      </Card>
    </section>
  );
}
