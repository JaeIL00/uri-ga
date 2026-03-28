"use client";

import { useSyncExternalStore } from "react";
import {
  Bar,
  BarChart,
  Brush,
  CartesianGrid,
  Cell,
  Line,
  LineChart,
  Pie,
  PieChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import type { CategoryDatum } from "@/lib/dashboard";
import type { AiReportAnalysis } from "@/lib/types";

function formatCurrency(value: number) {
  return new Intl.NumberFormat("ko-KR", {
    style: "currency",
    currency: "KRW",
    notation: "compact",
    maximumFractionDigits: 0,
  }).format(value);
}

function useChartReady() {
  return useSyncExternalStore(
    () => () => undefined,
    () => true,
    () => false,
  );
}

function ChartFallback() {
  return (
    <div className="flex h-full min-h-[18rem] items-center justify-center rounded-[1.2rem] bg-[color:var(--panel-muted)] text-sm text-[color:var(--ink-soft)]">
      차트 데이터를 정리하고 있어요.
    </div>
  );
}

export function ExpenseDonut({
  data,
  totalExpense,
}: {
  data: CategoryDatum[];
  totalExpense: number;
}) {
  const ready = useChartReady();

  return (
    <div className="panel-card min-h-[22rem]">
      <div className="panel-heading">
        <div>
          <p className="panel-eyebrow">Expense Share</p>
          <h3 className="panel-title">지출 비중</h3>
        </div>
      </div>
      <div className="relative h-[18rem]">
        {ready ? (
          <ResponsiveContainer width="100%" height="100%">
            <PieChart>
              <Pie
                data={data}
                dataKey="amount"
                nameKey="category"
                innerRadius={72}
                outerRadius={108}
                paddingAngle={3}
                stroke="rgba(255,255,255,0.45)"
                strokeWidth={2}
              >
                {data.map((entry) => (
                  <Cell key={entry.category} fill={entry.fill} />
                ))}
              </Pie>
              <Tooltip
                formatter={(value) => formatCurrency(Number(value ?? 0))}
                contentStyle={{
                  borderRadius: 16,
                  border: "1px solid rgba(15, 23, 42, 0.08)",
                  background: "rgba(255, 252, 246, 0.97)",
                }}
              />
            </PieChart>
          </ResponsiveContainer>
        ) : (
          <ChartFallback />
        )}
        <div className="pointer-events-none absolute inset-0 flex flex-col items-center justify-center">
          <div className="text-xs uppercase tracking-[0.24em] text-[color:var(--ink-soft)]">
            Total Expense
          </div>
          <div className="mt-2 text-center text-2xl font-semibold text-[color:var(--ink-strong)]">
            {new Intl.NumberFormat("ko-KR", {
              style: "currency",
              currency: "KRW",
              maximumFractionDigits: 0,
            }).format(totalExpense)}
          </div>
        </div>
      </div>
      <div className="mt-4 grid grid-cols-2 gap-3 text-sm">
        {data.slice(0, 4).map((entry) => (
          <div key={entry.category} className="rounded-[1rem] bg-[color:var(--panel-muted)] p-3">
            <div className="flex items-center gap-2">
              <span
                className="h-2.5 w-2.5 rounded-full"
                style={{ backgroundColor: entry.fill }}
              />
              <span className="text-[color:var(--ink-soft)]">{entry.category}</span>
            </div>
            <div className="mt-2 font-semibold text-[color:var(--ink-strong)]">
              {Math.round(entry.share)}%
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

export function SpendingTrend({
  data,
  range,
  onRangeChange,
}: {
  data: AiReportAnalysis["trend"];
  range: [number, number];
  onRangeChange: (nextRange: [number, number]) => void;
}) {
  const ready = useChartReady();

  return (
    <div className="panel-card min-h-[24rem]">
      <div className="panel-heading">
        <div>
          <p className="panel-eyebrow">Deep Dive</p>
          <h3 className="panel-title">수입·지출 추이</h3>
        </div>
        <p className="text-sm text-[color:var(--ink-soft)]">드래그로 범위를 좁혀 상세 흐름을 볼 수 있어요</p>
      </div>
      <div className="h-[18rem]">
        {ready ? (
          <ResponsiveContainer width="100%" height="100%">
            <LineChart data={data} margin={{ left: 4, right: 12, top: 8, bottom: 8 }}>
              <CartesianGrid stroke="rgba(148, 163, 184, 0.16)" vertical={false} />
              <XAxis dataKey="label" tickLine={false} axisLine={false} />
              <YAxis
                tickFormatter={(value) => `${Math.round(Number(value) / 10000)}만`}
                tickLine={false}
                axisLine={false}
              />
              <Tooltip
                formatter={(value) => formatCurrency(Number(value ?? 0))}
                contentStyle={{
                  borderRadius: 16,
                  border: "1px solid rgba(15, 23, 42, 0.08)",
                  background: "rgba(255, 252, 246, 0.97)",
                }}
              />
              <Line
                type="monotone"
                dataKey="previous"
                stroke="rgba(100, 116, 139, 0.65)"
                strokeDasharray="5 5"
                strokeWidth={2}
                dot={false}
              />
              <Line
                type="monotone"
                dataKey="current"
                stroke="var(--accent-strong)"
                strokeWidth={3}
                activeDot={{ r: 6 }}
              />
              <Brush
                dataKey="label"
                height={26}
                stroke="var(--accent-strong)"
                fill="rgba(15, 118, 110, 0.1)"
                travellerWidth={12}
                startIndex={range[0]}
                endIndex={range[1]}
                onChange={(next) => {
                  if (
                    typeof next?.startIndex === "number" &&
                    typeof next?.endIndex === "number"
                  ) {
                    onRangeChange([next.startIndex, next.endIndex]);
                  }
                }}
              />
            </LineChart>
          </ResponsiveContainer>
        ) : (
          <ChartFallback />
        )}
      </div>
    </div>
  );
}

export function CategoryComparison({ data }: { data: CategoryDatum[] }) {
  const ready = useChartReady();

  return (
    <div className="panel-card min-h-[24rem]">
      <div className="panel-heading">
        <div>
          <p className="panel-eyebrow">Category Balance</p>
          <h3 className="panel-title">카테고리 비교</h3>
        </div>
      </div>
      <div className="h-[18rem]">
        {ready ? (
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={data} margin={{ left: 0, right: 12, top: 8, bottom: 8 }}>
              <CartesianGrid stroke="rgba(148, 163, 184, 0.14)" vertical={false} />
              <XAxis dataKey="category" tickLine={false} axisLine={false} />
              <YAxis hide />
              <Tooltip
                formatter={(value, _name, item) => [
                  `${formatCurrency(Number(value ?? 0))} / 기준 ${
                    item.payload.benchmarkDelta > 0 ? "+" : ""
                  }${item.payload.benchmarkDelta.toFixed(1)}%`,
                  "지출",
                ]}
                contentStyle={{
                  borderRadius: 16,
                  border: "1px solid rgba(15, 23, 42, 0.08)",
                  background: "rgba(255, 252, 246, 0.97)",
                }}
              />
              <Bar dataKey="amount" radius={[12, 12, 6, 6]}>
                {data.map((entry) => (
                  <Cell key={entry.category} fill={entry.fill} />
                ))}
              </Bar>
            </BarChart>
          </ResponsiveContainer>
        ) : (
          <ChartFallback />
        )}
      </div>
    </div>
  );
}
