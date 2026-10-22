import Image from "next/image";
import Link from "next/link";
import {
  AlertTriangle,
  Database,
  Eye,
  Plus,
  ReceiptText,
  Save,
  Store,
  Tags,
  Trash2,
  Truck,
  UsersRound,
  Workflow
} from "lucide-react";
import {
  createMemberTier,
  deleteMemberTier,
  getMemberTiers,
  updateMemberTier
} from "@/actions/member.action";
import {
  clearAllBusinessData,
  createCategory,
  createShippingCompany,
  deleteCategory,
  deleteShippingCompany,
  getCategories,
  getStoreSettings,
  updateShippingCompany,
  updateBillSizeSettings,
  updatePosReceiptSettings,
  updatePosOperationsSettings,
  updateStoreSettings
} from "@/actions/settings.action";
import { PageHeader } from "@/components/layout/page-header";
import { BackupControls } from "@/components/settings/backup-controls";
import { HardwareTools } from "@/components/settings/hardware-tools";
import { CurrencySettings } from "@/components/settings/currency-settings";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input, Select } from "@/components/ui/input";
import { statusConfig } from "@/lib/utils";
import type { OrderStatus } from "@/types";

const statuses: OrderStatus[] = [
  "PENDING_PACK",
  "PACKED",
  "SHIPPED",
  "CANCELLED",
  "RETURNED"
];

export default async function SettingsPage() {
  const [categories, storeSettings, memberTiers] = await Promise.all([
    getCategories(),
    getStoreSettings(),
    getMemberTiers()
  ]);

  return (
    <section>
      <PageHeader
        title="ຕັ້ງຄ່າ"
        description="ຈັດການຂໍ້ມູນຮ້ານ, ບິນ, ສິນຄ້າ, ສະມາຊິກ ແລະ ຂົນສົ່ງ"
      />
      <nav className="mb-5 flex gap-2 overflow-x-auto rounded-2xl border border-slate-200 bg-white p-2 shadow-sm" aria-label="ທາງລັດຕັ້ງຄ່າ">
        {[
          ["#store", "ຂໍ້ມູນຮ້ານ"],
          ["#pos-bill", "ບິນ POS"],
          ["#pos-operations", "POS / ອາກອນ"],
          ["#currency", "ເງິນບາດ / ເຣດ"],
          ["#catalog", "ສິນຄ້າ"],
          ["#members", "ສະມາຊິກ"],
          ["#shipping", "ຂົນສົ່ງ"],
          ["#system", "ລະບົບ"]
        ].map(([href, label]) => (
          <a
            key={href}
            href={href}
            className="shrink-0 rounded-xl px-3 py-2 text-sm font-bold text-slate-600 transition hover:bg-indigo-50 hover:text-indigo-700"
          >
            {label}
          </a>
        ))}
      </nav>
      <CurrencySettings settings={storeSettings} />
      <div className="grid gap-4 lg:grid-cols-2 xl:grid-cols-3">
        <Card id="store" className="scroll-mt-24">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Store className="h-5 w-5" aria-hidden />
              ຂໍ້ມູນຮ້ານ
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            <div className="flex items-center gap-3 rounded-xl border border-slate-200 p-3">
              <div className="relative h-16 w-16 shrink-0 overflow-hidden rounded-xl bg-slate-50">
                {storeSettings.logoUrl ? (
                  <Image
                    src={storeSettings.logoUrl}
                    alt={storeSettings.storeName}
                    fill
                    sizes="4rem"
                    className="object-contain"
                  />
                ) : (
                  <div className="flex h-full items-center justify-center text-xs text-slate-400">
                    Logo
                  </div>
                )}
              </div>
              <div className="min-w-0">
                <p className="truncate text-sm font-bold text-slate-950">
                  {storeSettings.storeName}
                </p>
                <p className="truncate text-xs font-bold text-slate-700">
                  {storeSettings.storeSubtitle || "ໃຊ້ໃນໃບປິ້ນບິນ"}
                </p>
                {storeSettings.storeNote ? (
                  <p className="truncate text-xs font-bold text-slate-700">
                    {storeSettings.storeNote}
                  </p>
                ) : null}
              </div>
            </div>

            <form
              action={updateStoreSettings}
              className="grid gap-3"
            >
              <label className="space-y-1.5">
                <span className="text-sm font-semibold text-slate-700">
                  ຊື່ຮ້ານ
                </span>
                <Input
                  name="storeName"
                  defaultValue={storeSettings.storeName}
                  required
                />
              </label>
              <label className="space-y-1.5">
                <span className="text-sm font-semibold text-slate-700">
                  ຂໍ້ມູນໃຕ້ຊື່ຮ້ານ
                </span>
                <Input
                  name="storeSubtitle"
                  defaultValue={storeSettings.storeSubtitle}
                  placeholder="ເຊັ່ນ ເຄື່ອງສໍາອາງ / ນໍ້າຫອມ"
                />
              </label>
              <label className="space-y-1.5">
                <span className="text-sm font-semibold text-slate-700">
                  ຂໍ້ມູນເພີ່ມໃຕ້ຊື່ຮ້ານ
                </span>
                <Input
                  name="storeNote"
                  defaultValue={storeSettings.storeNote}
                  placeholder="ເຊັ່ນ Facebook / Tiktok / ເບີໂທຮ້ານ"
                />
              </label>
              <label className="space-y-1.5">
                <span className="text-sm font-semibold text-slate-700">
                  ໂລໂກ້ຮ້ານ
                </span>
                <Input
                  name="storeLogo"
                  type="file"
                  accept="image/jpeg,image/png,image/webp,image/gif"
                />
              </label>
              <Button type="submit" className="w-full">
                <Save className="h-4 w-4" aria-hidden />
                ບັນທຶກຂໍ້ມູນຮ້ານ
              </Button>
            </form>

            <Link href="/settings/bill-preview" className="block">
              <Button variant="secondary" className="w-full">
                <Eye className="h-4 w-4" aria-hidden />
                ເບິ່ງຕົວຢ່າງບິນ
              </Button>
            </Link>
          </CardContent>
        </Card>

        <Card id="pos-bill" className="scroll-mt-24">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <ReceiptText className="h-5 w-5" aria-hidden />
              ບິນຂາຍໜ້າຮ້ານ
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            <div className="flex items-center gap-3 rounded-xl border border-slate-200 p-3">
              <div className="relative h-16 w-16 shrink-0 overflow-hidden rounded-xl bg-slate-50">
                {storeSettings.posReceiptLogoUrl ? (
                  <Image
                    src={storeSettings.posReceiptLogoUrl}
                    alt={storeSettings.posReceiptName}
                    fill
                    sizes="4rem"
                    className="object-contain"
                  />
                ) : (
                  <div className="flex h-full items-center justify-center text-xs text-slate-400">
                    POS
                  </div>
                )}
              </div>
              <div className="min-w-0">
                <p className="truncate text-sm font-bold text-slate-950">
                  {storeSettings.posReceiptName}
                </p>
                <p className="truncate text-xs font-bold text-slate-700">
                  {storeSettings.posReceiptSubtitle || "ໃຊ້ໃນບິນຂາຍໜ້າຮ້ານ"}
                </p>
                {storeSettings.posReceiptNote ? (
                  <p className="truncate text-xs font-bold text-slate-700">
                    {storeSettings.posReceiptNote}
                  </p>
                ) : null}
              </div>
            </div>

            <form
              action={updatePosReceiptSettings}
              className="grid gap-3"
            >
              <label className="space-y-1.5">
                <span className="text-sm font-semibold text-slate-700">
                  ຊື່ໃນບິນ POS
                </span>
                <Input
                  name="posReceiptName"
                  defaultValue={storeSettings.posReceiptName}
                  required
                />
              </label>
              <label className="space-y-1.5">
                <span className="text-sm font-semibold text-slate-700">
                  ຂໍ້ມູນໃຕ້ຊື່ POS
                </span>
                <Input
                  name="posReceiptSubtitle"
                  defaultValue={storeSettings.posReceiptSubtitle}
                  placeholder="ເຊັ່ນ Facebook / ປະເພດຮ້ານ"
                />
              </label>
              <label className="space-y-1.5">
                <span className="text-sm font-semibold text-slate-700">
                  ຂໍ້ມູນເພີ່ມໃຕ້ຊື່ POS
                </span>
                <Input
                  name="posReceiptNote"
                  defaultValue={storeSettings.posReceiptNote}
                  placeholder="ເຊັ່ນ Tiktok / ເບີໂທຮ້ານ"
                />
              </label>
              <label className="space-y-1.5">
                <span className="text-sm font-semibold text-slate-700">
                  ໂລໂກ້ບິນ POS
                </span>
                <Input
                  name="posReceiptLogo"
                  type="file"
                  accept="image/jpeg,image/png,image/webp,image/gif"
                />
              </label>
              <Button type="submit" className="w-full">
                <Save className="h-4 w-4" aria-hidden />
                ບັນທຶກບິນ POS
              </Button>
            </form>

            <Link href="/settings/pos-bill-preview" className="block">
              <Button variant="secondary" className="w-full">
                <Eye className="h-4 w-4" aria-hidden />
                ເບິ່ງຕົວຢ່າງບິນ POS
              </Button>
            </Link>
          </CardContent>
        </Card>

        <Card id="pos-operations" className="scroll-mt-24">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Workflow className="h-5 w-5" aria-hidden />
              POS, ອາກອນ ແລະ ການໃຊ້ງານ
            </CardTitle>
          </CardHeader>
          <CardContent>
            <form action={updatePosOperationsSettings} className="grid gap-3">
              <Input name="defaultBranchName" defaultValue={storeSettings.defaultBranchName} placeholder="ຊື່ສາຂາ" />
              <Input name="defaultRegisterName" defaultValue={storeSettings.defaultRegisterName} placeholder="ຊື່ເຄື່ອງ POS" />
              <Input name="receiptAddress" defaultValue={storeSettings.receiptAddress} placeholder="ທີ່ຢູ່ໃນໃບຮັບເງິນ" />
              <Input name="taxId" defaultValue={storeSettings.taxId} placeholder="ເລກປະຈໍາຕົວຜູ້ເສຍອາກອນ" />
              <label className="grid grid-cols-[1fr_7rem] items-center gap-2 text-sm font-semibold text-slate-700">
                <span>ອັດຕາອາກອນ (%)</span>
                <Input name="taxRate" type="number" min={0} max={100} defaultValue={storeSettings.taxRate} />
              </label>
              <label className="flex items-center gap-2 rounded-xl border border-slate-200 p-3 text-sm font-semibold">
                <input name="taxEnabled" type="checkbox" defaultChecked={storeSettings.taxEnabled} className="h-4 w-4" />
                ເປີດສະແດງອາກອນໃນບິນ (ລາຄາລວມອາກອນ)
              </label>
              <label className="flex items-center gap-2 rounded-xl border border-slate-200 p-3 text-sm font-semibold">
                <input name="requireShiftForSale" type="checkbox" defaultChecked={storeSettings.requireShiftForSale} className="h-4 w-4" />
                ຕ້ອງເປີດກະກ່ອນຂາຍ
              </label>
              <Button type="submit" className="w-full"><Save className="h-4 w-4" />ບັນທຶກການຕັ້ງຄ່າ POS</Button>
            </form>
          </CardContent>
        </Card>

        <Card id="catalog" className="scroll-mt-24">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Tags className="h-5 w-5" aria-hidden />
              ໝວດໝູ່ສິນຄ້າ
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            <form action={createCategory} className="flex gap-2">
              <Input
                name="name"
                placeholder="ເຊັ່ນ ນໍ້າຫອມ"
                required
                className="min-w-0"
              />
              <Button type="submit" className="shrink-0 px-3">
                <Plus className="h-4 w-4" aria-hidden />
                ເພີ່ມ
              </Button>
            </form>
            <div className="space-y-2">
              {categories.map((category) => (
                <div
                  key={category}
                  className="flex items-center justify-between gap-2 rounded-xl border border-slate-200 px-3 py-2"
                >
                  <span className="min-w-0 truncate text-sm font-semibold text-slate-950">
                    {category}
                  </span>
                  <form action={deleteCategory}>
                    <input type="hidden" name="name" value={category} />
                    <Button
                      type="submit"
                      variant="ghost"
                      className="min-h-8 px-2 text-xs text-rose-600 hover:bg-rose-50"
                      aria-label={`ລຶບໝວດໝູ່ ${category}`}
                    >
                      <Trash2 className="h-4 w-4" aria-hidden />
                    </Button>
                  </form>
                </div>
              ))}
            </div>
            <p className="text-xs leading-5 text-slate-500">
              ໝວດໝູ່ທີ່ເພີ່ມຈະໄປສະແດງໃນໜ້າເພີ່ມສິນຄ້າ ແລະຕົວກອງໃນໜ້າສິນຄ້າ/ອໍເດີ
            </p>
          </CardContent>
        </Card>

        <Card id="members" className="scroll-mt-24">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <UsersRound className="h-5 w-5" aria-hidden />
              ລະດັບສະມາຊິກ
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            <form action={createMemberTier} className="grid gap-2">
              <Input name="name" placeholder="ຊື່ລະດັບ ເຊັ່ນ VIP" required />
              <Input
                name="minSpend"
                inputMode="numeric"
                placeholder="ຍອດຊື້ຂັ້ນຕໍ່າ ເຊັ່ນ 500.000"
                required
              />
              <Input
                name="discountPercent"
                type="number"
                min={0}
                max={100}
                placeholder="ສ່ວນຫຼຸດ %"
                required
              />
              <Button type="submit" className="w-full">
                <Plus className="h-4 w-4" aria-hidden />
                ເພີ່ມລະດັບ
              </Button>
            </form>

            <div className="space-y-2">
              {memberTiers.map((tier) => (
                <form
                  key={tier.id}
                  action={updateMemberTier}
                  className="grid gap-2 rounded-xl border border-slate-200 p-3"
                >
                  <input type="hidden" name="id" value={tier.id} />
                  <Input name="name" defaultValue={tier.name} required />
                  <Input
                    name="minSpend"
                    inputMode="numeric"
                    defaultValue={tier.minSpend}
                    required
                  />
                  <Input
                    name="discountPercent"
                    type="number"
                    min={0}
                    max={100}
                    defaultValue={tier.discountPercent}
                    required
                  />
                  <div className="grid grid-cols-[1fr_auto] gap-2">
                    <Button type="submit" variant="secondary">
                      <Save className="h-4 w-4" aria-hidden />
                      ບັນທຶກ
                    </Button>
                    <button
                      formAction={deleteMemberTier}
                      className="inline-flex min-h-11 items-center justify-center rounded-xl px-3 text-rose-600 hover:bg-rose-50"
                      aria-label={`ລຶບລະດັບ ${tier.name}`}
                    >
                      <Trash2 className="h-4 w-4" aria-hidden />
                    </button>
                  </div>
                </form>
              ))}
            </div>
            <p className="text-xs leading-5 text-slate-500">
              ລະບົບຈະຄິດລະດັບຈາກຍອດຊື້ POS ທີ່ບໍ່ຖືກຍົກເລີກ ຫຼື ຄືນສິນຄ້າ.
            </p>
          </CardContent>
        </Card>

        <Card id="shipping" className="scroll-mt-24">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Truck className="h-5 w-5" aria-hidden />
              ບໍລິສັດຂົນສົ່ງ
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            <form action={createShippingCompany} className="flex gap-2">
              <Input
                name="name"
                placeholder="ເຊັ່ນ ຮຸ່ງອາລຸນ"
                required
                className="min-w-0"
              />
              <Button type="submit" className="shrink-0 px-3">
                <Plus className="h-4 w-4" aria-hidden />
                ເພີ່ມ
              </Button>
            </form>
            <div className="space-y-2">
              {storeSettings.shippingCompanies.map((company) => (
                <form
                  key={company}
                  action={updateShippingCompany}
                  className="grid grid-cols-[1fr_auto_auto] gap-2 rounded-xl border border-slate-200 p-2"
                >
                  <input type="hidden" name="oldName" value={company} />
                  <Input name="name" defaultValue={company} required />
                  <Button
                    type="submit"
                    variant="secondary"
                    className="min-h-10 px-3"
                    aria-label={`ບັນທຶກຂົນສົ່ງ ${company}`}
                  >
                    <Save className="h-4 w-4" aria-hidden />
                  </Button>
                  <button
                    formAction={deleteShippingCompany}
                    className="inline-flex min-h-10 items-center justify-center rounded-xl px-3 text-rose-600 hover:bg-rose-50"
                    aria-label={`ລຶບຂົນສົ່ງ ${company}`}
                  >
                    <Trash2 className="h-4 w-4" aria-hidden />
                  </button>
                </form>
              ))}
            </div>
            <p className="text-xs leading-5 text-slate-500">
              ລາຍຊື່ນີ້ຈະໄປສະແດງໃນໜ້າສ້າງອໍເດີ ແລະ ໜ້າແກ້ໄຂອໍເດີ.
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Workflow className="h-5 w-5" aria-hidden />
              ສະຖານະອໍເດີ
            </CardTitle>
          </CardHeader>
          <CardContent className="flex flex-wrap gap-2">
            {statuses.map((status) => (
              <Badge key={status} className={statusConfig[status].className}>
                {statusConfig[status].label}
              </Badge>
            ))}
          </CardContent>
        </Card>

        <Card id="system" className="scroll-mt-24">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Database className="h-5 w-5" aria-hidden />
              ສະຖານະຂໍ້ມູນ
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-3 text-sm text-slate-600">
            <p className="font-bold text-slate-900">ລະບົບຂໍ້ມູນພ້ອມໃຊ້ງານ</p>
            <p>ຂໍ້ມູນສິນຄ້າ, ອໍເດີ, ບິນ ແລະ ສະມາຊິກ ຈະຖືກບັນທຶກອັດຕະໂນມັດ.</p>
            <BackupControls />
            <HardwareTools />
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <ReceiptText className="h-5 w-5" aria-hidden />
              ຂະໜາດບິນ
            </CardTitle>
          </CardHeader>
          <CardContent>
            <form action={updateBillSizeSettings} className="grid gap-3">
              <label className="space-y-1.5">
                <span className="text-sm font-semibold text-slate-700">
                  ບິນຂົນສົ່ງ
                </span>
                <Select
                  name="orderBillSize"
                  defaultValue={storeSettings.orderBillSize}
                >
                  <option value="LABEL_100X150">100 x 150 mm</option>
                  <option value="A4">A4</option>
                </Select>
              </label>
              <label className="space-y-1.5">
                <span className="text-sm font-semibold text-slate-700">
                  ບິນ POS
                </span>
                <Select
                  name="posReceiptSize"
                  defaultValue={storeSettings.posReceiptSize}
                >
                  <option value="POS_80MM">80 mm</option>
                  <option value="POS_58MM">58 mm</option>
                </Select>
              </label>
              <Button type="submit" className="w-full">
                <Save className="h-4 w-4" aria-hidden />
                ບັນທຶກຂະໜາດບິນ
              </Button>
            </form>
          </CardContent>
        </Card>

        <Card className="border-rose-200">
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-rose-700">
              <AlertTriangle className="h-5 w-5" aria-hidden />
              ລຶບຂໍ້ມູນທັງໝົດ
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-3 text-sm text-slate-600">
            <p>
              ປຸ່ມນີ້ຈະລຶບສິນຄ້າ, ອໍເດີ ແລະໝວດໝູ່ສິນຄ້າທັງໝົດ
              ເພື່ອເລີ່ມກອກຂໍ້ມູນຈິງ. ຂໍ້ມູນຮ້ານ ແລະໂລໂກ້ຈະຍັງຢູ່.
            </p>
            <form action={clearAllBusinessData} className="space-y-3">
              <label className="space-y-1.5">
                <span className="text-sm font-semibold text-slate-700">
                  ພິມ DELETE ເພື່ອຢືນຢັນ
                </span>
                <Input
                  name="confirmText"
                  placeholder="DELETE"
                  required
                  pattern="DELETE"
                />
              </label>
              <Button
                type="submit"
                variant="ghost"
                className="w-full border border-rose-200 bg-rose-50 text-rose-700 hover:bg-rose-100"
              >
                <Trash2 className="h-4 w-4" aria-hidden />
                ລຶບສິນຄ້າ ແລະ ອໍເດີທັງໝົດ
              </Button>
            </form>
          </CardContent>
        </Card>
      </div>
    </section>
  );
}
