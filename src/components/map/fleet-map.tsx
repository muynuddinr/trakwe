'use client';

import React, { useEffect, useState } from 'react';
import {
  MapContainer,
  TileLayer,
  Marker,
  Tooltip,
  Polyline,
  Circle,
  Polygon,
  useMap,
  useMapEvents
} from 'react-leaflet';
import L from 'leaflet';
import { Vehicle, Geofence } from '@/types';
import { mapConfig } from '@/lib/map';
import { LocateFixed, Scan, Tags, Layers, Maximize } from 'lucide-react';

interface ControlsProps {
  selected?: Vehicle | null;
  vehicles: Vehicle[];
  onPick?: (point: [number, number]) => void;
}

function Controls({ selected, vehicles, onPick }: ControlsProps) {
  const map = useMap();

  useMapEvents({
    click: (e) => {
      onPick?.([e.latlng.lat, e.latlng.lng]);
    }
  });

  useEffect(() => {
    if (selected && selected.lat && selected.lng) {
      map.flyTo([selected.lat, selected.lng], 14, { duration: 0.75 });
    }
  }, [selected, map]);

  useEffect(() => {
    const observer = new ResizeObserver(() => map.invalidateSize());
    observer.observe(map.getContainer());
    return () => observer.disconnect();
  }, [map]);

  const fitAllVehicles = () => {
    if (!vehicles.length) return;
    const valid = vehicles.filter((v) => v.lat && v.lng);
    if (!valid.length) return;
    const bounds = L.latLngBounds(valid.map((v) => [v.lat, v.lng]));
    map.fitBounds(bounds, { padding: [40, 40] });
  };

  const recenter = () => {
    if (selected && selected.lat && selected.lng) {
      map.flyTo([selected.lat, selected.lng], 14);
    } else {
      map.flyTo(mapConfig.center, mapConfig.zoom);
    }
  };

  return (
    <div className="map-buttons">
      <button
        type="button"
        title="Recenter selected vehicle / Dubai"
        onClick={recenter}
        aria-label="Recenter map"
      >
        <LocateFixed size={17} />
      </button>
      <button
        type="button"
        title="Fit all UAE fleet vehicles"
        onClick={fitAllVehicles}
        aria-label="Fit all vehicles"
      >
        <Scan size={17} />
      </button>
    </div>
  );
}

interface FleetMapProps {
  vehicles: Vehicle[];
  selected?: Vehicle | null;
  onSelect?: (v: Vehicle) => void;
  geofences?: Geofence[];
  route?: [number, number][];
  draft?: [number, number][];
  onPick?: (point: [number, number]) => void;
  compact?: boolean;
}

export default function FleetMap({
  vehicles,
  selected,
  onSelect,
  geofences = [],
  route,
  draft,
  onPick,
  compact = false
}: FleetMapProps) {
  const [showLabels, setShowLabels] = useState(false);
  const [showZones, setShowZones] = useState(true);
  const [tileError, setTileError] = useState(false);

  return (
    <div className="map-shell">
      <MapContainer
        center={mapConfig.center}
        zoom={compact ? 10 : 11}
        style={{ height: '100%', width: '100%' }}
      >
        <TileLayer
          url={mapConfig.tileUrl}
          attribution={mapConfig.attribution}
          eventHandlers={{
            tileerror: () => setTileError(true),
            load: () => setTileError(false)
          }}
        />

        <Controls selected={selected} vehicles={vehicles} onPick={onPick} />

        {/* Vehicle markers */}
        {vehicles.map((v) => {
          const isSelected = selected?.id === v.id;
          const statusClass = v.status.toLowerCase();
          const markerSymbol = v.isLiveHardware ? '📡' : v.status === 'Moving' ? '➤' : v.status === 'Idle' ? 'Ⅱ' : '•';
          const liveClass = v.isLiveHardware ? 'live-device-marker' : '';

          const icon = L.divIcon({
            className: '',
            html: `<div class="vehicle-marker ${statusClass} ${isSelected ? 'selected' : ''} ${liveClass}">${markerSymbol}</div>`,
            iconSize: [28, 28],
            iconAnchor: [14, 14]
          });

          return (
            <Marker
              key={v.id}
              position={[v.lat, v.lng]}
              eventHandlers={{
                click: () => onSelect?.(v)
              }}
              icon={icon}
            >
              <Tooltip permanent={showLabels} direction="top" offset={[0, -10]}>
                <strong>{v.registration}</strong> · {v.name} ({v.status})
                {v.isLiveHardware && ' [FMC920 LIVE]'}
              </Tooltip>
            </Marker>
          );
        })}

        {/* Geofences */}
        {showZones &&
          geofences
            .filter((g) => g.enabled)
            .map((g) => {
              if (g.type === 'circle') {
                return (
                  <Circle
                    key={g.id}
                    center={g.center}
                    radius={g.radius}
                    pathOptions={{ color: '#c6ab6d', weight: 2, fillOpacity: 0.14 }}
                  >
                    <Tooltip>{g.name} (Circular Geofence)</Tooltip>
                  </Circle>
                );
              }
              return (
                <Polygon
                  key={g.id}
                  positions={g.points}
                  pathOptions={{ color: '#c6ab6d', weight: 2, fillOpacity: 0.14 }}
                >
                  <Tooltip>{g.name} (Polygon Boundary)</Tooltip>
                </Polygon>
              );
            })}

        {/* Trip route polyline */}
        {route && route.length > 0 && (
          <>
            <Polyline
              positions={route}
              pathOptions={{ color: '#0c2f4a', weight: 5, opacity: 0.85 }}
            />
            {/* Start, Stop and End markers */}
            <Circle
              center={route[0]}
              radius={180}
              pathOptions={{ color: '#2d8c75', fillColor: '#2d8c75', fillOpacity: 1 }}
            >
              <Tooltip permanent>Trip Start · JAFZA Port</Tooltip>
            </Circle>

            {route.length > 4 && (
              <Circle
                center={route[3]}
                radius={120}
                pathOptions={{ color: '#c6ab6d', fillColor: '#c6ab6d', fillOpacity: 1 }}
              >
                <Tooltip permanent>Delivery Stop · Al Barsha (12 min)</Tooltip>
              </Circle>
            )}

            <Circle
              center={route[route.length - 1]}
              radius={180}
              pathOptions={{ color: '#c47b6b', fillColor: '#c47b6b', fillOpacity: 1 }}
            >
              <Tooltip permanent>Destination · Downtown Dubai</Tooltip>
            </Circle>
          </>
        )}

        {/* Draft polygon / circle drawing */}
        {draft && draft.length > 0 && (
          <Polyline
            positions={draft}
            pathOptions={{ color: '#c6ab6d', dashArray: '6 4', weight: 2 }}
          />
        )}
      </MapContainer>

      {/* UAE Telemetry Status Badge */}
      <span className={`map-demo ${vehicles.some((v) => v.isLiveHardware) ? 'live-hardware-active' : ''}`}>
        {vehicles.some((v) => v.isLiveHardware)
          ? '● LIVE HARDWARE TELEMETRY ACTIVE · TELTONIKA FMC920'
          : 'DEMO DATA · UNITED ARAB EMIRATES (OSM)'}
      </span>

      {!compact && (
        <div className="map-options">
          <button
            type="button"
            title="Toggle vehicle labels"
            className={showLabels ? 'active' : ''}
            onClick={() => setShowLabels(!showLabels)}
            aria-label="Toggle labels"
          >
            <Tags size={17} />
          </button>
          <button
            type="button"
            title="Toggle geofence zones"
            className={showZones ? 'active' : ''}
            onClick={() => setShowZones(!showZones)}
            aria-label="Toggle zones"
          >
            <Layers size={17} />
          </button>
          <button
            type="button"
            title="Toggle Fullscreen"
            onClick={(e) => {
              const el = e.currentTarget.closest('.map-shell');
              if (document.fullscreenElement) {
                document.exitFullscreen();
              } else {
                el?.requestFullscreen?.();
              }
            }}
            aria-label="Toggle fullscreen"
          >
            <Maximize size={17} />
          </button>
        </div>
      )}

      {/* Legend */}
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

      {tileError && (
        <div className="map-error">
          OpenStreetMap tiles unavailable. Please verify network connectivity.
        </div>
      )}
    </div>
  );
}
