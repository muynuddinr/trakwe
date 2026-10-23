'use client';

import React from 'react';
import { useAuth } from '@/context/auth-context';
import { useFleet } from '@/context/fleet-context';
import { NavItemKey } from '@/data/mock-credentials';
import { KpiCard } from '@/components/common/kpi-card';
import { Panel } from '@/components/common/panel';
import { Badge } from '@/components/common/badge';
import {
  Truck,
  CheckCircle2,
  Clock,
  Wallet,
  ShieldCheck,
  MapPin,
  Fuel,
  ArrowRight,
  ListTodo
} from 'lucide-react';

interface EmployeeDashboardProps {
  onNavigate: (page: NavItemKey) => void;
  onOpenTaskModal: (task?: any) => void;
  onOpenExpenseModal: () => void;
}

export function EmployeeDashboard({
  onNavigate,
  onOpenTaskModal,
  onOpenExpenseModal
}: EmployeeDashboardProps) {
  const { user } = useAuth();
  const { vehicles, tasks, expenses, updateTaskStatus } = useFleet();

  // Employee's assigned vehicle: Dubai A-10842 (id: v-dxb-01)
  const myVehicle = vehicles.find((v) => v.id === user?.assignedVehicleId || v.driver === user?.name) || vehicles[0];

  const myTasks = tasks.filter((t) => t.employee === user?.name);
  const pendingTasks = myTasks.filter((t) => t.status !== 'Completed');
  const completedTasks = myTasks.filter((t) => t.status === 'Completed');

  const myExpenses = expenses.filter((e) => e.submitted === user?.name);
  const totalMyExpenses = myExpenses.reduce((sum, e) => sum + e.amount, 0);

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 18 }}>
      {/* Employee KPI Overview */}
      <div className="kpi-grid" style={{ gridTemplateColumns: 'repeat(4, 1fr)' }}>
        <KpiCard
          label="Assigned Vehicle"
          value={myVehicle?.registration || 'Dubai A-10842'}
          icon={Truck}
          note={myVehicle?.name || 'Refrigerated Carrier'}
          tone="navy"
        />
        <KpiCard
          label="Pending Tasks"
          value={pendingTasks.length}
          icon={Clock}
          note="Assigned to your queue"
          tone={pendingTasks.length > 0 ? 'gold' : 'green'}
        />
        <KpiCard
          label="Completed Tasks"
          value={completedTasks.length}
          icon={CheckCircle2}
          note="Tasks finished this cycle"
          tone="green"
        />
        <KpiCard
          label="My Filed Expenses"
          value={`AED ${totalMyExpenses.toLocaleString('en-AE')}`}
          icon={Wallet}
          note={`${myExpenses.length} expense claims filed`}
          tone="navy"
        />
      </div>

      {/* Main Employee Workspace Grid */}
      <div className="operations-grid" style={{ gridTemplateColumns: '1.2fr 1.4fr' }}>
        {/* Assigned Vehicle Live Status */}
        <Panel
          title="Assigned Vehicle Telemetry"
          sub={`${myVehicle?.registration} · ${myVehicle?.emirate}`}
          action={
            <Badge>{myVehicle?.status}</Badge>
          }
        >
          <div style={{ padding: 18 }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 14, marginBottom: 18 }}>
              <div className="truck-illustration" style={{ width: 48, height: 44, margin: 0 }}>
                <Truck size={28} />
              </div>
              <div>
                <h3 style={{ fontSize: 16 }}>{myVehicle?.registration}</h3>
                <p style={{ fontSize: 11, color: '#688296' }}>{myVehicle?.name} ({myVehicle?.type})</p>
              </div>
            </div>

            <div className="detail-grid" style={{ marginBottom: 18 }}>
              <div>
                <small>CURRENT SPEED</small>
                <b>{myVehicle?.speed} km/h</b>
              </div>
              <div>
                <small>FUEL LEVEL</small>
                <b>{myVehicle?.fuel}%</b>
              </div>
              <div>
                <small>CARGO TEMPERATURE</small>
                <b>{myVehicle?.temperature !== null ? `${myVehicle?.temperature} °C` : 'N/A'}</b>
              </div>
              <div>
                <small>BATTERY VOLTAGE</small>
                <b>{myVehicle?.battery.toFixed(1)} V</b>
              </div>
              <div>
                <small>CURRENT LOCATION</small>
                <b>{myVehicle?.locationName}</b>
              </div>
              <div>
                <small>TELEMETRY UPDATED</small>
                <b>{myVehicle?.updated}</b>
              </div>
            </div>

            <div style={{ padding: '10px 14px', background: '#f8fafc', borderRadius: 6, display: 'flex', alignItems: 'center', gap: 8, fontSize: 11, color: '#64748b' }}>
              <ShieldCheck size={16} style={{ color: '#2d8c75' }} />
              Driver safety rating: <strong>98 / 100</strong> (Excellent driving behavior)
            </div>
          </div>
        </Panel>

        {/* Assigned Tasks */}
        <Panel
          title="My Assigned Tasks"
          sub={`${pendingTasks.length} tasks requiring action`}
          action={
            <button
              type="button"
              className="text-button"
              onClick={() => onNavigate('tasks')}
            >
              Open tasks <ArrowRight size={13} />
            </button>
          }
        >
          <div style={{ padding: '0 4px' }}>
            {myTasks.slice(0, 4).map((t) => (
              <div
                key={t.id}
                className="task-row"
                style={{ padding: '12px 16px', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}
              >
                <div>
                  <b>{t.title}</b>
                  <small style={{ color: '#8898aa', marginTop: 3 }}>
                    Due: {t.due} · Vehicle: {t.vehicle}
                  </small>
                </div>
                <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                  <Badge>{t.status}</Badge>
                  {t.status !== 'Completed' && (
                    <button
                      type="button"
                      className="button small"
                      style={{ padding: '4px 8px', fontSize: 10 }}
                      onClick={() => updateTaskStatus(t.id, t.status === 'To do' ? 'In progress' : 'Completed')}
                    >
                      {t.status === 'To do' ? 'Start' : 'Complete'}
                    </button>
                  )}
                </div>
              </div>
            ))}

            {!myTasks.length && (
              <div className="empty">No tasks currently assigned to you.</div>
            )}
          </div>
        </Panel>
      </div>

      {/* Expenses & Quick Actions */}
      <div className="bottom-grid" style={{ gridTemplateColumns: '1.4fr 1fr' }}>
        <Panel
          title="My Recent Expense Submissions"
          sub="Filed fuel, toll, and maintenance claims"
          action={
            <button
              type="button"
              className="button primary small"
              onClick={onOpenExpenseModal}
            >
              Submit Expense
            </button>
          }
        >
          <div style={{ padding: '4px 18px 18px' }}>
            <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 11 }}>
              <thead>
                <tr>
                  <th style={{ textAlign: 'left', padding: '8px 0' }}>Expense</th>
                  <th style={{ textAlign: 'left', padding: '8px 0' }}>Category</th>
                  <th style={{ textAlign: 'left', padding: '8px 0' }}>Amount</th>
                  <th style={{ textAlign: 'left', padding: '8px 0' }}>Status</th>
                </tr>
              </thead>
              <tbody>
                {myExpenses.slice(0, 4).map((exp) => (
                  <tr key={exp.id} style={{ borderBottom: '1px solid #f0f3f6' }}>
                    <td style={{ padding: '10px 0' }}>{exp.title}</td>
                    <td style={{ padding: '10px 0' }}>{exp.category}</td>
                    <td style={{ padding: '10px 0', fontWeight: 600 }}>AED {exp.amount.toLocaleString('en-AE')}</td>
                    <td style={{ padding: '10px 0' }}><Badge>{exp.status}</Badge></td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </Panel>

        <Panel title="Role Notice" sub="Field Operator Permissions">
          <div style={{ padding: 18, fontSize: 11, color: '#688296', lineHeight: 1.6 }}>
            <p style={{ marginBottom: 10 }}>
              You are signed in as an <strong>Employee</strong>. Your access is configured specifically for field operations:
            </p>
            <ul style={{ paddingLeft: 18, margin: 0 }}>
              <li>View your assigned vehicle live status & telemetry</li>
              <li>Review and complete assigned operational tasks</li>
              <li>Submit fuel and Salik expense reimbursement requests</li>
            </ul>
            <p style={{ marginTop: 12, color: '#8898aa', fontSize: 10 }}>
              System administration, full fleet tracking, and expense approvals are restricted to Managers and Admins.
            </p>
          </div>
        </Panel>
      </div>
    </div>
  );
}
