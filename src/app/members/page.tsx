import { Search, UserPlus, UsersRound } from "lucide-react";
import {
  createMember,
  deactivateMember,
  getMembers,
  updateMember
} from "@/actions/member.action";
import { PageHeader } from "@/components/layout/page-header";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { formatCurrency, formatDate } from "@/lib/utils";

export default async function MembersPage({
  searchParams
}: {
  searchParams?: Promise<{ search?: string }>;
}) {
  const params = await searchParams;
  const members = await getMembers(params?.search);

  return (
    <section>
      <PageHeader
        title="ສະມາຊິກ"
        description="ເກັບຊື່ ເບີໂທ ແລະຍອດຊື້ສະສົມຈາກບິນຂາຍໜ້າຮ້ານ"
      />

      <div className="grid gap-4 xl:grid-cols-[22rem_1fr]">
        <div className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <UserPlus className="h-5 w-5" aria-hidden />
                ເພີ່ມສະມາຊິກ
              </CardTitle>
            </CardHeader>
            <CardContent>
              <form action={createMember} className="grid gap-3">
                <label className="space-y-1.5">
                  <span className="text-sm font-semibold text-zinc-700">
                    ຊື່ລູກຄ້າ
                  </span>
                  <Input name="name" placeholder="ຊື່ລູກຄ້າ" required />
                </label>
                <label className="space-y-1.5">
                  <span className="text-sm font-semibold text-zinc-700">
                    ເບີໂທ
                  </span>
                  <Input name="phone" placeholder="020..." required />
                </label>
                <Button type="submit" className="w-full">
                  <UserPlus className="h-4 w-4" aria-hidden />
                  ບັນທຶກສະມາຊິກ
                </Button>
              </form>
            </CardContent>
          </Card>

          <Card>
            <CardContent>
              <form className="grid gap-3">
                <label className="relative">
                  <Search className="pointer-events-none absolute left-3 top-3 h-5 w-5 text-zinc-400" />
                  <Input
                    name="search"
                    defaultValue={params?.search ?? ""}
                    placeholder="ຄົ້ນຫາຊື່ ເບີໂທ ຫຼືລະດັບ"
                    className="pl-10"
                  />
                </label>
                <Button type="submit">ຄົ້ນຫາ</Button>
              </form>
            </CardContent>
          </Card>
        </div>

        <div className="grid gap-3 md:grid-cols-2">
          {members.length ? (
            members.map((member) => (
              <Card key={member.id} className={!member.isActive ? "opacity-70" : ""}>
                <CardContent className="space-y-3">
                  <div className="flex items-start justify-between gap-3">
                    <div className="min-w-0">
                      <p className="truncate text-lg font-bold text-zinc-950">
                        {member.name}
                      </p>
                      <p className="text-sm text-zinc-500">{member.phone}</p>
                    </div>
                    <Badge
                      className={
                        member.isActive
                          ? "border-emerald-200 bg-emerald-100 text-emerald-800"
                          : "border-zinc-200 bg-zinc-100 text-zinc-700"
                      }
                    >
                      {member.isActive ? "ໃຊ້ງານ" : "ປິດໃຊ້ງານ"}
                    </Badge>
                  </div>

                  <div className="grid grid-cols-2 gap-2 text-sm">
                    <Summary label="ລະດັບ" value={member.tier?.name ?? "-"} />
                    <Summary
                      label="ສ່ວນຫຼຸດ"
                      value={`${member.tier?.discountPercent ?? 0}%`}
                    />
                    <Summary
                      label="ຍອດຊື້ສະສົມ"
                      value={formatCurrency(member.totalSpend)}
                    />
                    <Summary label="ຈໍານວນບິນ" value={`${member.billCount}`} />
                  </div>

                  <p className="text-xs text-zinc-500">
                    ຊື້ຫຼ້າສຸດ:{" "}
                    {member.lastPurchaseAt
                      ? formatDate(new Date(member.lastPurchaseAt))
                      : "-"}
                  </p>

                  <form action={updateMember} className="grid gap-2">
                    <input type="hidden" name="id" value={member.id} />
                    <Input name="name" defaultValue={member.name} required />
                    <Input name="phone" defaultValue={member.phone} required />
                    <Button type="submit" variant="secondary">
                      ບັນທຶກແກ້ໄຂ
                    </Button>
                  </form>

                  {member.isActive ? (
                    <form action={deactivateMember}>
                      <input type="hidden" name="id" value={member.id} />
                      <Button
                        type="submit"
                        variant="ghost"
                        className="w-full border border-rose-200 bg-rose-50 text-rose-700 hover:bg-rose-100"
                      >
                        ປິດໃຊ້ງານສະມາຊິກ
                      </Button>
                    </form>
                  ) : null}
                </CardContent>
              </Card>
            ))
          ) : (
            <Card className="md:col-span-2">
              <CardContent className="flex items-center gap-3 text-zinc-500">
                <UsersRound className="h-5 w-5" aria-hidden />
                ບໍ່ພົບສະມາຊິກຕາມເງື່ອນໄຂນີ້
              </CardContent>
            </Card>
          )}
        </div>
      </div>
    </section>
  );
}

function Summary({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-md bg-zinc-50 p-2">
      <p className="text-xs text-zinc-500">{label}</p>
      <p className="font-bold text-zinc-950">{value}</p>
    </div>
  );
}
