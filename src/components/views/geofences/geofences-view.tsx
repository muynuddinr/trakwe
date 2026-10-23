'use client';

import React, { useState } from 'react';
import dynamic from 'next/dynamic';
import { useFleet } from '@/context/fleet-context';
import { Panel } from '@/components/common/panel';
import { DataTable } from '@/components/common/data-table';
import { MapPin, Plus } from 'lucide-react';

const FleetMap = dynamic(() => import('@/components/map/fleet-map'), {
  ssr: false,
  loading: () => <div className="map-loading">Loading geofence boundaries…</div>
});

interface GeofencesViewProps {
  showToast: (msg: string) => void;
}

export function GeofencesView({ showToast }: GeofencesViewProps) {
  const { geofences, addGeofence, toggleGeofence, updateGeofence, vehicles } = useFleet();

  const [drawingType, setDrawingType] = useState<'circle' | 'polygon' | null>(null);
  const [draftPoints, setDraftPoints] = useState<[number, number][]>([]);
  const [zoneName, setZoneName] = useState('');
  const [radiusMeters, setRadiusMeters] = useState(2000);
  const [assignedVehicles, setAssignedVehicles] = useState<string[]>([]);

  const handleMapClick = (point: [number, number]) => {
    if (!drawingType) return;
    if (drawingType === 'circle') {
      setDraftPoints([point]);
    } else {
      setDraftPoints((prev) => [...prev, point]);
    }
  };

  const handleSaveGeofence = (e: React.FormEvent) => {
    e.preventDefault();
    if (!zoneName.trim()) {
      showToast('Please provide a name for this geofence');
      return;
    }
    if (drawingType === 'circle' && !draftPoints.length) {
      showToast('Click the UAE map to place the circle center');
      return;
    }
    if (drawingType === 'polygon' && draftPoints.length < 3) {
      showToast('Click the UAE map to place at least 3 polygon boundary corners');
      return;
    }

    addGeofence({
      name: zoneName.trim(),
      type: drawingType!,
      center: draftPoints[0],
      points: draftPoints,
      radius: radiusMeters,
      enabled: true,
      vehicles: assignedVehicles
    });

    setDrawingType(null);
    setDraftPoints([]);
    setZoneName('');
    setAssignedVehicles([]);
    showToast(`Geofence "${zoneName.trim()}" activated across UAE`);
  };

  return (
    <>
      <div className="module-toolbar">
        <p>Draw logistics boundaries and configure automatic vehicle entry/exit alerts.</p>
        <div className="filters">
          <button
            type="button"
            className="button"
            onClick={() => {
              setDrawingType('circle');
              setDraftPoints([]);
            }}
          >
            <Plus size={14} /> New Circular Zone
          </button>
          <button
            type="button"
            className="button primary"
            onClick={() => {
              setDrawingType('polygon');
              setDraftPoints([]);
            }}
          >
            <Plus size={14} /> New Polygon Zone
          </button>
        </div>
      </div>

      <div className="geofence-layout">
        {/* Map with interactive drawing */}
        <div className="geofence-map">
          <FleetMap
            vehicles={[]}
            geofences={geofences}
            draft={draftPoints}
            onPick={handleMapClick}
          />
        </div>

        {/* Zone List & Form */}
        <div className="zone-list">
          {drawingType && (
            <form className="zone-form" onSubmit={handleSaveGeofence}>
              <h3>New {drawingType === 'circle' ? 'Circular' : 'Polygon'} Geofence</h3>
              <p>
                {drawingType === 'circle'
                  ? 'Click anywhere on the UAE map to define the zone center point.'
                  : 'Click on the UAE map to define at least 3 polygon perimeter corners.'}
              </p>

              <label>
                Geofence Name
                <input
                  required
                  placeholder="e.g. Dubai South Logistics Hub"
                  value={zoneName}
                  onChange={(e) => setZoneName(e.target.value)}
                />
              </label>

              {drawingType === 'circle' && (
                <label>
                  Radius (metres)
                  <input
                    type="number"
                    min={200}
                    max={50000}
                    value={radiusMeters}
                    onChange={(e) => setRadiusMeters(Number(e.target.value))}
                  />
                </label>
              )}

              <label>
                Assigned UAE Fleet Vehicles
                <select
                  multiple
                  value={assignedVehicles}
                  onChange={(e) =>
                    setAssignedVehicles(
                      Array.from(e.target.selectedOptions, (opt) => opt.value)
                    )
                  }
                  style={{ height: 80 }}
                >
                  {vehicles.map((v) => (
                    <option key={v.id} value={v.id}>
                      {v.registration} ({v.name})
                    </option>
                  ))}
                </select>
              </label>

              <small>
                {draftPoints.length} point(s) placed on map · Hold Ctrl/⌘ to select multiple vehicles
              </small>

              <div className="filters">
                <button type="submit" className="button primary">
                  Save Zone
                </button>
                <button
                  type="button"
                  className="button"
                  onClick={() => {
                    setDrawingType(null);
                    setDraftPoints([]);
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
                <MapPin size={18} style={{ color: '#c6ab6d', flexShrink: 0 }} />
                <input
                  aria-label="Geofence name"
                  value={g.name}
                  onChange={(e) => updateGeofence(g.id, { name: e.target.value })}
                />
                <button
                  type="button"
                  className={`toggle ${g.enabled ? 'on' : ''}`}
                  aria-label={`Toggle ${g.name}`}
                  onClick={() => toggleGeofence(g.id)}
                />
              </div>

              <small>
                {g.type === 'circle'
                  ? `${g.radius.toLocaleString()} m radius`
                  : `${g.points.length} boundary points`}{' '}
                · {g.vehicles.length} vehicle(s) monitored
              </small>

              <label>
                Vehicle Assignment
                <select
                  multiple
                  value={g.vehicles}
                  onChange={(e) => {
                    const ids = Array.from(e.target.selectedOptions, (x) => x.value);
                    updateGeofence(g.id, { vehicles: ids });
                  }}
                  style={{ height: 60 }}
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

      <Panel title="Recent Geofence Breach & Crossing Logs">
        <DataTable
          searchable={false}
          rows={[
            {
              id: 'gz-1',
              zone: 'Dubai Logistics City (DLC) Hub',
              vehicle: vehicles[0]?.registration || 'Dubai A-10842',
              event: 'Entry detected · Sheikh Mohammad Bin Zayed corridor',
              time: '23 Oct 2026, 09:24 GST'
            },
            {
              id: 'gz-2',
              zone: 'Jebel Ali Free Zone Port (JAFZA)',
              vehicle: vehicles[1]?.registration || 'Dubai C-49102',
              event: 'Exit detected · Gate 4 weighbridge',
              time: '23 Oct 2026, 10:15 GST'
            },
            {
              id: 'gz-3',
              zone: 'Abu Dhabi Musaffah Sector 9',
              vehicle: vehicles[10]?.registration || 'Abu Dhabi 4-19283',
              event: 'Stationary inside perimeter for 45 min',
              time: '23 Oct 2026, 11:02 GST'
            }
          ]}
        />
      </Panel>
    </>
  );
}
