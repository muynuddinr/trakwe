"use client";
import { PersonAvatar } from "@/components/ui/person-avatar";
import { vehiclePhoto } from "@/lib/media";
import { Badge } from "@/components/table";
import { Vehicle } from "@/types";
import { Bell, Clock, MapPin, Plus, Route, Truck, X } from "lucide-react";

import { canCreate } from "@/lib/auth";
import { dateLabel } from "@/lib/format";

import { useWorkspace } from "@/providers/workspace-provider";

export function VehicleDetails({ vehicle }: { vehicle: Vehicle }) {
  const {
    account,
    openVehicle,
    setSelectedId,
    setVehicleQuery,
    setModal,
    setFilterVehicle,
    geofences,
    access,
    go,
  } = useWorkspace();
  const noData = vehicle.updated === "No GPS data";
  return (
    <div className="vehicle-details">
      <div className="detail-title">
        <img
          className="vehicle-detail-thumb"
          src={vehiclePhoto(vehicle)}
          alt={`${vehicle.type} demo photograph`}
        />
        <button
          className="icon-button"
          aria-label="Close vehicle details"
          onClick={() => setSelectedId(null)}
        >
          <X size={16} />
        </button>
      </div>
      <h3>{vehicle.registration}</h3>
      <p>{vehicle.name}</p>
      <Badge>{vehicle.status}</Badge>
      <div className="detail-driver">
        <PersonAvatar name={vehicle.driver} />
        <span>
          <b>{vehicle.driver}</b>
          <small>Assigned driver</small>
        </span>
      </div>
      <div className="detail-grid">
        {[
          ["Speed", noData ? "Unavailable" : `${vehicle.speed} km/h`],
          [
            "Ignition",
            noData
              ? "Unknown"
              : vehicle.status === "Offline"
                ? "Unknown"
                : "On",
          ],
          ["Fuel", noData ? "Unavailable" : `${vehicle.fuel}%`],
          [
            "Temperature",
            vehicle.temperature === null
              ? "Not supported"
              : `${vehicle.temperature} °C`,
          ],
          ["Today’s distance", `${vehicle.distance} km`],
          [
            "Battery",
            noData ? "Unavailable" : `${vehicle.battery.toFixed(1)} V`,
          ],
        ].map(([k, val]) => (
          <div key={k}>
            <small>{k}</small>
            <b>{val}</b>
          </div>
        ))}
      </div>
      <p className="detail-note">
        <MapPin size={13} />
        {geofences
          .filter((g) => g.enabled && g.vehicles.includes(vehicle.id))
          .map((g) => g.name)
          .join(", ") || "No assigned geofence"}
      </p>
      <p className="detail-note">
        <Clock size={13} />
        GPS snapshot: {dateLabel(vehicle.updated)}
      </p>
      <div className="detail-actions">
        {access("trips") && (
          <button
            onClick={() => {
              go("trips");
              setFilterVehicle(vehicle.registration);
            }}
          >
            <Route size={14} />
            Route history
          </button>
        )}
        <button
          onClick={() => {
            openVehicle(vehicle.id);
          }}
        >
          <Truck size={14} />
          Vehicle details
        </button>
        {canCreate(account, "tasks") && (
          <button onClick={() => setModal({ module: "tasks", row: undefined })}>
            <Plus size={14} />
            Assign task
          </button>
        )}
        <button
          onClick={() => {
            go("alerts");
            setFilterVehicle(vehicle.registration);
          }}
        >
          <Bell size={14} />
          View alerts
        </button>
      </div>
    </div>
  );
}
