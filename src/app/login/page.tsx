import Image from "next/image";
import { redirect } from "next/navigation";
import { BarChart3, LockKeyhole, PackageCheck, ShieldCheck, UserRound } from "lucide-react";
import { loginAction } from "@/actions/auth.action";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { getRoleHome } from "@/lib/auth-config";
import { getCurrentUser } from "@/lib/auth";

export default async function LoginPage({
  searchParams
}: {
  searchParams?: Promise<{ error?: string; next?: string }>;
}) {
  const params = (await searchParams) ?? {};
  const currentUser = await getCurrentUser();

  if (currentUser) {
    redirect(getRoleHome(currentUser.role));
  }

  return (
    <main className="relative flex min-h-screen items-center justify-center overflow-hidden px-4 py-8 sm:px-6">
      <div className="pointer-events-none absolute -left-32 top-[-8rem] h-96 w-96 rounded-full bg-indigo-200/50 blur-3xl" />
      <div className="pointer-events-none absolute -bottom-40 right-[-8rem] h-[28rem] w-[28rem] rounded-full bg-sky-200/50 blur-3xl" />

      <Card className="relative grid min-w-0 w-full max-w-5xl overflow-hidden border-white/80 shadow-2xl shadow-slate-300/40 lg:grid-cols-[1.05fr_0.95fr]">
        <section className="relative hidden overflow-hidden bg-gradient-to-br from-indigo-700 via-indigo-600 to-violet-600 p-10 text-white lg:flex lg:flex-col lg:justify-between">
          <div className="absolute -right-20 -top-20 h-64 w-64 rounded-full border-[3rem] border-white/5" />
          <div className="relative">
            <div className="flex items-center gap-3">
              <span className="relative h-14 w-14 overflow-hidden rounded-2xl border border-white/30 bg-white shadow-lg">
                <Image src="/vundy-logo.png" alt="Vundy" fill sizes="56px" className="object-cover" />
              </span>
              <div>
                <p className="text-xs font-bold uppercase tracking-[0.2em] text-indigo-200">Vundy</p>
                <p className="text-xl font-extrabold">POS & Stock</p>
              </div>
            </div>
            <h1 className="mt-14 max-w-md text-4xl font-extrabold leading-tight tracking-tight">
              ຈັດການຮ້ານໃຫ້ງ່າຍ<br />ເຫັນທຸກຢ່າງໃນບ່ອນດຽວ
            </h1>
            <p className="mt-4 max-w-md leading-7 text-indigo-100">
              ຂາຍໜ້າຮ້ານ, ຈັດການອໍເດີ, ຕິດຕາມສະຕ໋ອກ ແລະ ເບິ່ງກໍາໄລໄດ້ຢ່າງຊັດເຈນ
            </p>
          </div>
          <div className="relative grid grid-cols-3 gap-3">
            <Feature icon={<PackageCheck className="h-5 w-5" />} label="ສະຕ໋ອກ" />
            <Feature icon={<BarChart3 className="h-5 w-5" />} label="ລາຍງານ" />
            <Feature icon={<ShieldCheck className="h-5 w-5" />} label="ປອດໄພ" />
          </div>
        </section>

        <section className="flex min-h-[34rem] min-w-0 flex-col justify-center bg-white p-6 sm:p-10 lg:p-12">
          <div className="mb-8 flex items-center gap-3 lg:hidden">
            <span className="relative h-12 w-12 overflow-hidden rounded-2xl border border-indigo-100 bg-white shadow-sm">
              <Image src="/vundy-logo.png" alt="Vundy" fill sizes="48px" className="object-cover" />
            </span>
            <div>
              <p className="text-xs font-bold uppercase tracking-[0.18em] text-indigo-600">Vundy</p>
              <p className="font-extrabold text-slate-950">POS & Stock</p>
            </div>
          </div>

          <CardHeader className="p-0 pb-6">
            <span className="mb-4 flex h-12 w-12 items-center justify-center rounded-2xl bg-indigo-50 text-indigo-700 ring-4 ring-indigo-50/70">
              <LockKeyhole className="h-5 w-5" aria-hidden />
            </span>
            <CardTitle className="text-3xl">ເຂົ້າລະບົບ</CardTitle>
            <p className="mt-2 text-sm leading-6 text-slate-500">
              ໃຊ້ບັນຊີເຈົ້າຂອງຮ້ານ ຫຼື ພະນັກງານຂາຍຂອງທ່ານ
            </p>
          </CardHeader>
          <CardContent className="min-w-0 space-y-5 p-0">
            {params.error ? (
              <div className="rounded-xl border border-rose-200 bg-rose-50 px-4 py-3 text-sm font-semibold text-rose-700">
                ຊື່ຜູ້ໃຊ້ ຫຼື ລະຫັດຜ່ານບໍ່ຖືກຕ້ອງ
              </div>
            ) : null}

            <form action={loginAction} className="grid min-w-0 gap-4">
              <input type="hidden" name="next" value={params.next ?? ""} />
              <label className="min-w-0 space-y-2">
                <span className="text-sm font-bold text-slate-700">ຊື່ຜູ້ໃຊ້</span>
                <Input name="username" autoComplete="username" placeholder="ປ້ອນຊື່ຜູ້ໃຊ້" required />
              </label>
              <label className="min-w-0 space-y-2">
                <span className="text-sm font-bold text-slate-700">ລະຫັດຜ່ານ</span>
                <Input
                  name="password"
                  type="password"
                  autoComplete="current-password"
                  placeholder="ປ້ອນລະຫັດຜ່ານ"
                  required
                />
              </label>
              <Button type="submit" className="mt-2 w-full">
                <UserRound className="h-4 w-4" aria-hidden />
                ເຂົ້າລະບົບ
              </Button>
            </form>
            <p className="text-center text-xs text-slate-400">Vundy Management System</p>
          </CardContent>
        </section>
      </Card>
    </main>
  );
}

function Feature({ icon, label }: { icon: React.ReactNode; label: string }) {
  return (
    <div className="rounded-2xl border border-white/15 bg-white/10 px-3 py-4 text-center backdrop-blur">
      <span className="mx-auto flex h-9 w-9 items-center justify-center rounded-xl bg-white/15">{icon}</span>
      <p className="mt-2 text-xs font-bold text-indigo-50">{label}</p>
    </div>
  );
}
