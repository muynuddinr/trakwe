import type { LucideIcon } from "lucide-react";
export function KPI({
  label,
  value,
  icon: Icon,
  note,
  tone = "navy",
}: {
  label: string;
  value: string | number;
  icon: LucideIcon;
  note: string;
  tone?: string;
}) {
  return (
    <div className="kpi">
      <div className="kpi-top">
        <span>{label}</span>
        <span className={"kpi-icon " + tone}>
          <Icon size={17} />
        </span>
      </div>
      <strong>{value}</strong>
      <small>{note}</small>
    </div>
  );
}
