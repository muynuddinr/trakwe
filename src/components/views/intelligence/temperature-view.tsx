'use client';

import React, { useState } from 'react';
import { useFleet } from '@/context/fleet-context';
import { Panel } from '@/components/common/panel';
import { Trend } from '@/components/common/charts';
import { DataTable } from '@/components/common/data-table';
import { Badge } from '@/components/common/badge';
import { Thermometer } from 'lucide-react';

export function TemperatureView() {
  const { vehicles } = useFleet();
  const [filterVehicle, setFilterVehicle] = useState('All');
  const [days, setDays] = useState(7);

  const reeferVehicles = vehicles.filter((v) => v.type === 'Refrigerated');
  const scoped = reeferVehicles.filter(
    (v) => filterVehicle === 'All' || v.registration === filterVehicle
  );

  const tempLogs = [
    {
      id: 'tl-1',
      vehicle: vehicles[0]?.registration || 'Dubai A-10842',
      cargo: 'Chilled Dairy & Pharma',
      reading: '4.2 °C',
      targetRange: '2.0 – 8.0 °C',
      probe: 'Probe 1 (Forward Cargo)',
      time: '23 Oct 11:30 GST',
      status: 'Within range'
    },
    {
      id: 'tl-2',
      vehicle: vehicles[6]?.registration || 'Dubai E-28491',
      cargo: 'Frozen Confectionery',
      reading: '9.8 °C',
      targetRange: '2.0 – 8.0 °C',
      probe: 'Probe 2 (Door Sensor)',
      time: '23 Oct 11:14 GST',
      status: 'Out of range'
    },
    {
      id: 'tl-3',
      vehicle: vehicles[12]?.registration || 'Abu Dhabi 6-84910',
      cargo: 'Vaccines & Cold Supply',
      reading: '3.6 °C',
      targetRange: '2.0 – 8.0 °C',
      probe: 'Probe 1 (Center Bay)',
      time: '23 Oct 10:45 GST',
      status: 'Within range'
    }
  ];

  return (
    <>
      <div className="module-toolbar">
        <div className="filters">
          <select
            aria-label="Sensor vehicle"
            value={filterVehicle}
            onChange={(e) => setFilterVehicle(e.target.value)}
          >
            <option value="All">All Cold-Chain Reefer Units</option>
            {reeferVehicles.map((v) => (
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
        <Badge>HACCP Cold-Chain Compliance · 2–8 °C Standard</Badge>
      </div>

      <div className="info-banner">
        <Thermometer size={16} />
        Live dual-probe telemetry for {reeferVehicles.length} cold-chain refrigerated vehicles. Safe pharma & food distribution target: 2.0 to 8.0 °C.
      </div>

      <div className="sensor-grid">
        {scoped.map((v) => {
          const temp = v.temperature ?? 4.0;
          const isOutOfRange = temp > 8.0 || temp < 2.0;
          return (
            <div className="sensor-card" key={v.id}>
              <small>{v.registration} · {v.name}</small>
              <strong>
                {temp.toFixed(1)} <span>°C</span>
              </strong>
              <Badge className={isOutOfRange ? 'out-of-range' : 'within-range'}>
                {isOutOfRange ? 'Excursion Alert' : 'Within Range'}
              </Badge>
              <div style={{ marginTop: 8, fontSize: 10, color: '#8b98a5' }}>
                {v.locationName}
              </div>
            </div>
          );
        })}
      </div>

      <Panel title="Cold-Chain Temperature Stability Trend" sub="Average cargo readings over time · °C">
        <Trend type="temperature" days={days} unit="°C" />
      </Panel>

      <Panel title="Temperature Excursion & Probe Telemetry Log">
        <DataTable rows={tempLogs} exportable exportName="trackwe-temperature-log" />
      </Panel>
    </>
  );
}
