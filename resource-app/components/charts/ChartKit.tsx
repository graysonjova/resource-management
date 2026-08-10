"use client";

import {
  Bar,
  BarChart,
  Cell,
  LabelList,
  Pie,
  PieChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";

import { CHART_SERIES } from "@/lib/format";

export interface Datum {
  name: string;
  value: number;
  color?: string;
}

const tooltipStyle = {
  backgroundColor: "#ffffff",
  border: "1px solid #C4C4CD",
  borderRadius: 6,
  color: "#2E2E38",
  fontSize: 12,
  boxShadow: "0 8px 24px rgba(26,26,36,0.10)",
};

export function ChartBar({
  data,
  onSelect,
  vertical,
}: {
  data: Datum[];
  onSelect?: (name: string) => void;
  vertical?: boolean;
}) {
  // NOTE: Recharts ignores axes wrapped in React fragments, so XAxis/YAxis are
  // rendered as direct children with props switched by orientation.
  const catTick = { fill: "#747480", fontSize: 11 };
  return (
    <div className="h-[240px] w-full">
      <ResponsiveContainer width="100%" height="100%">
        <BarChart
          data={data}
          layout={vertical ? "vertical" : "horizontal"}
          margin={{ top: 18, right: vertical ? 34 : 12, bottom: 6, left: vertical ? 6 : 0 }}
          barCategoryGap={vertical ? "22%" : "18%"}
        >
          <XAxis
            type={vertical ? "number" : "category"}
            dataKey={vertical ? undefined : "name"}
            hide={vertical}
            interval={0}
            tick={catTick}
            axisLine={{ stroke: "#E1E1E6" }}
            tickLine={false}
          />
          <YAxis
            type={vertical ? "category" : "number"}
            dataKey={vertical ? "name" : undefined}
            width={vertical ? 130 : 26}
            hide={!vertical}
            allowDecimals={false}
            tick={catTick}
            axisLine={false}
            tickLine={false}
          />
          <Tooltip
            contentStyle={tooltipStyle}
            cursor={{ fill: "rgba(46,46,56,0.05)" }}
          />
          <Bar
            dataKey="value"
            radius={vertical ? [0, 4, 4, 0] : [4, 4, 0, 0]}
            onClick={(d: any) => onSelect?.(d.name)}
            cursor={onSelect ? "pointer" : "default"}
          >
            {data.map((d, i) => (
              <Cell key={i} fill={d.color ?? CHART_SERIES[i % CHART_SERIES.length]} />
            ))}
            <LabelList
              dataKey="value"
              position={vertical ? "right" : "top"}
              fill="#2E2E38"
              fontSize={12}
              fontWeight={700}
            />
          </Bar>
        </BarChart>
      </ResponsiveContainer>
    </div>
  );
}

export function ChartDonut({
  data,
  onSelect,
}: {
  data: Datum[];
  onSelect?: (name: string) => void;
}) {
  const total = data.reduce((s, d) => s + d.value, 0);
  return (
    <div className="flex items-center gap-4">
      <ResponsiveContainer width="55%" height={180}>
        <PieChart>
          <Tooltip contentStyle={tooltipStyle} />
          <Pie
            data={data}
            dataKey="value"
            nameKey="name"
            innerRadius={45}
            outerRadius={75}
            paddingAngle={3}
            stroke="#ffffff"
            onClick={(d: any) => onSelect?.(d.name)}
            cursor={onSelect ? "pointer" : "default"}
          >
            {data.map((d, i) => (
              <Cell
                key={i}
                fill={d.color ?? CHART_SERIES[i % CHART_SERIES.length]}
              />
            ))}
          </Pie>
        </PieChart>
      </ResponsiveContainer>
      <ul className="flex-1 space-y-1.5">
        {data.map((d, i) => (
          <li
            key={d.name}
            className="flex cursor-pointer items-center justify-between text-sm"
            onClick={() => onSelect?.(d.name)}
          >
            <span className="flex items-center gap-2 text-ey-ink">
              <span
                className="inline-block h-2.5 w-2.5 rounded-full ring-1 ring-inset ring-black/10"
                style={{
                  backgroundColor: d.color ?? CHART_SERIES[i % CHART_SERIES.length],
                }}
              />
              {d.name}
            </span>
            <span className="font-semibold text-ey-black">
              {d.value}
              <span className="ml-1 text-xs text-ey-gray">
                ({total ? Math.round((d.value / total) * 100) : 0}%)
              </span>
            </span>
          </li>
        ))}
      </ul>
    </div>
  );
}
