"use client";
import { DataTable } from "@/components/table";
import { MapPin, Plus } from "lucide-react";
import { useState } from "react";

import { FleetMap } from "@/components/maps/fleet-map-client";
import { Panel } from "@/components/ui/panel";
import { inDemoArea } from "@/data/geography";

import { useWorkspace } from "@/providers/workspace-provider";
export function GeofencesPage() {
  const { account, setNotice, setGeofences, vehicles, records, geofences } =
    useWorkspace();
  const [draft, setDraft] = useState<[number, number][]>([]);
  const [drawing, setDrawing] = useState<"circle" | "polygon" | null>(null);
  const [zoneName, setZoneName] = useState("");
  const [radius, setRadius] = useState(1000);
  const [zoneVehicles, setZoneVehicles] = useState<string[]>([]);
  return (
    <>
      <div className="module-toolbar">
        <p>Draw boundaries and manage vehicle assignments.</p>
        <div className="filters">
          <button
            className="button"
            onClick={() => {
              setDrawing("circle");
              setDraft([]);
            }}
          >
            <Plus size={14} />
            Circular zone
          </button>
          <button
            className="button primary"
            onClick={() => {
              setDrawing("polygon");
              setDraft([]);
            }}
          >
            <Plus size={14} />
            Polygon zone
          </button>
        </div>
      </div>
      <div className="geofence-layout">
        <div className="geofence-map">
          <FleetMap
            vehicles={[]}
            geofences={geofences}
            draft={draft}
            onPick={(p) => {
              if (!drawing) return;
              if (!inDemoArea(p)) {
                setNotice(
                  "Choose a point near a supported UAE city demo road.",
                );
                return;
              }
              setDraft((d) => (drawing === "circle" ? [p] : [...d, p]));
            }}
          />
        </div>
        <div className="zone-list">
          {drawing && (
            <form
              className="zone-form"
              onSubmit={(e) => {
                e.preventDefault();
                if (draft.length < (drawing === "circle" ? 1 : 3)) {
                  setNotice(
                    "Choose " +
                      (drawing === "circle"
                        ? "a center"
                        : "at least 3 points") +
                      " on the map",
                  );
                  return;
                }
                if (
                  setGeofences((g) => [
                    ...g,
                    {
                      id: `g${Date.now()}`,
                      orgId: account.orgId,
                      name: zoneName,
                      type: drawing,
                      center: draft[0],
                      points: draft,
                      radius,
                      enabled: true,
                      vehicles: zoneVehicles,
                    },
                  ])
                ) {
                  setDrawing(null);
                  setDraft([]);
                  setZoneName("");
                  setZoneVehicles([]);
                  setNotice("Geofence saved");
                }
              }}
            >
              <h3>New {drawing} geofence</h3>
              <p>
                Click the map to select{" "}
                {drawing === "circle" ? "a center" : "at least three corners"}.
              </p>
              <label>
                Name
                <input
                  required
                  value={zoneName}
                  onChange={(e) => setZoneName(e.target.value)}
                />
              </label>
              {drawing === "circle" && (
                <label>
                  Radius (metres)
                  <input
                    required
                    type="number"
                    min={100}
                    max={5000}
                    value={radius}
                    onChange={(e) => setRadius(Number(e.target.value))}
                  />
                </label>
              )}
              <label>
                Assigned vehicles
                <select
                  multiple
                  value={zoneVehicles}
                  onChange={(e) =>
                    setZoneVehicles(
                      Array.from(e.target.selectedOptions, (x) => x.value),
                    )
                  }
                >
                  {vehicles.map((v) => (
                    <option key={v.id} value={v.id}>
                      {v.registration}
                    </option>
                  ))}
                </select>
              </label>
              <small>
                {draft.length} map points selected · use Ctrl/⌘ for multiple
                vehicles
              </small>
              <div className="filters">
                <button className="button primary">Save zone</button>
                <button
                  type="button"
                  className="button"
                  onClick={() => {
                    setDrawing(null);
                    setDraft([]);
                  }}
                >
                  Cancel
                </button>
              </div>
            </form>
          )}
          {geofences.map((g) => (
            <div className="zone-card" key={g.id}>
              <div>
                <MapPin size={18} />
                <input
                  aria-label="Geofence name"
                  value={g.name}
                  onChange={(e) =>
                    setGeofences((gs) =>
                      gs.map((x) =>
                        x.id === g.id ? { ...x, name: e.target.value } : x,
                      ),
                    )
                  }
                />
                <button
                  className={"toggle " + (g.enabled ? "on" : "")}
                  aria-label={"Toggle " + g.name}
                  onClick={() =>
                    setGeofences((gs) =>
                      gs.map((x) =>
                        x.id === g.id ? { ...x, enabled: !x.enabled } : x,
                      ),
                    )
                  }
                />
              </div>
              <small>
                {g.type === "circle"
                  ? `${g.radius.toLocaleString()} m radius`
                  : `${g.points.length} polygon corners`}{" "}
                · {g.vehicles.length} vehicles
              </small>
              <label>
                Vehicle assignment
                <select
                  multiple
                  value={g.vehicles}
                  onChange={(e) => {
                    const ids = Array.from(
                      e.target.selectedOptions,
                      (x) => x.value,
                    );
                    setGeofences((gs) =>
                      gs.map((x) =>
                        x.id === g.id ? { ...x, vehicles: ids } : x,
                      ),
                    );
                  }}
                >
                  {vehicles.map((v) => (
                    <option key={v.id} value={v.id}>
                      {v.registration}
                    </option>
                  ))}
                </select>
              </label>
            </div>
          ))}
        </div>
      </div>
      <Panel title="Seeded geofence activity">
        <DataTable searchable={false} rows={[...records.zoneEvents]} />
      </Panel>
    </>
  );
}
