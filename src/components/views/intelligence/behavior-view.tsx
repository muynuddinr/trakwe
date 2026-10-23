'use client';

import React, { useState } from 'react';
import { useFleet } from '@/context/fleet-context';
import { Panel } from '@/components/common/panel';
import { Trend } from '@/components/common/charts';
import { DataTable } from '@/components/common/data-table';
import { Badge } from '@/components/common/badge';
import { HelpCircle } from 'lucide-react';

export function BehaviorView() {
  const { drivers, vehicles } = useFleet();
  const [days, setDays] = useState(7);

  const behaviorEvents = [
    {
      id: 'bev-1',
      driver: drivers[0]?.name || 'Zayed Al Mansoori',
      vehicle: vehicles[0]?.registration || 'Dubai A-10842',
      event: 'Harsh braking',
      location: 'Sheikh Zayed Rd / Business Bay off-ramp',
      time: '23 Oct 10:14 GST',
      penalty: '−3 points',
      severity: 'Warning'
    },
    {
      id: 'bev-2',
      driver: drivers[1]?.name || 'Rashid Al Nuaimi',
      vehicle: vehicles[1]?.registration || 'Dubai C-49102',
      event: 'Overspeed',
      location: 'E11 Corridor JAFZA (104 km/h in 80 zone)',
      time: '23 Oct 09:48 GST',
      penalty: '−5 points',
      severity: 'Critical'
    },
    {
      id: 'bev-3',
      driver: drivers[2]?.name || 'Tariq Al Falasi',
      vehicle: vehicles[2]?.registration || 'Dubai E-28491',
      event: 'Excessive idling',
      location: 'Al Quoz Industrial 3 loading bay (22 min)',
      time: '23 Oct 08:30 GST',
      penalty: '−1 point',
      severity: 'Warning'
    },
    {
      id: 'bev-4',
      driver: drivers[3]?.name || 'Omar Al Suwaidi',
      vehicle: vehicles[11]?.registration || 'Abu Dhabi 5-29104',
      event: 'Harsh acceleration',
      location: 'Khalifa Port gate intersection',
      time: '22 Oct 16:15 GST',
      penalty: '−3 points',
      severity: 'Warning'
    }
  ];

  return (
    <>
      <div className="module-toolbar">
        <div className="filters">
          <select
            aria-label="Date range"
            value={days}
            onChange={(e) => setDays(Number(e.target.value))}
          >
            <option value={7}>Last 7 days</option>
            <option value={14}>Last 14 days</option>
          </select>
        </div>
        <Badge>UAE RTA Safety Score Protocol</Badge>
      </div>

      <div className="info-banner">
        <HelpCircle size={16} />
        Driver safety score starts at 100 points: Overspeed −5, Harsh braking −3, Harsh acceleration −3, Excessive idling −1. Real-time accelerometer & GPS telemetry.
      </div>

      <div className="two-grid">
        <Panel title="Weekly Safety Score Trend" sub="Fleet-wide aggregate score (/100)">
          <Trend type="score" days={days} unit="pts" />
        </Panel>

        <Panel title="Driver Performance Leaderboard" sub="Top safety compliance in UAE">
          <DataTable
            rows={drivers}
            columns={[
              ['name', 'Driver'],
              ['vehicle', 'Assigned Vehicle'],
              ['score', 'Score'],
              ['events', 'Recorded Events'],
              ['status', 'Duty Status']
            ]}
            searchable={false}
            limit={5}
          />
        </Panel>
      </div>

      <Panel title="Driver Violation Incident Log" sub="Real-time telematics alerts">
        <DataTable rows={behaviorEvents} exportable exportName="trackwe-driver-behavior" />
      </Panel>
    </>
  );
}
