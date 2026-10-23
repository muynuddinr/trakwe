'use client';

import React, { useState } from 'react';
import dynamic from 'next/dynamic';
import { useAuth } from '@/context/auth-context';
import { useFleet } from '@/context/fleet-context';
import { NavItemKey } from '@/data/mock-credentials';
import { KpiCard } from '@/components/common/kpi-card';
import { Panel } from '@/components/common/panel';
import { Badge } from '@/components/common/badge';
import { Trend, Donut } from '@/components/common/charts';
import { DataTable } from '@/components/common/data-table';
import { EmployeeDashboard } from './employee-dashboard';
import {
  Truck,
  Navigation,
  Clock,
  Radio,
  Bell,
  ArrowUpRight,
  ArrowRight,
  ListTodo,
  Wallet,
  CalendarDays
} from 'lucide-react';

const FleetMap = dynamic(() => import('@/components/map/fleet-map'), {
  ssr: false,
  loading: () => <div className="map-loading">Loading UAE Fleet Map…</div>
});

interface DashboardViewProps {
  onNavigate: (page: NavItemKey) => void;
  onSelectVehicle: (id: string) => void;
  onOpenTaskModal: (task?: any) => void;
  onOpenExpenseModal: () => void;
}

export function DashboardView({
  onNavigate,
  onSelectVehicle,
  onOpenTaskModal,
  onOpenExpenseModal
}: DashboardViewProps) {
  const { role } = useAuth();
  const { vehicles, alerts, tasks, trips, drivers, expenses, geofences } = useFleet();
  const [days, setDays] = useState(7);

  // If authenticated as Employee, render dedicated employee dashboard
  if (role === 'Employee') {
    return (
      <EmployeeDashboard
        onNavigate={onNavigate}
        onOpenTaskModal={onOpenTaskModal}
        onOpenExpenseModal={onOpenExpenseModal}
      />
    );
  }

  // Derive all metrics dynamically from shared state
  const moving = vehicles.filter((v) => v.status === 'Moving').length;
  const idle = vehicles.filter((v) => v.status === 'Idle').length;
  const offline = vehicles.filter((v) => v.status === 'Offline').length;
  const activeAlerts = alerts.filter((a) => a.status === 'Unacknowledged').length;
  const pendingTasks = tasks.filter((t) => t.status !== 'Completed').length;

  const averageSafetyScore = drivers.length
    ? Math.round(drivers.reduce((acc, d) => acc + d.score, 0) / drivers.length)
    : 92;

  const totalExpenses = expenses.reduce((sum, e) => sum + e.amount, 0);

  return (
    <>
      {/* 5 KPI Cards */}
      <div className="kpi-grid">
        <KpiCard
          label="Total Vehicles"
          value={vehicles.length}
          icon={Truck}
          note="Across UAE fleet operations"
          tone="navy"
        />
        <KpiCard
          label="Moving"
          value={moving}
          icon={Navigation}
          note={`${Math.round((moving / Math.max(vehicles.length, 1)) * 100)}% of fleet in transit`}
          tone="green"
        />
        <KpiCard
          label="Idle"
          value={idle}
          icon={Clock}
          note="Ignition active · stationary"
          tone="gold"
        />
        <KpiCard
          label="Offline"
          value={offline}
          icon={Radio}
          note="No recent GSM signal"
          tone="gray"
        />
        <KpiCard
          label="Active Alerts"
          value={activeAlerts}
          icon={Bell}
          note="Require operations acknowledgement"
          tone="red"
        />
      </div>

      {/* Analytics Grid: Fleet Donut, Distance Trend, Fuel Trend */}
      <div className="analytics-grid">
        <Panel title="Fleet Status" sub="Live vehicle distribution across Emirates">
          <Donut
            values={[
              { name: 'Moving', value: moving, color: '#2d8c75' },
              { name: 'Idle', value: idle, color: '#c6ab6d' },
              { name: 'Offline', value: offline, color: '#cad2db' }
            ]}
          />
          <div className="panel-footer">
            <i className="pulse" />
            <span>{vehicles.length - offline} vehicles live in UAE</span>
            <span>DEMO TELEMETRY</span>
          </div>
        </Panel>

        <Panel
          title="Distance Travelled"
          sub="UAE highway & city mileage · kilometres"
          action={
            <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
              <select
                aria-label="Distance date range"
                value={days}
                onChange={(e) => setDays(Number(e.target.value))}
                style={{ fontSize: 10, padding: '3px 6px' }}
              >
                <option value={7}>Last 7 days</option>
                <option value={14}>Last 14 days</option>
              </select>
            </div>
          }
        >
          <div className="chart-value">
            {(days === 7 ? 24520 : 51200).toLocaleString()}{' '}
            <small>km</small>
          </div>
          <Trend type="distance" days={days} unit="km" />
        </Panel>

        <Panel
          title="Fuel Consumption"
          sub="Fleet fuel usage · litres"
          action={<Badge>+4.1% vs prev week</Badge>}
        >
          <div className="chart-value">
            {(days === 7 ? 3820 : 7940).toLocaleString()}{' '}
            <small>L</small>
          </div>
          <Trend type="fuel" bar days={days} unit="L" />
        </Panel>
      </div>

      {/* Operations Grid: UAE Map Preview, Driver Safety, Alerts */}
      <div className="operations-grid">
        <Panel
          title="UAE Fleet Corridors"
          sub="Dubai, Abu Dhabi, Sharjah & Northern Emirates"
          action={
            <button
              type="button"
              className="text-button"
              onClick={() => onNavigate('tracking')}
            >
              Open live tracking <ArrowUpRight size={13} />
            </button>
          }
          className="map-panel"
        >
          <div className="preview-map">
            <FleetMap
              vehicles={vehicles}
              compact
              geofences={geofences}
              onSelect={(v) => {
                onSelectVehicle(v.id);
                onNavigate('tracking');
              }}
            />
          </div>
        </Panel>

        <Panel
          title="Driver Safety Index"
          sub="Aggregate score across registered drivers"
          action={
            <button
              type="button"
              className="text-button"
              onClick={() => onNavigate('behavior')}
            >
              Details <ArrowRight size={13} />
            </button>
          }
        >
          <div className="score">
            <div>
              <strong>
                {averageSafetyScore}
                <small>/100</small>
              </strong>
              <Badge>Safe</Badge>
            </div>
            <p>Overall safety rating for UAE transport operators</p>
          </div>

          {[
            ['Overspeed on E11 / E311', 14, 55],
            ['Harsh braking events', 9, 38],
            ['Excessive idling (>15m)', 19, 72]
          ].map(([label, count, width]) => (
            <div className="metric-bar" key={String(label)}>
              <div>
                <span>{label}</span>
                <b>{count} incidents</b>
              </div>
              <div className="bar-track">
                <i style={{ width: `${width}%` }} />
              </div>
            </div>
          ))}

          <button
            type="button"
            className="subtle-link"
            onClick={() => onNavigate('behavior')}
          >
            Explore driver scorecards <ArrowRight size={14} />
          </button>
        </Panel>

        <Panel
          title="Active Alerts"
          sub={`${activeAlerts} alerts requiring acknowledgement`}
          action={
            <button
              type="button"
              className="text-button"
              onClick={() => onNavigate('alerts')}
            >
              View all <ArrowUpRight size={13} />
            </button>
          }
        >
          {alerts.slice(0, 3).map((a) => (
            <button
              key={a.id}
              type="button"
              className="alert-row"
              onClick={() => onNavigate('alerts')}
            >
              <span className={`alert-icon ${a.severity === 'Critical' ? 'red' : 'gold'}`}>
                <Bell size={15} />
              </span>
              <span>
                <b>{a.type}</b>
                <small>{a.vehicle}</small>
              </span>
              <span>
                <i className={`dot ${a.severity === 'Critical' ? 'red-bg' : 'gold-bg'}`} />
                <small>{a.time.slice(-9)}</small>
              </span>
            </button>
          ))}

          <div className="mini-task">
            <span>
              <ListTodo size={16} />
              Open operations tasks
            </span>
            <b>{pendingTasks}</b>
            <button
              type="button"
              onClick={() => onNavigate('tasks')}
              aria-label="Go to tasks"
            >
              <ArrowRight size={15} />
            </button>
          </div>
        </Panel>
      </div>

      {/* Bottom Grid: Recent Trips & Upcoming Tasks */}
      <div className="bottom-grid">
        <Panel
          title="Recent UAE Trips"
          sub="Corridors between JAFZA, KIZAD, Port Khalid & Downtown"
          action={
            <button
              type="button"
              className="text-button"
              onClick={() => onNavigate('trips')}
            >
              View route history <ArrowUpRight size={13} />
            </button>
          }
        >
          <DataTable
            rows={trips.slice(0, 4)}
            columns={[
              ['vehicle', 'Vehicle'],
              ['route', 'Corridor Route'],
              ['distance', 'Distance (km)'],
              ['duration', 'Duration'],
              ['status', 'Status']
            ]}
            searchable={false}
          />
        </Panel>

        <Panel
          title="Upcoming Tasks"
          sub="Maintenance & delivery operations"
          action={
            <button
              type="button"
              className="text-button"
              onClick={() => onNavigate('tasks')}
            >
              View tasks <ArrowUpRight size={13} />
            </button>
          }
        >
          {tasks.slice(0, 4).map((t) => (
            <div
              key={t.id}
              className="task-row"
              style={{ cursor: 'pointer' }}
              onClick={() => onOpenTaskModal(t)}
            >
              <span className="task-checkbox" />
              <span>
                <b>{t.title}</b>
                <small>{t.vehicle} · {t.employee}</small>
              </span>
              <span>
                <Badge>{t.status}</Badge>
                <small style={{ display: 'block', marginTop: 4 }}>Due: {t.due.slice(5)}</small>
              </span>
            </div>
          ))}
        </Panel>
      </div>

      {/* Expense Summary for Admins and Managers */}
      {(role === 'Super Admin' || role === 'Admin' || role === 'Manager') && (
        <Panel
          title="Fleet Expenses (AED)"
          sub="Operational spending across Fuel, Salik Tolls & Maintenance"
          action={
            <button
              type="button"
              className="text-button"
              onClick={() => onNavigate('expenses')}
            >
              Manage expenses <ArrowUpRight size={13} />
            </button>
          }
        >
          <div className="category-grid" style={{ gridTemplateColumns: 'repeat(4, 1fr)' }}>
            <div>
              <span>TOTAL FLEET EXPENDITURE</span>
              <strong>AED {totalExpenses.toLocaleString('en-AE')}</strong>
            </div>
            <div>
              <span>FUEL (ENOC / EPPCO / ADNOC)</span>
              <strong>
                AED {expenses
                  .filter((e) => e.category === 'Fuel')
                  .reduce((s, e) => s + e.amount, 0)
                  .toLocaleString('en-AE')}
              </strong>
            </div>
            <div>
              <span>SALIK & DARB TOLLS</span>
              <strong>
                AED {expenses
                  .filter((e) => e.category === 'Tolls')
                  .reduce((s, e) => s + e.amount, 0)
                  .toLocaleString('en-AE')}
              </strong>
            </div>
            <div>
              <span>FLEET MAINTENANCE</span>
              <strong>
                AED {expenses
                  .filter((e) => e.category === 'Maintenance')
                  .reduce((s, e) => s + e.amount, 0)
                  .toLocaleString('en-AE')}
              </strong>
            </div>
          </div>
        </Panel>
      )}
    </>
  );
}
