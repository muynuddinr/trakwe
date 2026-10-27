"use client";
import { Trend } from "@/components/charts";
import { DataTable, exportCSV } from "@/components/table";
import { Download } from "lucide-react";

import { Panel } from "@/components/ui/panel";
import { inPeriod } from "@/lib/demo-data";

import { useWorkspace } from "@/providers/workspace-provider";
export function ReportsPage() {
  const {
    days,
    filterVehicle,
    vehicles,
    records,
    series,
    vehicleSelect,
    periodSelect,
  } = useWorkspace();
  return (
    <>
      <div className="module-toolbar">
        <div className="filters">
          {periodSelect}
          {vehicleSelect}
        </div>
        <button
          className="button"
          onClick={() =>
            exportCSV(
              records.trips.filter(
                (r) =>
                  (filterVehicle === "All" || r.vehicle === filterVehicle) &&
                  inPeriod(r, days),
              ),
              "trackwe-trips",
            )
          }
        >
          <Download size={14} />
          Export trip report
        </button>
      </div>
      <div className="info-banner">
        Reports contain sample records. Date and vehicle filters apply to all
        charts and the trip report below.
      </div>
      <div className="three-grid">
        {[
          ["Distance travelled", "distance", false],
          ["Fuel consumption", "fuel", true],
          ["Driver safety", "score", false],
          ["Vehicle downtime", "downtime", true],
          ["Expense analysis", "expenses", true],
          ["Task completion", "tasks", true],
        ].map(([name, key, bar]) => (
          <Panel key={String(key)} title={String(name)}>
            <Trend
              data={series}
              type={String(key)}
              bar={Boolean(bar)}
              days={days}
            />
          </Panel>
        ))}
      </div>
      <Panel title="Fleet utilization">
        <div className="utilization">
          <strong>
            {Math.round(
              (vehicles.filter((v) => v.status === "Moving").length /
                vehicles.length) *
                100,
            )}
            %
          </strong>
          <span>Moving vehicles in the current demo snapshot</span>
        </div>
      </Panel>
      <Panel title="Vehicle trip report">
        <DataTable
          rows={records.trips.filter(
            (t) =>
              (filterVehicle === "All" || t.vehicle === filterVehicle) &&
              inPeriod(t, days),
          )}
          exportable
        />
      </Panel>
    </>
  );
}
