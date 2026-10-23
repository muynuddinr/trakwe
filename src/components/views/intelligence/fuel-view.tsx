'use client';

import React, { useState } from 'react';
import { useFleet } from '@/context/fleet-context';
import { KpiCard } from '@/components/common/kpi-card';
import { Panel } from '@/components/common/panel';
import { Trend } from '@/components/common/charts';
import { DataTable } from '@/components/common/data-table';
import { Badge } from '@/components/common/badge';
import { Fuel, Activity, Bell } from 'lucide-react';

export function FuelView() {
  const { vehicles } = useFleet();
  const [filterVehicle, setFilterVehicle] = useState('All');
  const [days, setDays] = useState(7);

  const scopedVehicles = vehicles.filter(
    (v) => filterVehicle === 'All' || v.registration === filterVehicle
  );

  const avgFuel = scopedVehicles.length
    ? Math.round(scopedVehicles.reduce((s, v) => s + v.fuel, 0) / scopedVehicles.length)
    : 72;

  const fuelEvents = [
    {
      id: 'fe-1',
      vehicle: vehicles[0]?.registration || 'Dubai A-10842',
      type: 'Refuelling',
      volume: '+52 L',
      cost: 'AED 420',
      time: '23 Oct 08:30 GST',
      location: 'EPPCO Service Station 104 (Sheikh Zayed Rd)'
    },
    {
      id: 'fe-2',
      vehicle: vehicles[10]?.registration || 'Abu Dhabi 4-19283',
      type: 'Possible Fuel Drop',
      volume: '−18 L',
      cost: '—',
      time: '23 Oct 09:14 GST',
      location: 'Musaffah Sector 9 Industrial Lot'
    },
    {
      id: 'fe-3',
      vehicle: vehicles[1]?.registration || 'Dubai C-49102',
      type: 'Refuelling',
      volume: '+65 L',
      cost: 'AED 515',
      time: '22 Oct 17:45 GST',
      location: 'ENOC Station JAFZA North'
    },
    {
      id: 'fe-4',
      vehicle: vehicles[11]?.registration || 'Abu Dhabi 5-29104',
      type: 'Refuelling',
      volume: '+80 L',
      cost: 'AED 640',
      time: '22 Oct 14:10 GST',
      location: 'ADNOC Oasis Service Station 742 (KIZAD)'
    }
  ];

  return (
    <>
      <div className="module-toolbar">
        <div className="filters">
          <select
            aria-label="Filter vehicle"
            value={filterVehicle}
            onChange={(e) => setFilterVehicle(e.target.value)}
          >
            <option value="All">All UAE Fleet Vehicles</option>
            {vehicles.map((v) => (
              <option key={v.id} value={v.registration}>
                {v.registration} — {v.name}
              </option>
            ))}
          </select>

          <select
            aria-label="Date range"
            value={days}
            onChange={(e) => setDays(Number(e.target.value))}
          >
            <option value={7}>Last 7 days</option>
            <option value={14}>Last 14 days</option>
          </select>
        </div>
        <Badge>Capacitive Fuel Sensor Telemetry · ENOC / ADNOC</Badge>
      </div>

      <div className="three-grid">
        <KpiCard
          label="Average Fuel Level"
          value={`${avgFuel}%`}
          icon={Fuel}
          note={`Across ${scopedVehicles.length} vehicles`}
          tone="navy"
        />
        <KpiCard
          label="Refuelling Events"
          value={3}
          icon={Activity}
          note="Logged past 24 hours"
          tone="green"
        />
        <KpiCard
          label="Possible Fuel Drops"
          value={1}
          icon={Bell}
          note="Abnormal drop detected in Musaffah"
          tone="gold"
        />
      </div>

      <div className="two-grid">
        <Panel title="Fleet Fuel Consumption Trend (Litres)" sub="Daily volume across UAE routes">
          <Trend type="fuel" days={days} unit="L" />
        </Panel>
        <Panel title="Daily Fuel Usage (Litres)" sub="Bar distribution by day">
          <Trend type="fuel" bar days={days} unit="L" />
        </Panel>
      </div>

      <Panel title="Vehicle Fuel Levels & Consumption Status">
        <DataTable
          rows={scopedVehicles.map((v) => ({
            id: v.id,
            vehicle: v.registration,
            name: v.name,
            level: `${v.fuel}%`,
            estimatedVolume: `${Math.round(v.fuel * 2.5)} L`,
            todayConsumption: `${Math.round(v.distance * 0.28)} L`,
            lastStation: v.emirate === 'Abu Dhabi' ? 'ADNOC Distribution' : 'ENOC / EPPCO',
            status: v.fuel < 20 ? 'Low Fuel' : 'Normal'
          }))}
          exportable
          exportName="trackwe-fuel-telemetry"
        />
      </Panel>

      <Panel title="Recent Fuel Activity & Sensor Anomalies">
        <DataTable rows={fuelEvents} exportable exportName="trackwe-fuel-events" />
      </Panel>
    </>
  );
}
