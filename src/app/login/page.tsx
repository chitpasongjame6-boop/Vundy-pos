import { redirect } from "next/navigation";
import { LockKeyhole, UserRound } from "lucide-react";
import { loginAction } from "@/actions/auth.action";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { getRoleHome } from "@/lib/auth-config";
import { getCurrentUser, getLoginUsers } from "@/lib/auth";

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

  const users = getLoginUsers();

  return (
    <main className="flex min-h-screen items-center justify-center bg-zinc-50 px-4 py-8">
      <Card className="w-full max-w-md">
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-2xl">
            <LockKeyhole className="h-6 w-6" aria-hidden />
            ເຂົ້າລະບົບ
          </CardTitle>
          <p className="text-sm text-zinc-500">
            ເຂົ້າໃຊ້ງານດ້ວຍບັນຊີເຈົ້າຂອງຮ້ານ ຫຼື ພະນັກງານຂາຍ
          </p>
        </CardHeader>
        <CardContent className="space-y-4">
          {params.error ? (
            <div className="rounded-md border border-rose-200 bg-rose-50 px-3 py-2 text-sm font-semibold text-rose-700">
              ຊື່ຜູ້ໃຊ້ ຫຼື ລະຫັດຜ່ານບໍ່ຖືກຕ້ອງ
            </div>
          ) : null}

          <form action={loginAction} className="grid gap-3">
            <input type="hidden" name="next" value={params.next ?? ""} />
            <label className="space-y-1.5">
              <span className="text-sm font-semibold text-zinc-700">
                ຊື່ຜູ້ໃຊ້
              </span>
              <Input name="username" autoComplete="username" required />
            </label>
            <label className="space-y-1.5">
              <span className="text-sm font-semibold text-zinc-700">
                ລະຫັດຜ່ານ
              </span>
              <Input
                name="password"
                type="password"
                autoComplete="current-password"
                required
              />
            </label>
            <Button type="submit" className="w-full">
              <UserRound className="h-4 w-4" aria-hidden />
              ເຂົ້າລະບົບ
            </Button>
          </form>

          <div className="rounded-md bg-zinc-100 p-3 text-xs leading-5 text-zinc-600">
            <p className="font-bold text-zinc-950">ບັນຊີທົດສອບເລີ່ມຕົ້ນ</p>
            <p>ເຈົ້າຂອງ: {users.find((user) => user.role === "OWNER")?.username} / owner123</p>
            <p>ພະນັກງານ: {users.find((user) => user.role === "STAFF")?.username} / staff123</p>
          </div>
        </CardContent>
      </Card>
    </main>
  );
}

