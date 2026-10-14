import type { ReactNode } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { formatCurrency, formatNumber } from "@/lib/utils";

export function StatCard({
  label,
  value,
  icon,
  currency = true,
  tone = "indigo"
}: {
  label: string;
  value: number;
  icon: ReactNode;
  currency?: boolean;
  tone?: "indigo" | "emerald" | "sky" | "violet" | "amber";
}) {
  const toneClasses = {
    indigo: "bg-indigo-50 text-indigo-700 ring-indigo-100",
    emerald: "bg-emerald-50 text-emerald-700 ring-emerald-100",
    sky: "bg-sky-50 text-sky-700 ring-sky-100",
    violet: "bg-violet-50 text-violet-700 ring-violet-100",
    amber: "bg-amber-50 text-amber-700 ring-amber-100"
  }[tone];

  return (
    <Card className="group min-w-0 [container-type:inline-size] transition hover:-translate-y-0.5 hover:shadow-lg hover:shadow-slate-200/60">
      <CardContent className="min-h-28 p-4 sm:p-5">
        <div className="flex min-h-9 items-center justify-between gap-2">
          <p className="min-w-0 text-sm font-semibold text-slate-500 [overflow-wrap:anywhere]">{label}</p>
          <div className={`hidden h-9 w-9 shrink-0 items-center justify-center rounded-xl ring-2 transition group-hover:scale-105 sm:flex ${toneClasses}`}>
            {icon}
          </div>
        </div>
        <p className="mt-2 whitespace-normal text-[clamp(1rem,10cqi,1.5rem)] font-extrabold leading-snug tracking-tight text-slate-950 tabular-nums [overflow-wrap:anywhere]">
          {currency ? formatCurrency(value) : formatNumber(value)}
        </p>
      </CardContent>
    </Card>
  );
}
