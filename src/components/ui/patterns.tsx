import type { FormHTMLAttributes, ReactNode } from "react";
import type { LucideIcon } from "lucide-react";
import { Inbox } from "lucide-react";
import { cn } from "@/lib/utils";
import { Card, CardContent } from "@/components/ui/card";

type Tone = "indigo" | "emerald" | "sky" | "amber" | "rose" | "slate";

const toneStyles: Record<Tone, { icon: string; value: string }> = {
  indigo: { icon: "bg-indigo-50 text-indigo-700", value: "text-indigo-700" },
  emerald: { icon: "bg-emerald-50 text-emerald-700", value: "text-emerald-700" },
  sky: { icon: "bg-sky-50 text-sky-700", value: "text-sky-700" },
  amber: { icon: "bg-amber-50 text-amber-700", value: "text-amber-700" },
  rose: { icon: "bg-rose-50 text-rose-700", value: "text-rose-700" },
  slate: { icon: "bg-slate-100 text-slate-700", value: "text-slate-950" }
};

export function MetricCard({
  label,
  value,
  icon: Icon,
  tone = "slate",
  hint
}: {
  label: string;
  value: ReactNode;
  icon?: LucideIcon;
  tone?: Tone;
  hint?: string;
}) {
  const styles = toneStyles[tone];

  return (
    <Card className="min-w-0 [container-type:inline-size]">
      <CardContent className="min-h-28 p-4 sm:p-5">
        <div className="flex min-h-9 items-center gap-2">
          {Icon ? (
            <span className={cn("flex h-9 w-9 shrink-0 items-center justify-center rounded-xl", styles.icon)}>
              <Icon className="h-4 w-4" aria-hidden />
            </span>
          ) : null}
          <p className="min-w-0 text-sm font-semibold text-slate-500 [overflow-wrap:anywhere]">{label}</p>
        </div>
        <p className={cn("mt-2 whitespace-normal text-[clamp(1rem,10cqi,1.5rem)] font-extrabold leading-snug tabular-nums [overflow-wrap:anywhere]", styles.value)}>{value}</p>
        {hint ? <p className="mt-1 text-xs text-slate-400 [overflow-wrap:anywhere]">{hint}</p> : null}
      </CardContent>
    </Card>
  );
}

export function FilterBar({ className, children, ...props }: FormHTMLAttributes<HTMLFormElement>) {
  return (
    <form
      className={cn(
        "mb-5 grid min-w-0 gap-3 rounded-2xl border border-slate-200/80 bg-white p-3 shadow-sm sm:p-4",
        className
      )}
      {...props}
    >
      {children}
    </form>
  );
}

export function EmptyState({
  title,
  description,
  icon: Icon = Inbox,
  action
}: {
  title: string;
  description?: string;
  icon?: LucideIcon;
  action?: ReactNode;
}) {
  return (
    <div className="flex min-h-40 flex-col items-center justify-center rounded-2xl border border-dashed border-slate-300 bg-slate-50/70 px-5 py-8 text-center">
      <span className="flex h-12 w-12 items-center justify-center rounded-2xl bg-white text-slate-500 shadow-sm ring-1 ring-slate-200">
        <Icon className="h-5 w-5" aria-hidden />
      </span>
      <p className="mt-3 font-extrabold text-slate-900">{title}</p>
      {description ? <p className="mt-1 max-w-md text-sm leading-6 text-slate-500">{description}</p> : null}
      {action ? <div className="mt-4">{action}</div> : null}
    </div>
  );
}

export function SectionLabel({
  title,
  description
}: {
  title: string;
  description?: string;
}) {
  return (
    <div className="mb-3 mt-7 first:mt-0">
      <h3 className="text-lg font-extrabold text-slate-950">{title}</h3>
      {description ? <p className="mt-1 text-sm leading-6 text-slate-500">{description}</p> : null}
    </div>
  );
}
