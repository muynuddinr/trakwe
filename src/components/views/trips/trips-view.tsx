'use client';

import React, { useState, useEffect } from 'react';
import dynamic from 'next/dynamic';
import { useFleet } from '@/context/fleet-context';
import { Panel } from '@/components/common/panel';
import { DataTable } from '@/components/common/data-table';
import { Badge } from '@/components/common/badge';
import { uaeRoutePoints, demoDate } from '@/data/uae-records';
import { Play, Pause, RotateCcw } from 'lucide-react';

const FleetMap = dynamic(() => import('@/components/map/fleet-map'), {
  ssr: false,
  loading: () => <div className="map-loading">Loading route map…</div>
});

export function TripsView() {
  const { trips, vehicles } = useFleet();

  const [filterVehicle, setFilterVehicle] = useState('All');
  const [selectedDate, setSelectedDate] = useState(demoDate);
  const [replayIndex, setReplayIndex] = useState(0);
  const [isPlaying, setIsPlaying] = useState(false);

  // Playback timer
  useEffect(() => {
    if (!isPlaying) return;
    const interval = setInterval(() => {
      setReplayIndex((prev) => {
        if (prev >= uaeRoutePoints.length - 1) {
          setIsPlaying(false);
          return prev;
        }
        return prev + 1;
      });
    }, 1000);
    return () => clearInterval(interval);
  }, [isPlaying]);

  const filteredTrips = trips.filter((t) => {
    const matchVeh = filterVehicle === 'All' || t.vehicle === filterVehicle;
    const matchDate = t.date === selectedDate;
    return matchVeh && matchDate;
  });

  const activeVehicle =
    vehicles.find((v) => v.registration === filterVehicle) || vehicles[0];

  const simulatedVehiclePosition = {
    ...activeVehicle,
    lat: uaeRoutePoints[replayIndex][0],
    lng: uaeRoutePoints[replayIndex][1],
    speed: isPlaying ? 68 : 0,
    status: isPlaying ? ('Moving' as const) : ('Idle' as const)
  };

  const summary = filteredTrips[0] || trips[0];

  return (
    <>
      <div className="module-toolbar">
        <div className="filters">
          <select
            aria-label="Filter vehicle"
            value={filterVehicle}
            onChange={(e) => {
              setFilterVehicle(e.target.value);
              setReplayIndex(0);
              setIsPlaying(false);
            }}
          >
            <option value="All">All UAE Vehicles</option>
            {vehicles.map((v) => (
              <option key={v.id} value={v.registration}>
                {v.registration} — {v.name}
              </option>
            ))}
          </select>

          <input
            type="date"
            aria-label="Trip date"
            value={selectedDate}
            onChange={(e) => setSelectedDate(e.target.value)}
          />
        </div>
        <Badge>Sheikh Zayed Rd (E11) Corridor · Demo Telemetry</Badge>
      </div>

      {summary ? (
        <>
          {/* Trip Summary 5 Metrics */}
          <div className="trip-summary">
            <div>
              <small>Trip Distance</small>
              <strong>{summary.distance} km</strong>
            </div>
            <div>
              <small>Travel Duration</small>
              <strong>{summary.duration}</strong>
            </div>
            <div>
              <small>Average Speed</small>
              <strong>{summary.average} km/h</strong>
            </div>
            <div>
              <small>Peak Speed Recorded</small>
              <strong>{summary.max} km/h</strong>
            </div>
            <div>
              <small>Stops / Dwell Time</small>
              <strong>{summary.stop} min</strong>
            </div>
          </div>

          {/* Interactive Route Replay */}
          <div className="route-map">
            <FleetMap
              vehicles={[simulatedVehiclePosition]}
              selected={simulatedVehiclePosition}
              route={uaeRoutePoints}
            />

            <div className="replay">
              <button
                type="button"
                onClick={() => {
                  if (replayIndex >= uaeRoutePoints.length - 1) {
                    setReplayIndex(0);
                  }
                  setIsPlaying(!isPlaying);
                }}
                aria-label={isPlaying ? 'Pause replay' : 'Play route replay'}
              >
                {isPlaying ? <Pause size={16} /> : <Play size={16} />}
              </button>

              <button
                type="button"
                onClick={() => {
                  setReplayIndex(0);
                  setIsPlaying(false);
                }}
                aria-label="Reset route replay"
              >
                <RotateCcw size={16} />
              </button>

              <input
                type="range"
                min={0}
                max={uaeRoutePoints.length - 1}
                value={replayIndex}
                onChange={(e) => {
                  setReplayIndex(Number(e.target.value));
                  setIsPlaying(false);
                }}
                aria-label="Route timeline seek"
              />

              <span>
                Waypoint {replayIndex + 1} of {uaeRoutePoints.length}
              </span>
            </div>
          </div>

          <div className="info-banner">
            Interactive route replay across Dubai E11 Highway corridor. Telemetry points are sampled from simulated OBD-II GPS records.
          </div>
        </>
      ) : (
        <div className="empty panel">
          No trips recorded on this date for the selected filter. Try selecting 23 October 2026.
        </div>
      )}

      {/* Trips Table */}
      <Panel title="UAE Fleet Trip Log" sub="Logged transport corridors">
        <DataTable
          rows={trips}
          columns={[
            ['vehicle', 'Vehicle Plate'],
            ['driver', 'Driver'],
            ['route', 'Trip Corridor Route'],
            ['date', 'Date'],
            ['distance', 'Distance (km)'],
            ['duration', 'Duration'],
            ['average', 'Avg Speed (km/h)'],
            ['status', 'Trip Status']
          ]}
          exportable
          exportName="trackwe-uae-trips"
          action={(r: any) => (
            <button
              type="button"
              className="text-button"
              onClick={() => {
                setFilterVehicle(r.vehicle);
                setReplayIndex(0);
                setIsPlaying(true);
              }}
            >
              Replay Trip
            </button>
          )}
        />
      </Panel>
    </>
  );
}
