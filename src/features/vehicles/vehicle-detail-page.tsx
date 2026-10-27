"use client";
import {
  ArrowLeft,
  ArrowUpRight,
  MapPin,
  Navigation,
  Route,
  Truck,
  Fuel,
  Gauge,
  Radio,
  ShieldCheck,
  Camera,
  Thermometer,
  Clock,
  Activity,
} from "lucide-react";
import { Badge, DataTable } from "@/components/table";
import { Panel } from "@/components/ui/panel";
import { PersonAvatar } from "@/components/ui/person-avatar";
import { FleetMap } from "@/components/maps/fleet-map-client";
import { vehiclePhoto } from "@/lib/media";
import { dateLabel } from "@/lib/format";
import { canEdit } from "@/lib/auth";
import { useWorkspace } from "@/providers/workspace-provider";
import type { RecordItem } from "@/types";

export function VehicleDetailPage() {
  const {
    vehicles,
    records,
    geofences,
    requestedVehicle,
    selectedId,
    account,
    access,
    openVehicle,
    go,
    setModal,
  } = useWorkspace();
  const vehicle = vehicles.find(
    (v) => v.id === (requestedVehicle ?? selectedId),
  );
  if (!vehicle)
    return (
      <div className="vehicle-not-found panel">
        <Truck size={38} />
        <h2>Vehicle unavailable</h2>
        <p>
          Select a vehicle from your fleet. It may not exist or may be outside
          your permitted scope.
        </p>
        <button className="button primary" onClick={() => go("vehicles")}>
          <ArrowLeft size={16} />
          Back to vehicles
        </button>
      </div>
    );
  const noData = vehicle.updated === "No GPS data";
  const driver = records.drivers.find(
    (d) => d.vehicle === vehicle.registration,
  );
  const zones = geofences.filter(
    (g) => g.enabled && g.vehicles.includes(vehicle.id),
  );
  const alerts = records.alerts.filter(
    (a) => a.vehicle === vehicle.registration,
  );
  const trips = records.trips
    .filter((t) => t.vehicle === vehicle.registration)
    .slice(-5)
    .reverse();
  return (
    <div className="vehicle-profile-page">
      <div className="vehicle-profile-toolbar">
        <button className="text-button" onClick={() => go("vehicles")}>
          <ArrowLeft size={15} />
          All vehicles
        </button>
        <span>FLEET / VEHICLE PROFILE</span>
      </div>
      <section className="vehicle-profile-hero">
        <div className="vehicle-hero-photo">
          <img
            src={vehiclePhoto(vehicle)}
            alt={`${vehicle.type} — illustrative fleet photograph`}
          />
          <span className="photo-caption">Illustrative fleet photo</span>
        </div>
        <div className="vehicle-hero-info">
          <div className="vehicle-hero-kicker">
            <span>{vehicle.type}</span>
            <Badge>{vehicle.status}</Badge>
          </div>
          <h2>{vehicle.registration}</h2>
          <p className="vehicle-hero-name">{vehicle.name}</p>
          <div className="vehicle-location">
            <MapPin size={15} />
            {vehicle.region}, United Arab Emirates
          </div>
          <div className="vehicle-identity-grid">
            <div>
              <span>Assigned driver</span>
              <strong>{vehicle.driver}</strong>
            </div>
            <div>
              <span>Tracking device</span>
              <strong>{vehicle.device}</strong>
            </div>
          </div>
          <div className="vehicle-hero-actions">
            {access("tracking") && (
              <button
                className="button primary"
                onClick={() => openVehicle(vehicle.id, "tracking")}
              >
                <Navigation size={16} />
                Track vehicle
                <ArrowUpRight size={15} />
              </button>
            )}
            {canEdit(account, "vehicles") && (
              <button
                className="button"
                onClick={() =>
                  setModal({
                    module: "vehicles",
                    row: vehicle as unknown as RecordItem,
                  })
                }
              >
                Edit vehicle
              </button>
            )}
          </div>
          <div className="vehicle-snapshot">
            <Radio size={13} />
            {noData
              ? "Awaiting first GPS update"
              : `Demo snapshot · ${dateLabel(vehicle.updated)}`}
          </div>
        </div>
      </section>
      <div className="vehicle-stats-grid">
        {[
          {
            label: "Current speed",
            value: noData ? "—" : vehicle.speed,
            unit: "km/h",
            icon: Gauge,
            note:
              vehicle.status === "Moving"
                ? "Vehicle moving"
                : "Vehicle stationary",
          },
          {
            label: "Distance today",
            value: noData ? "—" : vehicle.distance,
            unit: "km",
            icon: Route,
            note: "Recorded demo distance",
          },
          {
            label: "Fuel level",
            value: noData ? "—" : vehicle.fuel,
            unit: "%",
            icon: Fuel,
            note: noData ? "No reading available" : "Latest sensor reading",
          },
          {
            label: "Battery voltage",
            value: noData ? "—" : vehicle.battery.toFixed(1),
            unit: "V",
            icon: Activity,
            note: noData ? "No reading available" : "Latest device reading",
          },
        ].map(({ label, value, unit, icon: Icon, note }) => (
          <div className="vehicle-stat" key={label}>
            <div>
              <span>{label}</span>
              <Icon size={18} />
            </div>
            <strong>
              {value}
              <small>{unit}</small>
            </strong>
            <p>{note}</p>
          </div>
        ))}
      </div>
      <div className="vehicle-profile-grid">
        <div className="vehicle-profile-main">
          <Panel
            title="Vehicle information"
            sub="Fleet identity & device capabilities"
          >
            <div className="vehicle-specifications">
              {[
                ["Registration", vehicle.registration],
                ["Vehicle category", vehicle.type],
                ["Operating region", vehicle.region],
                ["GPS device", vehicle.device],
                [
                  "Ignition",
                  noData || vehicle.status === "Offline"
                    ? "Unknown"
                    : "On · simulated",
                ],
                [
                  "Temperature",
                  vehicle.temperature === null
                    ? "Not supported"
                    : vehicle.temperature + " °C",
                ],
              ].map(([label, value]) => (
                <div key={label}>
                  <span>{label}</span>
                  <strong>{value}</strong>
                </div>
              ))}
            </div>
            <div className="vehicle-capabilities">
              {[
                [ShieldCheck, "CAN diagnostics", vehicle.can],
                [Camera, "Dash camera", vehicle.camera],
                [
                  Thermometer,
                  "Temperature sensor",
                  vehicle.temperature !== null,
                ],
              ].map(([Icon, label, enabled]) => {
                const CapabilityIcon = Icon as typeof ShieldCheck;
                return (
                  <div key={String(label)} className={enabled ? "enabled" : ""}>
                    <CapabilityIcon size={16} />
                    <span>{String(label)}</span>
                    <small>{enabled ? "Supported" : "Not installed"}</small>
                  </div>
                );
              })}
            </div>
          </Panel>
          <Panel
            title="Recent vehicle activity"
            sub="Latest scoped demo records"
          >
            <DataTable
              rows={access("trips") ? trips : alerts}
              columns={
                access("trips")
                  ? [
                      ["date", "Date"],
                      ["route", "Route"],
                      ["distance", "Distance (km)"],
                      ["status", "Status"],
                    ]
                  : [
                      ["type", "Alert"],
                      ["severity", "Severity"],
                      ["status", "Status"],
                    ]
              }
              searchable={false}
              limit={5}
            />
          </Panel>
        </div>
        <aside className="vehicle-profile-side">
          <Panel title="Assigned driver" sub="Demo driver profile">
            <div className="assigned-driver-profile">
              <PersonAvatar name={vehicle.driver} size={72} />
              <h3>{vehicle.driver}</h3>
              <p>{driver?.contact ?? "Assigned to this vehicle"}</p>
              <Badge>{driver?.status ?? "Assigned"}</Badge>
              <div className="driver-profile-metrics">
                <div>
                  <strong>
                    {driver?.score ?? "—"}
                    <small>/100</small>
                  </strong>
                  <span>Safety score</span>
                </div>
                <div>
                  <strong>{driver?.events ?? "—"}</strong>
                  <span>Recorded events</span>
                </div>
              </div>
              <small className="demo-photo-note">
                Stock portrait for demo purposes
              </small>
            </div>
          </Panel>
          <Panel
            title="Location snapshot"
            sub={`${vehicle.region} · UAE`}
            action={
              access("tracking") ? (
                <button
                  className="text-button"
                  onClick={() => openVehicle(vehicle.id, "tracking")}
                >
                  Track
                  <ArrowUpRight size={14} />
                </button>
              ) : undefined
            }
          >
            <div className="vehicle-location-map">
              <FleetMap
                compact
                vehicles={[vehicle]}
                selected={vehicle}
                geofences={zones}
              />
            </div>
            <div className="vehicle-location-footer">
              <MapPin size={14} />
              <span>
                {zones.length
                  ? zones.map((g) => g.name).join(", ")
                  : "No assigned geofence"}
              </span>
            </div>
          </Panel>
        </aside>
      </div>
      <div className="vehicle-profile-note">
        <Clock size={14} />
        All positions and sensor values are demo snapshots. No live device is
        connected.
      </div>
    </div>
  );
}
