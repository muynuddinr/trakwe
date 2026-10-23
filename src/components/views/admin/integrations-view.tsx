'use client';

import React, { useState } from 'react';
import { useFleet } from '@/context/fleet-context';
import { Panel } from '@/components/common/panel';
import { Badge } from '@/components/common/badge';
import { Modal } from '@/components/common/modal';
import { Plug } from 'lucide-react';
import { DeviceIntegration } from '@/types';

interface IntegrationsViewProps {
  showToast: (msg: string) => void;
}

export function IntegrationsView({ showToast }: IntegrationsViewProps) {
  const { integrations } = useFleet();
  const [activeIntegration, setActiveIntegration] = useState<DeviceIntegration | null>(null);

  const handleSaveConfig = (e: React.FormEvent) => {
    e.preventDefault();
    showToast(`Configuration updated for ${activeIntegration?.model}`);
    setActiveIntegration(null);
  };

  return (
    <>
      <div className="info-banner">
        <Plug size={16} />
        Device integration catalog for hardware installed in UAE commercial vehicles. Telemetry endpoints are simulated in memory for this demo.
      </div>

      <div className="integration-grid">
        {integrations.map((i) => (
          <Panel key={i.id} title={i.manufacturer} sub={i.model}>
            <div className="integration-icon">
              <Plug size={30} />
            </div>
            <dl>
              <dt>Protocol</dt>
              <dd>{i.protocol}</dd>
              <dt>Capabilities</dt>
              <dd>{i.capabilities}</dd>
              <dt>Device Link</dt>
              <dd><Badge>{i.connection}</Badge></dd>
              <dt>Configuration</dt>
              <dd><Badge>{i.status}</Badge></dd>
            </dl>
            <button
              type="button"
              className="button full"
              onClick={() => setActiveIntegration(i)}
            >
              Configure Gateway
            </button>
          </Panel>
        ))}
      </div>

      {/* Configuration modal */}
      <Modal
        open={!!activeIntegration}
        onClose={() => setActiveIntegration(null)}
        title={`Configure Gateway: ${activeIntegration?.model}`}
      >
        <form onSubmit={handleSaveConfig}>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
            <label>
              Manufacturer / Hardware Vendor
              <input disabled value={activeIntegration?.manufacturer} />
            </label>
            <label>
              Gateway Protocol Specification
              <input disabled value={activeIntegration?.protocol} />
            </label>
            <label>
              TCP / UDP Port Endpoint (UAE Cloud Gateway)
              <input defaultValue="tcp://telematics.trackwe.ae:8088" />
            </label>
            <label>
              Device Reporting Heartbeat Interval
              <select defaultValue="30">
                <option value="10">Every 10 seconds (High Precision)</option>
                <option value="30">Every 30 seconds (Standard Highway)</option>
                <option value="60">Every 60 seconds (Eco Telemetry)</option>
              </select>
            </label>
            <p style={{ fontSize: 11, color: '#688296', lineHeight: 1.6, margin: '8px 0' }}>
              In Phase 2, backend socket servers and MongoDB will ingest real binary TCP/UDP packets from physical Teltonika & Queclink hardware.
            </p>
          </div>

          <div className="modal-actions">
            <button
              type="button"
              className="button"
              onClick={() => setActiveIntegration(null)}
            >
              Cancel
            </button>
            <button type="submit" className="button primary">
              Save Gateway Configuration
            </button>
          </div>
        </form>
      </Modal>
    </>
  );
}
