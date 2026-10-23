'use client';

import React from 'react';
import {
  ResponsiveContainer,
  AreaChart,
  Area,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  BarChart,
  Bar,
  PieChart,
  Pie,
  Cell
} from 'recharts';
import { uaeSeries } from '@/data/uae-records';

interface TrendProps {
  type?: string;
  bar?: boolean;
  days?: number;
  data?: any[];
  unit?: string;
}

export function Trend({ type = 'distance', bar = false, days = 7, data, unit }: TrendProps) {
  const chartData = (data || uaeSeries).slice(-days);
  const ChartComponent = bar ? BarChart : AreaChart;

  return (
    <div className="chart" style={{ width: '100%', height: 160 }}>
      <ResponsiveContainer width="100%" height="100%">
        <ChartComponent data={chartData} margin={{ top: 15, right: 12, left: -20, bottom: 0 }}>
          <defs>
            <linearGradient id={`fill-${type}`} x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor="#0c2f4a" stopOpacity={0.25} />
              <stop offset="100%" stopColor="#0c2f4a" stopOpacity={0.01} />
            </linearGradient>
          </defs>
          <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#e9edf2" />
          <XAxis
            dataKey="day"
            tick={{ fontSize: 10, fill: '#8b98a5' }}
            axisLine={false}
            tickLine={false}
          />
          <YAxis
            tick={{ fontSize: 10, fill: '#8b98a5' }}
            axisLine={false}
            tickLine={false}
          />
          <Tooltip
            formatter={(value: any) => [`${value} ${unit || ''}`, type]}
            contentStyle={{
              borderRadius: 8,
              fontSize: 12,
              border: '1px solid #e6eaf0',
              boxShadow: '0 4px 12px rgba(0,0,0,0.06)'
            }}
          />
          {bar ? (
            <Bar dataKey={type} fill="#0c2f4a" radius={[4, 4, 0, 0]} maxBarSize={22} />
          ) : (
            <Area
              type="monotone"
              dataKey={type}
              stroke="#0c2f4a"
              strokeWidth={2.5}
              fill={`url(#fill-${type})`}
            />
          )}
        </ChartComponent>
      </ResponsiveContainer>
    </div>
  );
}

export interface DonutItem {
  name: string;
  value: number;
  color: string;
}

export function Donut({ values }: { values: DonutItem[] }) {
  const total = values.reduce((s, v) => s + v.value, 0);

  return (
    <div className="donut-wrap">
      <div className="donut">
        <ResponsiveContainer width="100%" height="100%">
          <PieChart>
            <Pie
              data={values}
              dataKey="value"
              innerRadius={50}
              outerRadius={68}
              paddingAngle={4}
              stroke="none"
            >
              {values.map((v) => (
                <Cell key={v.name} fill={v.color} />
              ))}
            </Pie>
            <Tooltip
              contentStyle={{
                borderRadius: 8,
                fontSize: 12,
                border: '1px solid #e6eaf0'
              }}
            />
          </PieChart>
        </ResponsiveContainer>
        <div className="donut-center">
          <strong>{total}</strong>
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
