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
    return <div className="h-72 w-full rounded-md bg-zinc-50" />;
  }

  return (
    <div className="h-72 w-full">
      <ResponsiveContainer width="100%" height="100%">
        <ComposedChart data={data} margin={{ top: 10, right: 10, left: 0, bottom: 0 }}>
          <CartesianGrid stroke="#e4e4e7" strokeDasharray="4 4" />
          <XAxis dataKey="date" tick={{ fontSize: 12 }} stroke="#71717a" />
          <YAxis
            tick={{ fontSize: 12 }}
            stroke="#71717a"
            tickFormatter={(value) => `${Number(value) / 1000}k`}
          />
          <Tooltip
            formatter={(value) => formatCurrency(Number(value))}
            contentStyle={{
              borderRadius: 8,
              borderColor: "#e4e4e7"
            }}
          />
          <Bar dataKey="sales" name="ຍອດຂາຍ" fill="#0f766e" radius={[4, 4, 0, 0]} />
          <Line
            type="monotone"
            dataKey="profit"
            name="ກໍາໄລ"
            stroke="#f97316"
            strokeWidth={3}
            dot={{ r: 3 }}
          />
        </ComposedChart>
      </ResponsiveContainer>
    </div>
  );
}
