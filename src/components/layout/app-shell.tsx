"use client";

import Image from "next/image";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { useState } from "react";
import type { LucideIcon } from "lucide-react";
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
  Menu,
  Package,
  PackageCheck,
  PlusSquare,
  ReceiptText,
  ScanBarcode,
  Settings,
  ShoppingCart,
  Tags,
  TimerReset,
  UsersRound,
  Warehouse,
  X
} from "lucide-react";
import { cn } from "@/lib/utils";
import { staffAllowedRoutes, type AppUser } from "@/lib/auth-config";

type NavItem = {
  href: string;
  label: string;
  mobileLabel?: string;
  icon: LucideIcon;
};

const navSections: Array<{ label: string; items: NavItem[] }> = [
  {
    label: "ພາບລວມ",
    items: [
      { href: "/dashboard", label: "ໜ້າລວມ", icon: Home },
      { href: "/alerts", label: "ແຈ້ງເຕືອນ", icon: Bell }
    ]
  },
  {
    label: "ການຂາຍ",
    items: [
      { href: "/pos", label: "ຂາຍໜ້າຮ້ານ", icon: ScanBarcode },
      { href: "/pos/history", label: "ປະຫວັດບິນ", icon: ReceiptText },
      { href: "/pos/closing", label: "ປິດຍອດ", icon: ClipboardCheck },
      { href: "/pos/shifts", label: "ກະຂາຍ / ເງິນສົດ", icon: TimerReset },
      { href: "/orders", label: "ອໍເດີອອນໄລ", icon: ShoppingCart },
      { href: "/orders/history", label: "ປະຫວັດອອນໄລ", icon: History }
    ]
  },
  {
    label: "ສິນຄ້າ ແລະ ສະຕ໋ອກ",
    items: [
      { href: "/products", label: "ສິນຄ້າ", icon: Package },
      { href: "/products/new", label: "ເພີ່ມສິນຄ້າ", icon: PlusSquare },
      { href: "/stock-alerts", label: "ສະຕ໋ອກຕໍ່າ", icon: AlertTriangle },
      { href: "/barcodes", label: "Barcode", icon: Barcode },
      { href: "/inventory", label: "ຮັບເຂົ້າ / ປະຫວັດສະຕ໋ອກ", icon: Warehouse },
      {
        href: "/sold-products",
        label: "ສິນຄ້າຂາຍແລ້ວ",
        mobileLabel: "ຂາຍແລ້ວ",
        icon: PackageCheck
      }
    ]
  },
  {
    label: "ຈັດການ",
    items: [
      { href: "/members", label: "ສະມາຊິກ", icon: UsersRound },
      { href: "/promotions", label: "ໂປຣໂມຊັນ", icon: Tags },
      { href: "/reports", label: "ລາຍງານກໍາໄລ", icon: BarChart3 },
      { href: "/exports", label: "Export ຂໍ້ມູນ", icon: Download },
      { href: "/settings", label: "ຕັ້ງຄ່າ", icon: Settings }
    ]
  }
];

const navItems = navSections.flatMap((section) => section.items);

function getVisibleNavItems(user: AppUser | null) {
  if (user?.role !== "STAFF") return navItems;
  return navItems.filter((item) => staffAllowedRoutes.includes(item.href));
}

function getActiveHref(pathname: string, visibleNavItems: NavItem[]) {
  const matches = visibleNavItems
    .map((item) => item.href)
    .filter((href) => pathname === href || pathname.startsWith(`${href}/`))
    .sort((a, b) => b.length - a.length);

  return matches[0] ?? "/dashboard";
}

function NavLink({
  item,
  active,
  compact = false,
  onClick
}: {
  item: NavItem;
  active: boolean;
  compact?: boolean;
  onClick?: () => void;
}) {
  const Icon = item.icon;

  return (
    <Link
      href={item.href}
      onClick={onClick}
      aria-current={active ? "page" : undefined}
      className={cn(
        "group flex items-center gap-3 rounded-xl text-sm font-semibold transition-all",
        compact ? "min-h-11 px-3" : "min-h-12 px-3.5",
        active
          ? "bg-indigo-600 text-white shadow-sm shadow-indigo-200"
          : "text-slate-600 hover:bg-slate-100 hover:text-slate-950"
      )}
    >
      <span
        className={cn(
          "flex h-8 w-8 shrink-0 items-center justify-center rounded-lg transition",
          active
            ? "bg-white/15 text-white"
            : "bg-slate-100 text-slate-500 group-hover:bg-white group-hover:text-indigo-600"
        )}
      >
        <Icon className="h-[1.125rem] w-[1.125rem]" aria-hidden />
      </span>
      <span>{item.label}</span>
    </Link>
  );
}

export function AppShell({
  children,
  currentUser
}: {
  children: React.ReactNode;
  currentUser: AppUser | null;
}) {
  const pathname = usePathname();
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const visibleNavItems = getVisibleNavItems(currentUser);
  const activeHref = getActiveHref(pathname, visibleNavItems);
  const activeItem = visibleNavItems.find((item) => item.href === activeHref);
  const mobilePrimaryHrefs =
    currentUser?.role === "STAFF"
      ? ["/pos", "/pos/history", "/pos/closing", "/pos/shifts", "/members"]
      : ["/dashboard", "/pos", "/orders", "/products"];
  const mobilePrimaryItems = mobilePrimaryHrefs
    .map((href) => visibleNavItems.find((item) => item.href === href))
    .filter((item): item is NavItem => Boolean(item));

  if (pathname === "/login") return <>{children}</>;

  return (
    <div className="app-shell lg:grid lg:grid-cols-[17.5rem_minmax(0,1fr)]">
      <aside className="hidden border-r border-slate-200/80 bg-white/95 lg:block">
        <div className="sticky top-0 flex h-screen min-h-0 flex-col px-4 py-5">
          <Link
            href={currentUser?.role === "STAFF" ? "/pos" : "/dashboard"}
            className="mb-5 flex shrink-0 items-center gap-3 px-2"
          >
            <span className="relative h-11 w-11 overflow-hidden rounded-2xl border border-indigo-100 bg-white shadow-sm">
              <Image src="/vundy-logo.png" alt="Vundy" fill sizes="44px" className="object-cover" />
            </span>
            <span className="min-w-0">
              <span className="block text-[11px] font-bold uppercase tracking-[0.18em] text-indigo-600">Vundy</span>
              <span className="block truncate text-lg font-extrabold text-slate-950">POS & Stock</span>
            </span>
          </Link>

          <nav className="min-h-0 flex-1 space-y-5 overflow-y-auto pr-1" aria-label="ເມນູຫຼັກ">
            {navSections.map((section) => {
              const sectionItems = section.items.filter((item) =>
                visibleNavItems.some((visibleItem) => visibleItem.href === item.href)
              );

              if (!sectionItems.length) return null;

              return (
                <div key={section.label}>
                  <p className="mb-1.5 px-3 text-[11px] font-bold uppercase tracking-wider text-slate-400">
                    {section.label}
                  </p>
                  <div className="space-y-1">
                    {sectionItems.map((item) => (
                      <NavLink key={item.href} item={item} active={activeHref === item.href} compact />
                    ))}
                  </div>
                </div>
              );
            })}
          </nav>

          <div className="mt-4 shrink-0 rounded-2xl border border-slate-200 bg-slate-50 p-3.5">
            <div className="flex items-center gap-3">
              <span className="flex h-9 w-9 items-center justify-center rounded-full bg-indigo-100 text-sm font-extrabold text-indigo-700">
                {(currentUser?.name ?? "V").slice(0, 1).toUpperCase()}
              </span>
              <div className="min-w-0 flex-1">
                <p className="truncate text-sm font-bold text-slate-950">{currentUser?.name ?? "ຜູ້ໃຊ້ລະບົບ"}</p>
                <p className="text-xs font-semibold text-slate-500">
                  {currentUser?.role === "STAFF" ? "ພະນັກງານຂາຍ" : "ເຈົ້າຂອງຮ້ານ"}
                </p>
              </div>
            </div>
            <Link
              href="/logout"
              className="mt-3 flex min-h-10 items-center justify-center gap-2 rounded-xl border border-slate-200 bg-white text-sm font-semibold text-slate-600 transition hover:border-rose-200 hover:bg-rose-50 hover:text-rose-700"
            >
              <LogOut className="h-4 w-4" aria-hidden />
              ອອກຈາກລະບົບ
            </Link>
          </div>
        </div>
      </aside>

      <div className="min-w-0">
        <header className="sticky top-0 z-30 flex h-16 items-center justify-between border-b border-slate-200/80 bg-white/90 px-4 backdrop-blur lg:hidden">
          <Link href={currentUser?.role === "STAFF" ? "/pos" : "/dashboard"} className="flex min-w-0 items-center gap-2.5">
            <span className="relative h-9 w-9 shrink-0 overflow-hidden rounded-xl border border-indigo-100 bg-white">
              <Image src="/vundy-logo.png" alt="Vundy" fill sizes="36px" className="object-cover" />
            </span>
            <span className="min-w-0">
              <span className="block text-[10px] font-bold uppercase tracking-wider text-indigo-600">Vundy POS</span>
              <span className="block truncate text-sm font-extrabold text-slate-950">{activeItem?.label ?? "ໜ້າລວມ"}</span>
            </span>
          </Link>
          <button
            type="button"
            onClick={() => setMobileMenuOpen(true)}
            className="flex h-10 w-10 items-center justify-center rounded-xl border border-slate-200 bg-white text-slate-700 shadow-sm"
            aria-label="ເປີດເມນູ"
          >
            <Menu className="h-5 w-5" aria-hidden />
          </button>
        </header>

        <main className="content-safe-bottom min-w-0 px-4 py-5 sm:px-6 sm:py-7 lg:px-8 xl:px-10">
          <div className="mx-auto w-full max-w-[1600px]">{children}</div>
        </main>
      </div>

      <nav
        className="mobile-bottom-nav fixed inset-x-0 bottom-0 z-40 grid grid-cols-5 border-t border-slate-200/80 bg-white/95 px-1.5 pb-[max(0.5rem,env(safe-area-inset-bottom))] pt-1.5 shadow-[0_-8px_30px_rgba(15,23,42,0.08)] backdrop-blur lg:hidden"
        aria-label="ເມນູດ່ວນ"
      >
        {mobilePrimaryItems.map((item) => {
          const Icon = item.icon;
          const active = activeHref === item.href;

          return (
            <Link
              key={item.href}
              href={item.href}
              aria-current={active ? "page" : undefined}
              className={cn(
                "flex min-h-[3.65rem] min-w-0 flex-col items-center justify-center gap-1 rounded-xl px-1 text-center text-[10px] font-bold leading-tight transition",
                active ? "bg-indigo-50 text-indigo-700" : "text-slate-500"
              )}
            >
              <Icon className="h-5 w-5" aria-hidden />
              <span className="max-w-full truncate">{item.mobileLabel ?? item.label}</span>
            </Link>
          );
        })}
        <button
          type="button"
          onClick={() => setMobileMenuOpen(true)}
          className={cn(
            "flex min-h-[3.65rem] min-w-0 flex-col items-center justify-center gap-1 rounded-xl px-1 text-[10px] font-bold leading-tight",
            mobileMenuOpen ? "bg-indigo-50 text-indigo-700" : "text-slate-500"
          )}
        >
          <Menu className="h-5 w-5" aria-hidden />
          ເພີ່ມເຕີມ
        </button>
      </nav>

      {mobileMenuOpen ? (
        <div className="fixed inset-0 z-50 lg:hidden">
          <button
            type="button"
            className="absolute inset-0 bg-slate-950/40 backdrop-blur-[2px]"
            onClick={() => setMobileMenuOpen(false)}
            aria-label="ປິດເມນູ"
          />
          <aside className="absolute inset-y-0 right-0 flex w-[min(88vw,23rem)] flex-col bg-white shadow-2xl">
            <div className="flex items-center justify-between border-b border-slate-200 px-5 py-4">
              <div>
                <p className="text-xs font-bold uppercase tracking-wider text-indigo-600">Vundy POS</p>
                <p className="text-lg font-extrabold text-slate-950">ເມນູທັງໝົດ</p>
              </div>
              <button
                type="button"
                onClick={() => setMobileMenuOpen(false)}
                className="flex h-10 w-10 items-center justify-center rounded-xl bg-slate-100 text-slate-700"
                aria-label="ປິດເມນູ"
              >
                <X className="h-5 w-5" aria-hidden />
              </button>
            </div>
            <nav className="flex-1 space-y-1 overflow-y-auto p-4">
              {visibleNavItems.map((item) => (
                <NavLink
                  key={item.href}
                  item={item}
                  active={activeHref === item.href}
                  onClick={() => setMobileMenuOpen(false)}
                />
              ))}
            </nav>
            <div className="border-t border-slate-200 p-4">
              <p className="mb-3 truncate text-sm font-bold text-slate-900">{currentUser?.name ?? "ຜູ້ໃຊ້ລະບົບ"}</p>
              <Link
                href="/logout"
                className="flex min-h-11 items-center justify-center gap-2 rounded-xl bg-rose-50 text-sm font-bold text-rose-700"
              >
                <LogOut className="h-4 w-4" aria-hidden />
                ອອກຈາກລະບົບ
              </Link>
            </div>
          </aside>
        </div>
      ) : null}
    </div>
  );
}
