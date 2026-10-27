"use client";
import { CalendarDays, RefreshCw } from "lucide-react";

import { organizations } from "@/data/geography";
import { dubaiTime } from "@/lib/format";

import { useWorkspace } from "@/providers/workspace-provider";
export function PageHeading() {
  const {
    account,
    organization,
    setOrganization,
    page,
    setSelectedId,
    setRefresh,
    setNotice,
    setFilterVehicle,
    title,
    periodSelect,
  } = useWorkspace();
  return (
    <div className="page-heading">
      <div>
        <div className="eyebrow">
          FLEET OPERATIONS <span>DEMO</span>
        </div>
        <h1>{title}</h1>
        <p>
          {page === "dashboard"
            ? "Fleet overview and operational insights."
            : page === "tracking"
              ? "Your fleet, all in one place."
              : page === "data-fetching"
                ? "Device connectivity, telemetry ingestion and ignition monitoring"
                : `${title} for your fleet. All records shown are demo data.`}
        </p>
      </div>
      <div className="page-actions">
        {account.role === "Super Admin" && (
          <select
            aria-label="Organization scope"
            value={organization}
            onChange={(e) => {
              setOrganization(e.target.value);
              setSelectedId(null);
              setFilterVehicle("All");
            }}
          >
            <option value="All">All organizations</option>
            {organizations.map((o) => (
              <option key={o.id} value={o.id}>
                {o.name}
              </option>
            ))}
          </select>
        )}
        {["dashboard", "reports", "fuel", "behavior", "diagnostics"].includes(
          page,
        ) && (
          <div className="date-control">
            <CalendarDays size={15} />
            {periodSelect}
          </div>
        )}
        <button
          className="button refresh"
          title="Refresh demo timestamp"
          onClick={() => {
            setRefresh(dubaiTime());
            setNotice("Demo snapshot refreshed. No live device connection.");
          }}
        >
          <RefreshCw size={15} />
          <span>Refresh</span>
        </button>
      </div>
    </div>
  );
}
