"use client";

import { useSyncExternalStore } from "react";
import {
  Bar,
  CartesianGrid,
  ComposedChart,
  Line,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis
} from "recharts";
import type { DailyChartPoint } from "@/types";
import { formatCurrency } from "@/lib/utils";

export function SalesProfitChart({ data }: { data: DailyChartPoint[] }) {
  const mounted = useSyncExternalStore(
    () => () => undefined,
    () => true,
    () => false
  );

  if (!mounted) {
    return <div className="h-72 w-full animate-pulse rounded-xl bg-slate-100" />;
  }

  return (
    <div className="h-72 min-w-0 w-full">
      <ResponsiveContainer
        width="100%"
        height="100%"
        minWidth={0}
        initialDimension={{ width: 800, height: 288 }}
      >
        <ComposedChart data={data} margin={{ top: 10, right: 10, left: 0, bottom: 0 }}>
          <CartesianGrid stroke="#e2e8f0" strokeDasharray="4 4" vertical={false} />
          <XAxis dataKey="date" tick={{ fontSize: 12 }} stroke="#94a3b8" />
          <YAxis
            tick={{ fontSize: 12 }}
            stroke="#94a3b8"
            tickFormatter={(value) => `${Number(value) / 1000}k`}
          />
          <Tooltip
            formatter={(value) => formatCurrency(Number(value))}
            contentStyle={{
              borderRadius: 12,
              borderColor: "#e2e8f0",
              boxShadow: "0 12px 30px rgba(15, 23, 42, 0.12)"
            }}
          />
          <Bar dataKey="sales" name="ຍອດຂາຍ" fill="#6366f1" radius={[6, 6, 0, 0]} />
          <Line
            type="monotone"
            dataKey="profit"
            name="ກໍາໄລ"
            stroke="#10b981"
            strokeWidth={3}
            dot={{ r: 3 }}
          />
        </ComposedChart>
      </ResponsiveContainer>
    </div>
  );
}
