"use client";
import { Search, Truck } from "lucide-react";

import { FleetMap } from "@/components/maps/fleet-map-client";
import { routeFor } from "@/data/geography";
import { dateLabel } from "@/lib/format";

import { VehicleDetails } from "@/features/vehicles/components/vehicle-details";
import { useWorkspace } from "@/providers/workspace-provider";
export function TrackingPage() {
  const {
    selectedId,
    setSelectedId,
    status,
    setStatus,
    vehicleQuery,
    setVehicleQuery,
    vehicles,
    geofences,
    selected,
    filteredVehicles,
  } = useWorkspace();
  return (
    <div className="tracking-layout">
      <div className="vehicle-list">
        <div className="vehicle-list-header">
          <h3>
            Vehicles <span>{vehicles.length}</span>
          </h3>
          <label className="search">
            <Search size={15} />
            <input
              placeholder="Search vehicle or driver…"
              value={vehicleQuery}
              onChange={(e) => setVehicleQuery(e.target.value)}
            />
          </label>
          <div className="status-tabs">
            {["All", "Moving", "Idle", "Offline"].map((s) => (
              <button
                key={s}
                className={s === status ? "active" : ""}
                onClick={() => setStatus(s)}
              >
                {s}
              </button>
            ))}
          </div>
        </div>
        <div className="vehicle-list-scroll">
          {filteredVehicles.map((v) => (
            <button
              id={`vehicle-${v.id}`}
              key={v.id}
              className={
                "vehicle-row " + (v.id === selectedId ? "selected" : "")
              }
              onClick={() => setSelectedId(v.id)}
            >
              <span className="vehicle-type">
                <Truck size={23} />
              </span>
              <span className="vehicle-copy">
                <b>{v.registration}</b>
                <span>{v.name}</span>
                <small>
                  <i className={"status-dot " + v.status.toLowerCase()} />
                  {v.status} · {dateLabel(v.updated)}
                </small>
              </span>
              <span className="speed">
                {v.speed}
                <small>km/h</small>
              </span>
            </button>
          ))}
          {!filteredVehicles.length && (
            <div className="empty">No matching vehicles</div>
          )}
        </div>
        <div className="vehicle-list-footer">
          Snapshot data · not connected to GPS
        </div>
      </div>
      <div className="tracking-map">
        <FleetMap
          vehicles={filteredVehicles}
          selected={selected}
          onSelect={(v) => {
            setSelectedId(v.id);
            document
              .getElementById(`vehicle-${v.id}`)
              ?.scrollIntoView({ block: "nearest" });
          }}
          geofences={geofences}
          route={selected ? routeFor(selected.region) : undefined}
        />
        {selected && <VehicleDetails vehicle={selected} />}
      </div>
    </div>
  );
}
