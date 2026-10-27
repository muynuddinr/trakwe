"use client";
import { mapConfig } from "@/lib/map";
import { Geofence, Vehicle } from "@/types";
import L from "leaflet";
import { Layers, LocateFixed, Maximize, Scan, Tags } from "lucide-react";
import { useEffect, useState } from "react";
import {
  Circle,
  MapContainer,
  Marker,
  Polygon,
  Polyline,
  TileLayer,
  Tooltip,
  useMap,
  useMapEvents,
} from "react-leaflet";
function Controls({
  selected,
  vehicles,
  onPick,
  route,
  compact,
  geofences,
}: {
  route?: [number, number][];
  compact: boolean;
  geofences: Geofence[];
  selected?: Vehicle;
  vehicles: Vehicle[];
  onPick?: (p: [number, number]) => void;
}) {
  const map = useMap();
  useEffect(() => {
    if (route?.length)
      map.fitBounds(L.latLngBounds(route), { padding: [50, 50] });
    else if (compact && vehicles.length)
      map.fitBounds(L.latLngBounds(vehicles.map((v) => [v.lat, v.lng])), {
        padding: [25, 25],
        maxZoom: 12,
      });
  }, [route?.[0]?.[0], route?.[0]?.[1], compact, vehicles.length, map]);
  useMapEvents({ click: (e) => onPick?.([e.latlng.lat, e.latlng.lng]) });
  useEffect(() => {
    if (selected)
      map.flyTo([selected.lat, selected.lng], 13, { duration: 0.6 });
  }, [selected, map]);
  useEffect(() => {
    const ob = new ResizeObserver(() => map.invalidateSize());
    ob.observe(map.getContainer());
    return () => ob.disconnect();
  }, [map]);
  return (
    <div className="map-buttons">
      <button
        title="Recenter selected vehicle"
        onClick={() =>
          map.flyTo(
            selected ? [selected.lat, selected.lng] : mapConfig.center,
            selected ? 14 : 11,
          )
        }
      >
        <LocateFixed size={17} />
      </button>
      <button
        title="Fit vehicles or zones"
        onClick={() =>
          map.fitBounds(
            L.latLngBounds(
              vehicles.length
                ? vehicles.map((v) => [v.lat, v.lng])
                : geofences.length
                  ? geofences.map((g) => g.center)
                  : [mapConfig.center],
            ),
            { padding: [35, 35], maxZoom: 13 },
          )
        }
      >
        <Scan size={17} />
      </button>
    </div>
  );
}
export default function FleetMap({
  vehicles,
  selected,
  onSelect,
  geofences = [],
  route,
  draft,
  onPick,
  compact = false,
}: {
  vehicles: Vehicle[];
  selected?: Vehicle;
  onSelect?: (v: Vehicle) => void;
  geofences?: Geofence[];
  route?: [number, number][];
  draft?: [number, number][];
  onPick?: (p: [number, number]) => void;
  compact?: boolean;
}) {
  const [labels, setLabels] = useState(false),
    [zones, setZones] = useState(true),
    [error, setError] = useState(false);
  return (
    <div className="map-shell">
      <MapContainer
        center={mapConfig.center}
        zoom={compact ? 8 : 11}
        style={{ height: "100%", width: "100%" }}
      >
        <TileLayer
          url={mapConfig.tileUrl}
          attribution={mapConfig.attribution}
          eventHandlers={{
            tileerror: () => setError(true),
            load: () => setError(false),
          }}
        />
        <Controls
          selected={selected}
          vehicles={vehicles}
          onPick={onPick}
          route={route}
          compact={compact}
          geofences={geofences}
        />
        {vehicles.map((v) => (
          <Marker
            key={v.id}
            title={v.registration}
            alt={v.registration}
            position={[v.lat, v.lng]}
            eventHandlers={{ click: () => onSelect?.(v) }}
            icon={L.divIcon({
              className: "",
              html: `<div class="vehicle-marker ${v.status.toLowerCase()} ${selected?.id === v.id ? "selected" : ""}">${v.status === "Moving" ? "➤" : v.status === "Idle" ? "Ⅱ" : "•"}</div>`,
              iconSize: [28, 28],
              iconAnchor: [14, 14],
            })}
          >
            <Tooltip permanent={labels} direction="top">
              {v.registration} · {v.status}
            </Tooltip>
          </Marker>
        ))}
        {zones &&
          geofences
            .filter((g) => g.enabled)
            .map((g) =>
              g.type === "circle" ? (
                <Circle
                  key={g.id}
                  center={g.center}
                  radius={g.radius}
                  pathOptions={{
                    color: "#b49b5c",
                    weight: 2,
                    fillOpacity: 0.12,
                  }}
                >
                  <Tooltip>{g.name}</Tooltip>
                </Circle>
              ) : (
                <Polygon
                  key={g.id}
                  positions={g.points}
                  pathOptions={{
                    color: "#b49b5c",
                    weight: 2,
                    fillOpacity: 0.12,
                  }}
                >
                  <Tooltip>{g.name}</Tooltip>
                </Polygon>
              ),
            )}
        {route && (
          <>
            <Polyline
              positions={route}
              pathOptions={{ color: "#0c526e", weight: 5 }}
            />
            {[route[0], route[3], route[route.length - 1]]
              .filter(Boolean)
              .map((p, i) => (
                <Circle
                  key={i}
                  center={p}
                  radius={100}
                  pathOptions={{
                    color: i === 2 ? "#cb745d" : "#258b75",
                    fillOpacity: 1,
                  }}
                >
                  <Tooltip permanent>
                    {["Start", "Demo stop • 8 min", "End"][i]}
                  </Tooltip>
                </Circle>
              ))}
          </>
        )}
        {draft && draft.length > 0 && (
          <Polyline
            positions={draft}
            pathOptions={{ color: "#b49b5c", dashArray: "6 4" }}
          />
        )}
      </MapContainer>
      <span className="map-demo">DEMO DATA · UAE</span>
      {!compact && (
        <div className="map-options">
          <button
            title="Toggle labels"
            className={labels ? "active" : ""}
            onClick={() => setLabels(!labels)}
          >
            <Tags size={17} />
          </button>
          <button
            title="Toggle geofences"
            className={zones ? "active" : ""}
            onClick={() => setZones(!zones)}
          >
            <Layers size={17} />
          </button>
          <button
            title="Fullscreen map"
            onClick={(e) => {
              const el = e.currentTarget.closest(".map-shell");
              if (document.fullscreenElement) document.exitFullscreen();
              else el?.requestFullscreen?.().catch(() => setError(true));
            }}
          >
            <Maximize size={17} />
          </button>
        </div>
      )}
      <div className="map-legend">
        <span>
          <i className="moving" />
          Moving
        </span>
        <span>
          <i className="idle" />
          Idle
        </span>
        <span>
          <i className="offline" />
          Offline
        </span>
      </div>
      {error && (
        <div className="map-error">
          Map tiles unavailable. Check your network connection.
        </div>
      )}
    </div>
  );
}
