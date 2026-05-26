"use client";

import { usePathname } from "next/navigation";
import {
  AlertTriangle,
  BarChart3,
  Barcode,
  Bell,
  ClipboardCheck,
  Download,
  History,
  Home,
  LogOut,
  Package,
  PackageCheck,
  PlusSquare,
  ReceiptText,
  ScanBarcode,
  Settings,
  ShoppingCart,
  UsersRound
} from "lucide-react";
import { cn } from "@/lib/utils";
import { staffAllowedRoutes, type AppUser } from "@/lib/auth-config";

const navItems = [
  { href: "/dashboard", label: "ໜ້າລວມ", icon: Home },
  { href: "/alerts", label: "ແຈ້ງເຕືອນ", icon: Bell },
  { href: "/products", label: "ສິນຄ້າ", icon: Package },
  { href: "/products/new", label: "ເພີ່ມສິນຄ້າ", icon: PlusSquare },
  { href: "/stock-alerts", label: "ສະຕ໋ອກຕໍ່າ", icon: AlertTriangle },
  { href: "/barcodes", label: "Barcode", icon: Barcode },
  { href: "/pos", label: "ຂາຍໜ້າຮ້ານ", icon: ScanBarcode },
  { href: "/pos/history", label: "ປະຫວັດບິນ", icon: ReceiptText },
  { href: "/pos/closing", label: "ປິດຍອດ", icon: ClipboardCheck },
  { href: "/members", label: "ສະມາຊິກ", icon: UsersRound },
  { href: "/orders", label: "ອໍເດີອອນໄລ", icon: ShoppingCart },
  { href: "/orders/history", label: "ປະຫວັດອອນໄລ", icon: History },
  {
    href: "/sold-products",
    label: "ສິນຄ້າຂາຍແລ້ວ",
    mobileLabel: "ຂາຍແລ້ວ",
    icon: PackageCheck
  },
  { href: "/reports", label: "ກໍາໄລ", icon: BarChart3 },
  { href: "/exports", label: "Export", icon: Download },
  { href: "/settings", label: "ຕັ້ງຄ່າ", icon: Settings }
];

function getVisibleNavItems(user: AppUser | null) {
  if (user?.role !== "STAFF") {
    return navItems;
  }

  return navItems.filter((item) => staffAllowedRoutes.includes(item.href));
}

function getActiveHref(pathname: string, visibleNavItems: typeof navItems) {
  const matches = visibleNavItems
    .map((item) => item.href)
    .filter((href) => pathname === href || pathname.startsWith(`${href}/`))
    .sort((a, b) => b.length - a.length);

  return matches[0] ?? "/dashboard";
}

export function AppShell({
  children,
  currentUser
}: {
  children: React.ReactNode;
  currentUser: AppUser | null;
}) {
  const pathname = usePathname();
  const visibleNavItems = getVisibleNavItems(currentUser);
  const activeHref = getActiveHref(pathname, visibleNavItems);

  if (pathname === "/login") {
    return <>{children}</>;
  }

  return (
    <div className="app-shell lg:grid lg:grid-cols-[16rem_1fr]">
      <aside className="hidden border-r border-zinc-200 bg-white lg:block">
        <div className="sticky top-0 flex h-screen min-h-0 flex-col gap-4 p-5">
          <div className="shrink-0">
            <p className="text-xs font-semibold uppercase text-zinc-500">VUNDY</p>
            <h1 className="text-xl font-bold tracking-normal text-zinc-950">
              Vundy - POS
            </h1>
          </div>
          <nav className="flex min-h-0 flex-1 flex-col gap-1 overflow-y-auto pr-1">
            {visibleNavItems.map((item) => {
              const Icon = item.icon;
              const active = activeHref === item.href;

              return (
                <a
                  key={item.href}
                  href={item.href}
                  className={cn(
                    "flex min-h-11 items-center gap-3 rounded-md px-3 text-sm font-semibold text-zinc-600 transition",
                    active && "border border-zinc-300 bg-zinc-100 text-zinc-950",
                    !active && "hover:bg-zinc-100 hover:text-zinc-950"
                  )}
                >
                  <Icon className="h-5 w-5" aria-hidden />
                  {item.label}
                </a>
              );
            })}
          </nav>
          <div className="shrink-0 space-y-2 rounded-md border border-zinc-200 p-3">
              <p className="text-xs font-semibold uppercase text-zinc-500">
                {currentUser?.role === "STAFF" ? "STAFF" : "OWNER"}
              </p>
              <p className="truncate text-sm font-bold text-zinc-950">
                {currentUser?.name ?? "ຜູ້ໃຊ້ລະບົບ"}
              </p>
              <a
                href="/logout"
                className="flex min-h-10 items-center justify-center gap-2 rounded-md border border-zinc-200 text-sm font-semibold text-zinc-700 hover:bg-zinc-100"
              >
                <LogOut className="h-4 w-4" aria-hidden />
                ອອກຈາກລະບົບ
              </a>
          </div>
        </div>
      </aside>
      <main className="content-safe-bottom min-w-0 px-4 py-5 sm:px-6 lg:px-8">
        {children}
      </main>
      <nav
        className="mobile-bottom-nav fixed inset-x-0 bottom-0 z-40 flex gap-1 overflow-x-auto border-t border-zinc-200 bg-white px-2 py-2 shadow-lg lg:hidden"
        aria-label="Mobile navigation"
      >
        {visibleNavItems.map((item) => {
          const Icon = item.icon;
          const active = activeHref === item.href;

          return (
            <a
              key={item.href}
              href={item.href}
              className={cn(
                "flex min-h-14 w-[4.75rem] shrink-0 flex-col items-center justify-center gap-1 rounded-md px-1 text-center text-[10px] font-semibold leading-tight text-zinc-500",
                active && "border border-zinc-300 bg-zinc-100 text-zinc-950"
              )}
            >
              <Icon className="h-5 w-5" aria-hidden />
              {"mobileLabel" in item ? item.mobileLabel : item.label}
            </a>
          );
        })}
      </nav>
    </div>
  );
}
