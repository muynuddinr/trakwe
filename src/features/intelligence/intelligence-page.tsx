"use client";
import { Trend } from "@/components/charts";
import { Badge, DataTable } from "@/components/table";
import {
  Activity,
  Bell,
  Fuel,
  HelpCircle,
  Power,
  ShieldCheck,
  Thermometer,
} from "lucide-react";

import { KPI } from "@/components/ui/kpi";
import { Panel } from "@/components/ui/panel";
import { inPeriod } from "@/lib/demo-data";

import { useWorkspace } from "@/providers/workspace-provider";
export function IntelligencePage({ module }: { module: string }) {
  const {
    days,
    filterVehicle,
    setFilterVehicle,
    vehicles,
    records,
    series,
    periodSelect,
  } = useWorkspace();
  const m = module;
  const sensors = vehicles.filter((v) =>
    m === "temperature"
      ? v.temperature !== null
      : m === "diagnostics"
        ? v.can
        : true,
  );
  const scoped = sensors.filter(
    (v) => filterVehicle === "All" || v.registration === filterVehicle,
  );
  const rows = (records[m] ?? []).filter(
    (r) =>
      (filterVehicle === "All" || r.vehicle === filterVehicle) &&
      inPeriod(r, days),
  );
  return (
    <>
      <div className="module-toolbar">
        <div className="filters">
          <select
            aria-label="Sensor vehicle"
            value={filterVehicle}
            onChange={(e) => setFilterVehicle(e.target.value)}
          >
            <option>All</option>
            {sensors.map((v) => (
              <option key={v.id}>{v.registration}</option>
            ))}
          </select>
          {periodSelect}
        </div>
        <Badge>Simulated readings</Badge>
      </div>
      {m === "fuel" ? (
        <>
          <div className="three-grid">
            <KPI
              label="Average fuel level"
              value={
                Math.round(
                  scoped.reduce((s, v) => s + v.fuel, 0) /
                    Math.max(scoped.length, 1),
                ) + "%"
              }
              icon={Fuel}
              note={`${scoped.length} demo vehicles`}
            />
            <KPI
              label="Refuelling events"
              value={rows.filter((r) => r.type === "Refuelling").length}
              icon={Activity}
              note="Seeded event history"
            />
            <KPI
              label="Possible fuel drops"
              value={rows.filter((r) => r.type === "Possible fuel drop").length}
              icon={Bell}
              note="Review before taking action"
              tone="gold"
            />
          </div>
          <div className="two-grid">
            <Panel
              title="Fleet fuel consumption trend (L)"
              sub="Filtered demo records"
            >
              <Trend data={series} type="fuel" days={days} />
            </Panel>
            <Panel title="Daily fuel usage (L)">
              <Trend data={series} type="fuel" days={days} bar />
            </Panel>
          </div>
          <Panel title="Fuel by vehicle">
            <DataTable
              rows={scoped.map((v) => ({
                id: v.id,
                vehicle: v.registration,
                level: `${v.fuel}%`,
                consumption: `${Math.round(v.distance / 7)} L · simulated`,
              }))}
            />
          </Panel>
        </>
      ) : m === "temperature" ? (
        <>
          <div className="info-banner">
            <Thermometer size={16} />
            Only temperature-enabled vehicles are shown. Safe range: 2–8 °C.
            Trend is derived from the selected demo sensor records.
          </div>
          <div className="sensor-grid">
            {scoped.slice(0, 8).map((v) => (
              <div className="sensor-card" key={v.id}>
                <small>{v.registration}</small>
                <strong>
                  {v.temperature} <span>°C</span>
                </strong>
                <Badge>
                  {v.temperature! > 8 ? "Out of range" : "Within range"}
                </Badge>
              </div>
            ))}
          </div>
          <Panel title="Temperature trend" sub="Sample readings · °C">
            <Trend data={series} type="temperature" days={days} />
          </Panel>
        </>
      ) : m === "diagnostics" ? (
        <>
          <div className="info-banner">
            CAN bus values are available only on the {sensors.length} compatible
            demo vehicles.
          </div>
          <div className="three-grid">
            <KPI
              label="Healthy vehicles"
              value={rows.filter((r) => r.status === "Healthy").length}
              icon={ShieldCheck}
              note="Supported CAN devices"
              tone="green"
            />
            <KPI
              label="Active diagnostic codes"
              value={rows.filter((r) => r.code !== "No active DTC").length}
              icon={Activity}
              note="Simulated trouble codes"
              tone="gold"
            />
            <KPI
              label="Average battery"
              value={
                (
                  rows.reduce((s, r) => s + Number(r.battery), 0) /
                  Math.max(rows.length, 1)
                ).toFixed(1) + " V"
              }
              icon={Power}
              note="Demo battery voltage"
            />
          </div>
        </>
      ) : (
        <>
          <div className="info-banner">
            <HelpCircle size={16} />
            Demo safety score starts at 100: overspeed −5, harsh braking −3,
            harsh acceleration −3, excessive idling −1. Driver scores are
            derived from the same demo events.
          </div>
          <div className="two-grid">
            <Panel title="Weekly safety score">
              <Trend data={series} type="score" days={days} />
            </Panel>
            <Panel title="Driver comparison">
              <DataTable
                rows={records.drivers}
                columns={[
                  ["name", "Driver"],
                  ["score", "Safety score"],
                  ["events", "Recent events"],
                ]}
                searchable={false}
                limit={4}
              />
            </Panel>
          </div>
        </>
      )}
      <Panel
        title={
          m === "fuel"
            ? "Refuelling & abnormal drop events"
            : m === "temperature"
              ? "Temperature events"
              : m === "diagnostics"
                ? "Vehicle diagnostics · RPM / coolant °C / voltage V"
                : "Recent behavior events"
        }
      >
        <DataTable rows={rows} exportable />
      </Panel>
    </>
  );
}
