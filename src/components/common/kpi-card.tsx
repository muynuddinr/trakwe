import React from 'react';
import type { LucideIcon } from 'lucide-react';

interface KpiCardProps {
  label: string;
  value: string | number;
  icon: LucideIcon;
  note: string;
  tone?: 'navy' | 'green' | 'gold' | 'gray' | 'red';
}

export function KpiCard({ label, value, icon: Icon, note, tone = 'navy' }: KpiCardProps) {
  return (
    <div className="kpi">
      <div className="kpi-top">
        <span>{label}</span>
        <span className={`kpi-icon ${tone}`}>
          <Icon size={17} />
        </span>
      </div>
      <strong>{value}</strong>
      <small>{note}</small>
    </div>
  );
}
