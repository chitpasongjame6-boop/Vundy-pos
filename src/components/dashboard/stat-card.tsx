import type { ReactNode } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { formatCurrency, formatNumber } from "@/lib/utils";

export function StatCard({
  label,
  value,
  icon,
  currency = true
}: {
  label: string;
  value: number;
  icon: ReactNode;
  currency?: boolean;
}) {
  return (
    <Card>
      <CardContent className="flex items-center justify-between gap-4">
        <div>
          <p className="text-sm font-medium text-zinc-500">{label}</p>
          <p className="mt-2 text-2xl font-bold tracking-normal text-zinc-950">
            {currency ? formatCurrency(value) : formatNumber(value)}
          </p>
        </div>
        <div className="flex h-11 w-11 items-center justify-center rounded-md bg-teal-50 text-teal-700">
          {icon}
        </div>
      </CardContent>
    </Card>
  );
}
