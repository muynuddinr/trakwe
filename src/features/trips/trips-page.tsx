"use client";
import { Badge, DataTable } from "@/components/table";
import { demoDate } from "@/data/records";
import { Pause, Play, RotateCcw } from "lucide-react";
import { useEffect, useState } from "react";

import { FleetMap } from "@/components/maps/fleet-map-client";
import { Panel } from "@/components/ui/panel";
import { routeFor } from "@/data/geography";

import { useWorkspace } from "@/providers/workspace-provider";
export function TripsPage() {
  const { filterVehicle, setFilterVehicle, vehicles, records, vehicleSelect } =
    useWorkspace();
  const [tripDate, setTripDate] = useState(demoDate);
  const [replay, setReplay] = useState(0);
  const [playing, setPlaying] = useState(false);
  const tripRows = records.trips.filter(
    (t) =>
      (filterVehicle === "All" || t.vehicle === filterVehicle) &&
      t.date === tripDate,
  );
  const trip = tripRows[0];
  const v = vehicles.find((v) => v.registration === trip?.vehicle);
  const points = routeFor(String(trip?.region ?? "Dubai"));
  useEffect(() => {
    if (playing) {
      const t = setInterval(
        () =>
          setReplay((r) => {
            if (r >= points.length - 1) {
              setPlaying(false);
              return r;
            }
            return r + 1;
          }),
        900,
      );
      return () => clearInterval(t);
    }
  }, [playing, points.length]);
  return (
    <>
      <div className="module-toolbar">
        <div className="filters">
          {vehicleSelect}
          <input
            type="date"
            aria-label="Trip date"
            value={tripDate}
            onChange={(e) => {
              setTripDate(e.target.value);
              setReplay(0);
              setPlaying(false);
            }}
          />
        </div>
        <Badge>UAE seeded routes · demo</Badge>
      </div>
      {trip && v ? (
        <>
          <div className="trip-summary">
            {[
              ["Distance", `${trip.distance} km`],
              ["Duration", String(trip.duration)],
              ["Average speed", `${trip.average} km/h`],
              ["Max speed", `${trip.max} km/h`],
              ["Stop duration", `${trip.stop} min`],
            ].map(([label, value]) => (
              <div key={label}>
                <small>{label}</small>
                <strong>{value}</strong>
              </div>
            ))}
          </div>
          <div className="route-map">
            <FleetMap
              vehicles={[
                {
                  ...v,
                  lat: points[Math.min(replay, points.length - 1)][0],
                  lng: points[Math.min(replay, points.length - 1)][1],
                },
              ]}
              route={points}
            />
            <div className="replay">
              <button
                aria-label={playing ? "Pause replay" : "Play replay"}
                onClick={() => {
                  if (replay === points.length - 1) setReplay(0);
                  setPlaying(!playing);
                }}
              >
                {playing ? <Pause size={16} /> : <Play size={16} />}
              </button>
              <button
                onClick={() => {
                  setReplay(0);
                  setPlaying(false);
                }}
                aria-label="Reset replay"
              >
                <RotateCcw size={16} />
              </button>
              <input
                type="range"
                min={0}
                max={points.length - 1}
                value={replay}
                onChange={(e) => setReplay(Number(e.target.value))}
                aria-label="Route replay position"
              />
              <span>
                {replay + 1}/{points.length} points
              </span>
            </div>
          </div>
          <div className="info-banner">
            {trip.route} · illustrative UAE route points. Distance and duration
            are simulated records, not calculated routing results.
          </div>
        </>
      ) : (
        <div className="empty panel">
          No demo trips on this date. Sample trips are available from 9–22
          October 2026.
        </div>
      )}
      <Panel title="Trip history">
        <DataTable
          rows={tripRows}
          columns={[
            ["vehicle", "Vehicle"],
            ["route", "Route"],
            ["date", "Date"],
            ["distance", "km"],
            ["duration", "Duration"],
            ["status", "Status"],
          ]}
          exportable
          action={(r) => (
            <button
              className="text-button"
              onClick={() => {
                setFilterVehicle(String(r.vehicle));
                setReplay(0);
                setPlaying(false);
              }}
            >
              View route
            </button>
          )}
        />
      </Panel>
    </>
  );
}
