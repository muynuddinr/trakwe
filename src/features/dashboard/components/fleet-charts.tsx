"use client";
import { Donut, Trend } from "@/components/charts";
import { Panel } from "@/components/ui/panel";
import { useWorkspace } from "@/providers/workspace-provider";
export function FleetCharts() {
  const { days, vehicles, series } = useWorkspace();
  const moving = vehicles.filter((v) => v.status === "Moving").length,
    idle = vehicles.filter((v) => v.status === "Idle").length,
    offline = vehicles.length - moving - idle;

  return (
    <>
      <div className="analytics-grid">
        <Panel title="Fleet status" sub="Current scoped vehicle distribution">
          <Donut
            values={[
              { name: "Moving", value: moving, color: "#2b8c76" },
              { name: "Idle", value: idle, color: "#c5a15b" },
              { name: "Offline", value: offline, color: "#cad2db" },
            ]}
          />
          <div className="panel-footer">
            <i className="pulse" />
            {vehicles.length - offline} vehicles reporting in demo{" "}
            <span>SIMULATED</span>
          </div>
        </Panel>
        <Panel title="Distance travelled" sub="Scoped fleet · kilometres">
          <div className="chart-value">
            {series.reduce((n, r) => n + r.distance, 0).toLocaleString("en-AE")}{" "}
            <small>km</small>
          </div>
          <Trend data={series} days={days} />
        </Panel>
        <Panel title="Fuel consumption" sub="Scoped fleet · litres">
          <div className="chart-value">
            {series
              .reduce((n, r) => n + r.fuel, 0)
              .toLocaleString("en-AE", { maximumFractionDigits: 1 })}{" "}
            <small>L</small>
          </div>
          <Trend data={series} type="fuel" bar days={days} />
        </Panel>
      </div>
    </>
  );
}
