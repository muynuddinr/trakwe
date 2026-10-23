'use client';

import React, { useState } from 'react';
import { useFleet } from '@/context/fleet-context';
import { Panel } from '@/components/common/panel';
import { Trend } from '@/components/common/charts';
import { DataTable, exportCSV } from '@/components/common/data-table';
import { Download } from 'lucide-react';

export function ReportsView() {
  const { vehicles, trips } = useFleet();
  const [days, setDays] = useState(7);
  const [filterVehicle, setFilterVehicle] = useState('All');

  const filteredTrips = trips.filter(
    (t) => filterVehicle === 'All' || t.vehicle === filterVehicle
  );

  const movingCount = vehicles.filter((v) => v.status === 'Moving').length;
  const utilizationPercent = vehicles.length
    ? Math.round((movingCount / vehicles.length) * 100)
    : 68;

  const reportSections = [
    { name: 'Distance Travelled (km)', key: 'distance', bar: false, unit: 'km' },
    { name: 'Fuel Consumption (L)', key: 'fuel', bar: true, unit: 'L' },
    { name: 'Driver Safety Index', key: 'score', bar: false, unit: 'pts' },
    { name: 'Vehicle Downtime (hours)', key: 'downtime', bar: true, unit: 'h' },
    { name: 'Expense Spend (AED)', key: 'expenses', bar: true, unit: 'AED' },
    { name: 'Tasks Completed', key: 'tasks', bar: true, unit: 'tasks' }
  ];

  return (
    <>
      <div className="module-toolbar">
        <div className="filters">
          <select
            aria-label="Report timeframe"
            value={days}
            onChange={(e) => setDays(Number(e.target.value))}
          >
            <option value={7}>Last 7 days</option>
            <option value={14}>Last 14 days</option>
          </select>

          <select
            aria-label="Filter vehicle"
            value={filterVehicle}
            onChange={(e) => setFilterVehicle(e.target.value)}
          >
            <option value="All">All UAE Fleet Vehicles</option>
            {vehicles.map((v) => (
              <option key={v.id} value={v.registration}>
                {v.registration}
              </option>
            ))}
          </select>
        </div>

        <button
          type="button"
          className="button primary"
          onClick={() => exportCSV(filteredTrips, 'trackwe-full-trip-audit')}
        >
          <Download size={14} /> Export Operational Report
        </button>
      </div>

      <div className="info-banner">
        Operational fleet intelligence generated across Dubai, Abu Dhabi, Sharjah, and Northern Emirates transport routes. Trend charts reflect aggregate telematics logs; filters apply to the table below.
      </div>

      <div className="three-grid">
        {reportSections.map((sec) => (
          <Panel key={sec.key} title={sec.name}>
            <Trend type={sec.key} bar={sec.bar} days={days} unit={sec.unit} />
          </Panel>
        ))}
      </div>

      <Panel title="Fleet Moving Utilization Efficiency">
        <div className="utilization">
          <strong>{utilizationPercent}%</strong>
          <span>Active commercial vehicles in transit across UAE corridors today</span>
        </div>
      </Panel>

      <Panel title="Comprehensive Vehicle Trip Records">
        <DataTable
          rows={filteredTrips}
          exportable
          exportName="trackwe-uae-fleet-trips"
        />
      </Panel>
    </>
  );
}
