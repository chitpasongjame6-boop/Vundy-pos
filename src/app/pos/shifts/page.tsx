import { ArrowDownCircle, ArrowUpCircle, Banknote, Clock3, LockKeyhole } from "lucide-react";
import {
  addCashMovement,
  closeCashShift,
  getShiftWorkspace,
  openCashShift
} from "@/actions/shift.action";
import { PageHeader } from "@/components/layout/page-header";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input, Select, Textarea } from "@/components/ui/input";
import { MoneyInput } from "@/components/ui/money-input";
import { MetricCard } from "@/components/ui/patterns";
import { getCurrentUser } from "@/lib/auth";
import { formatCurrency, formatDate } from "@/lib/utils";
import { formatThb } from "@/lib/currency";
import { movementBalance } from "@/lib/cash-currency";

export default async function PosShiftsPage() {
  const [workspace, user] = await Promise.all([getShiftWorkspace(), getCurrentUser()]);
  const movementTotal = movementBalance(workspace.movements, "LAK");

  return (
    <section>
      <PageHeader
        title="ກະຂາຍ ແລະ ລິ້ນຊັກເງິນ"
        description="ເປີດກະ, ບັນທຶກເງິນເຂົ້າ-ອອກ ແລະ ກວດເງິນກ່ອນປິດກະ"
        actionHref="/pos"
        actionLabel="ກັບໄປຂາຍ"
      />

      {workspace.current ? (
        <>
          <div className="mb-4 grid grid-cols-2 gap-3 lg:grid-cols-4">
            <MetricCard icon={Clock3} label="ເລກກະ" value={workspace.current.shiftNo} tone="indigo" />
            <MetricCard icon={Banknote} label="ເງິນເປີດກະ" value={formatCurrency(workspace.current.openingCash)} tone="sky" />
            <MetricCard
              icon={movementTotal >= 0 ? ArrowDownCircle : ArrowUpCircle}
              label="ເງິນເຂົ້າ/ອອກ"
              value={formatCurrency(movementTotal)}
              tone={movementTotal >= 0 ? "emerald" : "amber"}
            />
            <MetricCard icon={Banknote} label="ເງິນທີ່ຄວນມີ" value={formatCurrency(workspace.expectedCash)} tone="emerald" />
          </div>

          <div className="mb-4 flex flex-wrap gap-5 rounded-xl border border-indigo-100 bg-indigo-50 p-4 text-sm">
            <span>ເງິນບາດເປີດກະ: <strong>{formatThb(workspace.current.openingThb ?? 0)}</strong></span>
            <span>ເງິນບາດທີ່ຄວນມີ: <strong>{formatThb(workspace.expectedThb)}</strong></span>
            <span className="text-slate-600">ນັບແຍກສະກຸນເງິນ · ບໍ່ໃຊ້ເຣດປ່ຽນຍອດລິ້ນຊັກ</span>
          </div>
          <div className="grid gap-4 xl:grid-cols-2">
            <Card>
              <CardHeader><CardTitle>ເງິນເຂົ້າ / ເງິນອອກ</CardTitle></CardHeader>
              <CardContent className="space-y-4">
                <form action={addCashMovement} className="grid gap-3 sm:grid-cols-2">
                  <input type="hidden" name="shiftId" value={workspace.current.id} />
                  <Select name="type" defaultValue="CASH_IN">
                    <option value="CASH_IN">ເງິນເຂົ້າລິ້ນຊັກ</option>
                    <option value="CASH_OUT">ເງິນອອກຈາກລິ້ນຊັກ</option>
                  </Select>
                  <Select name="currency" defaultValue="LAK" aria-label="ສະກຸນເງິນ"><option value="LAK">ກີບ (LAK)</option><option value="THB">ບາດ (THB)</option></Select>
                  <Input name="amount" type="number" min="0.01" step="0.01" placeholder="ຈໍານວນເງິນຕາມສະກຸນ" required />
                  <Input name="reason" placeholder="ເຫດຜົນ" required />
                  <Input name="note" placeholder="ໝາຍເຫດ (ຖ້າມີ)" />
                  <Button type="submit" className="sm:col-span-2">ບັນທຶກເງິນເຂົ້າ/ອອກ</Button>
                </form>
                <div className="space-y-2">
                  {workspace.movements.length ? workspace.movements.map((item) => (
                    <div key={item.id} className="flex items-center justify-between rounded-xl border border-slate-200 p-3 text-sm">
                      <div>
                        <p className="font-bold text-slate-950">{item.reason}</p>
                        <p className="text-xs text-slate-500">{formatDate(new Date(item.createdAt))} · {item.userName}</p>
                      </div>
                      <p className={item.type === "CASH_IN" ? "font-bold text-emerald-700" : "font-bold text-rose-700"}>
                        {item.type === "CASH_IN" ? "+" : "-"}{item.currency === "THB" ? formatThb(item.amount) : formatCurrency(item.amount)}
                      </p>
                    </div>
                  )) : <p className="text-sm text-slate-500">ຍັງບໍ່ມີເງິນເຂົ້າ/ອອກໃນກະນີ້</p>}
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader><CardTitle>ປິດກະ</CardTitle></CardHeader>
              <CardContent>
                <form action={closeCashShift} className="grid gap-3">
                  <input type="hidden" name="shiftId" value={workspace.current.id} />
                  <label className="space-y-1.5">
                    <span className="text-sm font-semibold text-slate-700">ເງິນສົດທີ່ນັບໄດ້</span>
                    <MoneyInput name="countedCash" min={0} defaultValue={Math.max(0, workspace.expectedCash)} required />
                  </label>
                  <label className="space-y-1.5 text-sm font-semibold">ເງິນບາດທີ່ນັບໄດ້ຈິງ
                    <Input name="countedThb" type="number" min="0" step="0.01" defaultValue={Math.max(0, workspace.expectedThb) / 100} required />
                  </label>
                  <Textarea name="note" placeholder="ໝາຍເຫດການປິດກະ" />
                  {user?.role === "STAFF" ? (
                    <label className="space-y-1.5">
                      <span className="flex items-center gap-2 text-sm font-semibold text-slate-700">
                        <LockKeyhole className="h-4 w-4" /> PIN ເຈົ້າຂອງຮ້ານ
                      </span>
                      <Input name="approvalPin" type="password" required autoComplete="off" />
                    </label>
                  ) : null}
                  <Button type="submit" variant="secondary">ກວດ ແລະ ປິດກະ</Button>
                </form>
              </CardContent>
            </Card>
          </div>
        </>
      ) : (
        <Card className="max-w-xl">
          <CardHeader><CardTitle>ເປີດກະໃໝ່</CardTitle></CardHeader>
          <CardContent>
            <form action={openCashShift} className="grid gap-3">
              {workspace.branches.length ? (
                <Select name="branchId" defaultValue={workspace.branches[0]?.id ?? ""}>
                  {workspace.branches.map((branch) => <option key={branch.id} value={branch.id}>{branch.code} · {branch.name}</option>)}
                </Select>
              ) : null}
              {workspace.registers.length ? (
                <Select name="registerId" defaultValue={workspace.registers[0]?.id ?? ""}>
                  {workspace.registers.map((register) => <option key={register.id} value={register.id}>{register.code} · {register.name}</option>)}
                </Select>
              ) : null}
              <label className="space-y-1.5">
                <span className="text-sm font-semibold text-slate-700">ເງິນສົດເລີ່ມຕົ້ນ</span>
                <MoneyInput name="openingCash" min={0} defaultValue={0} required />
              </label>
              <label className="space-y-1.5 text-sm font-semibold">ເງິນບາດເລີ່ມຕົ້ນ (ບໍ່ມີໃສ່ 0)
                <Input name="openingThb" type="number" min="0" step="0.01" defaultValue="0" required />
              </label>
              <Button type="submit">ເປີດກະຂາຍ</Button>
            </form>
          </CardContent>
        </Card>
      )}

      <Card className="mt-4">
        <CardHeader><CardTitle>ປະຫວັດກະຫຼ້າສຸດ</CardTitle></CardHeader>
        <CardContent className="overflow-x-auto">
          <table className="w-full min-w-[720px] text-left text-sm">
            <thead><tr className="border-b border-slate-200 text-slate-500"><th className="p-2">ເລກກະ</th><th className="p-2">ຜູ້ຂາຍ</th><th className="p-2">ເປີດ</th><th className="p-2">ຄາດໝາຍ</th><th className="p-2">ນັບໄດ້</th><th className="p-2">ຕ່າງ</th><th className="p-2">ສະຖານະ</th></tr></thead>
            <tbody>{workspace.history.map((shift) => (
              <tr key={shift.id} className="border-b border-slate-100">
                <td className="p-2 font-semibold">{shift.shiftNo}</td><td className="p-2">{shift.cashierName}</td>
                <td className="p-2">{formatDate(new Date(shift.openedAt))}</td>
                <td className="p-2">{formatCurrency(shift.expectedCash ?? 0)}<div className="text-xs text-slate-500">{formatThb(shift.expectedThb ?? 0)}</div></td>
                <td className="p-2">{formatCurrency(shift.countedCash ?? 0)}<div className="text-xs text-slate-500">{formatThb(shift.countedThb ?? 0)}</div></td>
                <td className="p-2">{formatCurrency(shift.cashDifference ?? 0)}<div className="text-xs text-slate-500">{formatThb(shift.differenceThb ?? 0)}</div></td>
                <td className="p-2 font-semibold">{shift.status === "OPEN" ? "ເປີດ" : "ປິດແລ້ວ"}</td>
              </tr>
            ))}</tbody>
          </table>
        </CardContent>
      </Card>
    </section>
  );
}
