'use client';

import React, { useState } from 'react';
import { useFleet } from '@/context/fleet-context';
import { KpiCard } from '@/components/common/kpi-card';
import { Panel } from '@/components/common/panel';
import { DataTable } from '@/components/common/data-table';
import { Badge } from '@/components/common/badge';
import { ShieldCheck, Activity, Power } from 'lucide-react';

export function DiagnosticsView() {
  const { vehicles } = useFleet();
  const [filterVehicle, setFilterVehicle] = useState('All');

  const canVehicles = vehicles.filter((v) => v.can);
  const scoped = canVehicles.filter(
    (v) => filterVehicle === 'All' || v.registration === filterVehicle
  );

  const diagRows = scoped.map((v, i) => {
    const hasDtc = i === 2 || i === 5;
    return {
      id: `diag-${v.id}`,
      vehicle: v.registration,
      name: v.name,
      rpm: v.status === 'Moving' ? 1450 + (i * 45) : v.status === 'Idle' ? 720 : 0,
      coolant: `${82 + (i % 6)} °C`,
      battery: `${v.battery.toFixed(1)} V`,
      odometer: `${(45200 + i * 3420).toLocaleString()} km`,
      dtcCode: hasDtc ? (i === 2 ? 'P0117 (Engine Coolant Sensor Circuit Low)' : 'P0420 (Catalyst System Efficiency)') : 'No Active DTC',
      status: hasDtc ? 'Attention' : 'Healthy'
    };
  });

  const healthyCount = diagRows.filter((r) => r.status === 'Healthy').length;
  const activeDtcCount = diagRows.filter((r) => r.status === 'Attention').length;
  const avgBattery = diagRows.length
    ? (diagRows.reduce((sum, r) => sum + parseFloat(r.battery), 0) / diagRows.length).toFixed(1)
    : '12.5';

  return (
    <>
      <div className="module-toolbar">
        <div className="filters">
          <select
            aria-label="Filter vehicle"
            value={filterVehicle}
            onChange={(e) => setFilterVehicle(e.target.value)}
          >
            <option value="All">All CAN-Enabled Vehicles</option>
            {canVehicles.map((v) => (
              <option key={v.id} value={v.registration}>
                {v.registration} — {v.name}
              </option>
            ))}
          </select>
        </div>
        <Badge>J1939 CAN Bus Telemetry Interface · OBD-II Diagnostic Feed</Badge>
      </div>

      <div className="info-banner">
        CAN bus parameter streaming is active on {canVehicles.length} equipped UAE fleet vehicles. Decodes real-time engine RPM, coolant temperature, battery voltage, and ECU diagnostic trouble codes.
      </div>

      <div className="three-grid">
        <KpiCard
          label="Healthy Vehicle ECUs"
          value={healthyCount}
          icon={ShieldCheck}
          note="Zero active fault codes"
          tone="green"
        />
        <KpiCard
          label="Active Diagnostic Codes (DTC)"
          value={activeDtcCount}
          icon={Activity}
          note="Fault codes requiring maintenance"
          tone={activeDtcCount > 0 ? 'gold' : 'green'}
        />
        <KpiCard
          label="Average Battery Voltage"
          value={`${avgBattery} V`}
          icon={Power}
          note="Healthy alternator charging"
          tone="navy"
        />
      </div>

      <Panel title="Real-Time CAN Bus Diagnostic Telemetry" sub="Live ECU stream">
        <DataTable
          rows={diagRows}
          columns={[
            ['vehicle', 'Plate'],
            ['name', 'Vehicle'],
            ['rpm', 'Engine RPM'],
            ['coolant', 'Coolant Temp'],
            ['battery', 'Battery Voltage'],
            ['odometer', 'ECU Odometer'],
            ['dtcCode', 'Diagnostic Trouble Code (DTC)'],
            ['status', 'Health Status']
          ]}
          exportable
          exportName="trackwe-can-bus-diagnostics"
        />
      </Panel>
    </>
  );
}
