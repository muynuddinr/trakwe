'use client';

import React, { useState } from 'react';
import { useFleet } from '@/context/fleet-context';
import { Panel } from '@/components/common/panel';
import { Badge } from '@/components/common/badge';
import { Modal } from '@/components/common/modal';
import { Camera, ShieldAlert } from 'lucide-react';
import { Vehicle } from '@/types';

export function CamerasView() {
  const { vehicles } = useFleet();
  const cameraVehicles = vehicles.filter((v) => v.camera);
  const [selectedCamVehicle, setSelectedCamVehicle] = useState<Vehicle | null>(null);

  return (
    <>
      <div className="info-banner">
        <Camera size={16} />
        Live dual-facing AI dash camera preview (ADAS + DMS). Hardware streams are in simulated standby mode. Connect a supported JT/T 1078 or WebRTC camera endpoint in Phase 2.
      </div>

      <div className="camera-grid">
        {cameraVehicles.slice(0, 6).map((v) => (
          <Panel key={v.id} title={v.registration} sub={`${v.name} · ${v.emirate}`}>
            <div className="video-placeholder">
              <Camera size={34} />
              <strong>AI Dash Cam Stream Standby</strong>
              <span>Dual-channel 1080p forward & cabin lens</span>
            </div>
            <div className="camera-footer">
              <Badge>Demo Standby</Badge>
              <button
                type="button"
                className="text-button"
                onClick={() => setSelectedCamVehicle(v)}
              >
                Stream Telemetry Details
              </button>
            </div>
          </Panel>
        ))}
      </div>

      <Panel title="AI Dashcam Incident & ADAS Trigger Timeline">
        <div className="empty">
          No critical collision warnings or driver distraction clips detected during current demo session. AI safety models calibrated for UAE traffic conditions.
        </div>
      </Panel>

      {/* Camera details modal */}
      <Modal
        open={!!selectedCamVehicle}
        onClose={() => setSelectedCamVehicle(null)}
        title={`Dash Camera Configuration: ${selectedCamVehicle?.registration}`}
      >
        <div style={{ fontSize: 12, lineHeight: 1.8, color: '#4a5568' }}>
          <dl>
            <dt>Equipped Vehicle</dt>
            <dd>{selectedCamVehicle?.registration} ({selectedCamVehicle?.name})</dd>
            <dt>Camera Model</dt>
            <dd>Streamax ADAS Dual-Lens 4G Cat 4</dd>
            <dt>Protocol</dt>
            <dd>JT/T 1078 Video Over WebRTC</dd>
            <dt>Live Status</dt>
            <dd><Badge>Demo Simulated Standby</Badge></dd>
            <dt>Storage</dt>
            <dd>128 GB MicroSD (Simulated Local Loop)</dd>
          </dl>
          <div style={{ marginTop: 16, padding: 12, background: '#f8fafc', borderRadius: 6, display: 'flex', gap: 8, alignItems: 'center' }}>
            <ShieldAlert size={16} style={{ color: '#c6ab6d' }} />
            <span>Connect a live RTSP or WebRTC camera gateway to stream real video feeds.</span>
          </div>
        </div>
      </Modal>
    </>
  );
}
