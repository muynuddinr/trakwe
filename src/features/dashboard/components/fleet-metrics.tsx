"use client";
import { KPI } from "@/components/ui/kpi";
import { useWorkspace } from "@/providers/workspace-provider";
import { Bell, Clock, Navigation, Radio, Truck } from "lucide-react";
export function FleetMetrics() {
  const { vehicles, employee, activeAlerts } = useWorkspace();
  const moving = vehicles.filter((v) => v.status === "Moving").length,
    idle = vehicles.filter((v) => v.status === "Idle").length,
    offline = vehicles.length - moving - idle;

  return (
    <>
      <div className="kpi-grid">
        <KPI
          label={employee ? "Assigned vehicles" : "Total vehicles"}
          value={vehicles.length}
          icon={Truck}
          note="In your permitted scope"
        />
        <KPI
          label="Moving"
          value={moving}
          icon={Navigation}
          note={`${Math.round((moving / Math.max(vehicles.length, 1)) * 100)}% of visible fleet`}
          tone="green"
        />
        <KPI
          label="Idle"
          value={idle}
          icon={Clock}
          note="Simulated stationary status"
          tone="gold"
        />
        <KPI
          label="Offline"
          value={offline}
          icon={Radio}
          note="No recent demo update"
          tone="gray"
        />
        <KPI
          label="Active alerts"
          value={activeAlerts}
          icon={Bell}
          note="Require your attention"
          tone="red"
        />
      </div>
    </>
  );
}
