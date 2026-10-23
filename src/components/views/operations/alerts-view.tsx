'use client';

import React, { useState } from 'react';
import { useFleet } from '@/context/fleet-context';
import { Panel } from '@/components/common/panel';
import { DataTable } from '@/components/common/data-table';
import { Check } from 'lucide-react';
import { Alert } from '@/types';

interface AlertsViewProps {
  showToast: (msg: string) => void;
}

export function AlertsView({ showToast }: AlertsViewProps) {
  const { alerts, acknowledgeAlert, vehicles } = useFleet();

  const [statusFilter, setStatusFilter] = useState('All');
  const [severityFilter, setSeverityFilter] = useState('All');
  const [categoryFilter, setCategoryFilter] = useState('All');
  const [vehicleFilter, setVehicleFilter] = useState('All');

  const filtered = alerts.filter((a) => {
    const matchStatus = statusFilter === 'All' || a.status === statusFilter;
    const matchSeverity = severityFilter === 'All' || a.severity === severityFilter;
    const matchCategory = categoryFilter === 'All' || a.type === categoryFilter;
    const matchVeh = vehicleFilter === 'All' || a.vehicle === vehicleFilter;
    return matchStatus && matchSeverity && matchCategory && matchVeh;
  });

  const handleAcknowledge = (a: Alert) => {
    acknowledgeAlert(a.id);
    showToast(`Alert acknowledged: ${a.type} (${a.vehicle})`);
  };

  return (
    <>
      <div className="module-toolbar">
        <div className="filters">
          <select
            aria-label="Filter status"
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
          >
            <option value="All">All Statuses</option>
            <option value="Unacknowledged">Unacknowledged</option>
            <option value="Acknowledged">Acknowledged</option>
          </select>

          <select
            aria-label="Filter severity"
            value={severityFilter}
            onChange={(e) => setSeverityFilter(e.target.value)}
          >
            <option value="All">All Severities</option>
            <option value="Critical">Critical</option>
            <option value="Warning">Warning</option>
          </select>

          <select
            aria-label="Filter category"
            value={categoryFilter}
            onChange={(e) => setCategoryFilter(e.target.value)}
          >
            <option value="All">All Alert Types</option>
            <option value="Overspeed">Overspeed</option>
            <option value="Temperature">Temperature Excursion</option>
            <option value="Geofence breach">Geofence Breach</option>
            <option value="Fuel drop">Fuel Drop</option>
            <option value="Harsh braking">Harsh Braking</option>
            <option value="Device offline">Device Offline</option>
          </select>

          <select
            aria-label="Filter vehicle"
            value={vehicleFilter}
            onChange={(e) => setVehicleFilter(e.target.value)}
          >
            <option value="All">All UAE Vehicles</option>
            {vehicles.map((v) => (
              <option key={v.id} value={v.registration}>
                {v.registration}
              </option>
            ))}
          </select>
        </div>
      </div>

      <Panel
        title="Fleet Telemetry Alerts & Geofence Exceptions"
        sub={`${filtered.length} alerts matching operational filters`}
      >
        <DataTable
          rows={filtered}
          columns={[
            ['type', 'Alert Type'],
            ['severity', 'Severity'],
            ['vehicle', 'Target Vehicle Plate'],
            ['location', 'UAE Geolocation / Context'],
            ['time', 'Triggered Time (GST)'],
            ['status', 'Operational Status']
          ]}
          exportable
          exportName="trackwe-uae-alerts"
          action={(a: Alert) => (
            <button
              type="button"
              className="text-button"
              disabled={a.status === 'Acknowledged'}
              onClick={() => handleAcknowledge(a)}
              style={
                a.status === 'Acknowledged'
                  ? { color: '#8898aa', cursor: 'default' }
                  : { color: '#0c2f4a', fontWeight: 600 }
              }
            >
              {a.status === 'Acknowledged' ? (
                <>
                  <Check size={14} style={{ color: '#2d8c75' }} /> Acknowledged
                </>
              ) : (
                'Acknowledge'
              )}
            </button>
          )}
        />
      </Panel>
    </>
  );
}
