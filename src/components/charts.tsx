"use client";
import {
  Area,
  AreaChart,
  Bar,
  BarChart,
  CartesianGrid,
  Cell,
  Pie,
  PieChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";

export function Trend({
  type = "distance",
  bar = false,
  days = 7,
  data: source,
}: {
  data: Record<string, string | number | null>[];
  type?: string;
  bar?: boolean;
  days?: number;
}) {
  const data = source.slice(-days);
  const Chart = bar ? BarChart : AreaChart;
  return (
    <div className="chart">
      <ResponsiveContainer width="100%" height="100%">
        <Chart
          data={data}
          margin={{ top: 15, right: 12, left: -23, bottom: 0 }}
        >
          <defs>
            <linearGradient id={`fill-${type}`} x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor="#397d9c" stopOpacity={0.22} />
              <stop offset="100%" stopColor="#397d9c" stopOpacity={0} />
            </linearGradient>
          </defs>
          <CartesianGrid
            strokeDasharray="3 3"
            vertical={false}
            stroke="#e9edf2"
          />
          <XAxis
            dataKey="day"
            tick={{ fontSize: 10, fill: "#8b98a5" }}
            axisLine={false}
            tickLine={false}
          />
          <YAxis
            tick={{ fontSize: 10, fill: "#8b98a5" }}
            axisLine={false}
            tickLine={false}
          />
          <Tooltip
            contentStyle={{
              borderRadius: 8,
              fontSize: 12,
              border: "1px solid #e6eaf0",
            }}
          />
          {bar ? (
            <Bar
              dataKey={type}
              fill="#547f96"
              radius={[3, 3, 0, 0]}
              maxBarSize={22}
            />
          ) : (
            <Area
              type="monotone"
              dataKey={type}
              stroke="#367c9c"
              strokeWidth={2.5}
              fill={`url(#fill-${type})`}
            />
          )}
        </Chart>
      </ResponsiveContainer>
    </div>
  );
}
export function Donut({
  values,
}: {
  values: {
    name: string;
    value: number;
    color: string;
  }[];
}) {
  return (
    <div className="donut-wrap">
      <div className="donut">
        <ResponsiveContainer width="100%" height="100%">
          <PieChart>
            <Pie
              data={values}
              dataKey="value"
              innerRadius={54}
              outerRadius={68}
              paddingAngle={4}
              stroke="none"
            >
              {values.map((v) => (
                <Cell key={v.name} fill={v.color} />
              ))}
            </Pie>
            <Tooltip />
          </PieChart>
        </ResponsiveContainer>
        <div className="donut-center">
          <strong>{values.reduce((s, v) => s + v.value, 0)}</strong>
          <small>Vehicles</small>
        </div>
      </div>
      <div className="legend">
        {values.map((v) => (
          <div key={v.name}>
            <i style={{ background: v.color }} />
            <span>{v.name}</span>
            <b>{v.value}</b>
          </div>
        ))}
      </div>
    </div>
  );
}
