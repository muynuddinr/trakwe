'use client';

import React, { useState } from 'react';
import { useAuth } from '@/context/auth-context';
import { useFleet } from '@/context/fleet-context';
import { Panel } from '@/components/common/panel';
import { DataTable } from '@/components/common/data-table';
import { Modal } from '@/components/common/modal';
import { Power, AlertTriangle, ShieldCheck } from 'lucide-react';
import { Vehicle } from '@/types';

interface ImmobilizerViewProps {
  showToast: (msg: string) => void;
}

export function ImmobilizerView({ showToast }: ImmobilizerViewProps) {
  const { user, permissions } = useAuth();
  const { vehicles, commands, simulateImmobilizerCommand } = useFleet();

  const [targetVehicle, setTargetVehicle] = useState<Vehicle | null>(null);
  const [commandAction, setCommandAction] = useState<'Immobilize' | 'Restore'>('Immobilize');
  const [reason, setReason] = useState('');

  const compatibleVehicles = vehicles.filter((v) => v.immobilizer);

  const handleOpenSimulation = (v: Vehicle, action: 'Immobilize' | 'Restore') => {
    setTargetVehicle(v);
    setCommandAction(action);
    setReason('');
  };

  const handleConfirmSimulation = (e: React.FormEvent) => {
    e.preventDefault();
    if (!targetVehicle || !reason.trim()) return;

    const actionText =
      commandAction === 'Immobilize'
        ? 'Engine Cut-off Relay · Simulation'
        : 'Engine Ignition Restore Relay · Simulation';

    simulateImmobilizerCommand(
      targetVehicle.registration,
      actionText,
      reason.trim(),
      user?.name || 'Authorized Operator'
    );

    showToast(`Simulation logged for ${targetVehicle.registration}: ${commandAction} Relay Triggered`);
    setTargetVehicle(null);
    setReason('');
  };

  return (
    <>
      <div className="info-banner warning">
        <Power size={16} />
        <div>
          <strong>DEMO MODE SAFETY BOUNDARY:</strong> Relay commands are local simulations only.
          No physical signals are sent to real vehicles. A safety confirmation dialog is mandatory for all operations.
        </div>
      </div>

      <Panel
        title="Immobilizer-Equipped UAE Fleet Vehicles"
        sub={`${compatibleVehicles.length} vehicles with digital relay output enabled`}
      >
        <DataTable
          rows={compatibleVehicles.map((v) => ({
            id: v.id,
            vehicle: v.registration,
            name: v.name,
            device: v.device,
            status: v.status,
            speed: `${v.speed} km/h`,
            relayState: 'Engaged (Armed)',
            connection: 'Simulated'
          }))}
          columns={[
            ['vehicle', 'Registration Plate'],
            ['name', 'Vehicle Model'],
            ['device', 'Telematics Hardware'],
            ['speed', 'Speed'],
            ['status', 'Vehicle Status'],
            ['relayState', 'Relay Armed State'],
            ['connection', 'Safety Channel']
          ]}
          action={(r: any) => {
            const v = vehicles.find((item) => item.id === r.id);
            if (!v) return null;
            return (
              <div style={{ display: 'flex', gap: 6 }}>
                <button
                  type="button"
                  className="button small"
                  disabled={!permissions?.canSimulateImmobilizer}
                  onClick={() => handleOpenSimulation(v, 'Immobilize')}
                  style={{ color: '#c47b6b', borderColor: '#fadbd8' }}
                >
                  <Power size={13} /> Cut Engine
                </button>
                <button
                  type="button"
                  className="button small"
                  disabled={!permissions?.canSimulateImmobilizer}
                  onClick={() => handleOpenSimulation(v, 'Restore')}
                >
                  Restore
                </button>
              </div>
            );
          }}
        />
      </Panel>

      <Panel title="Command Simulation Audit Trail" sub="Logged digital relay instructions">
        <DataTable
          rows={commands}
          columns={[
            ['vehicle', 'Vehicle Plate'],
            ['action', 'Command Executed'],
            ['reason', 'Operational Justification'],
            ['initiatedBy', 'Operator'],
            ['time', 'Timestamp'],
            ['status', 'Simulation Verification']
          ]}
          emptyMessage="No immobilizer command simulations executed in this session."
          exportable
          exportName="trackwe-immobilizer-audit-log"
        />
      </Panel>

      {/* Safety Confirmation Dialog */}
      <Modal
        open={!!targetVehicle}
        onClose={() => setTargetVehicle(null)}
        title="Confirm Engine Immobilizer Simulation"
      >
        <form onSubmit={handleConfirmSimulation}>
          <div style={{ display: 'flex', gap: 12, alignItems: 'flex-start', padding: 14, background: '#fef3c7', borderRadius: 8, marginBottom: 16 }}>
            <AlertTriangle size={24} style={{ color: '#d97706', flexShrink: 0 }} />
            <div style={{ fontSize: 11, color: '#92400e', lineHeight: 1.5 }}>
              <strong>DEMO SIMULATION NOTICE:</strong> You are about to simulate{' '}
              <u>{commandAction.toUpperCase()}</u> on vehicle <strong>{targetVehicle?.registration}</strong> ({targetVehicle?.name}).
              This action is logged to the local audit trail for demonstration purposes.
            </div>
          </div>

          <label style={{ display: 'flex', flexDirection: 'column', gap: 6, marginBottom: 14 }}>
            <span>Operational Reason / Security Ticket ID</span>
            <input
              required
              placeholder="e.g. Security audit simulation test #SEC-9812"
              value={reason}
              onChange={(e) => setReason(e.target.value)}
            />
          </label>

          <div style={{ fontSize: 10, color: '#64748b', marginBottom: 16 }}>
            Operator: <strong>{user?.name}</strong> ({user?.role})
          </div>

          <div className="modal-actions">
            <button
              type="button"
              className="button"
              onClick={() => setTargetVehicle(null)}
            >
              Cancel
            </button>
            <button
              type="submit"
              className="button primary"
              style={commandAction === 'Immobilize' ? { background: '#b91c1c', borderColor: '#b91c1c' } : undefined}
            >
              Confirm Simulation Execution
            </button>
          </div>
        </form>
      </Modal>
    </>
  );
}
