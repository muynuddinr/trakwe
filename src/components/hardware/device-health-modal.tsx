'use client';

import React from 'react';
import { Modal } from '@/components/common/modal';
import { Badge } from '@/components/common/badge';
import { useHardwareTracking } from '@/context/hardware-tracking-context';
import {
  Activity,
  Cpu,
  Wifi,
  Radio,
  Server,
  CheckCircle2,
  AlertTriangle,
  Clock,
  ShieldCheck,
  Terminal,
  RefreshCw
} from 'lucide-react';

export function DeviceHealthModal() {
  const {
    openHealthModal,
    setOpenHealthModal,
    wsConnected,
    hasLiveHardwareStream,
    deviceHealthList,
    reconnect
  } = useHardwareTracking();

  return (
    <Modal
      open={openHealthModal}
      onClose={() => setOpenHealthModal(false)}
      title="Teltonika FMC920 Hardware Gateway — Ingestion Health & Diagnostics"
    >
      <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
        {/* Status banner */}
        <div
          style={{
            padding: '12px 16px',
            borderRadius: 8,
            backgroundColor: (hasLiveHardwareStream || wsConnected) ? 'rgba(45, 140, 117, 0.1)' : 'rgba(12, 47, 74, 0.05)',
            border: `1px solid ${(hasLiveHardwareStream || wsConnected) ? 'rgba(45, 140, 117, 0.3)' : 'rgba(12, 47, 74, 0.12)'}`,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between'
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
            <span
              style={{
                width: 10,
                height: 10,
                borderRadius: '50%',
                backgroundColor: (hasLiveHardwareStream || wsConnected) ? '#2d8c75' : '#c47b6b',
                boxShadow: (hasLiveHardwareStream || wsConnected) ? '0 0 10px #2d8c75' : 'none'
              }}
            />
            <div>
              <b style={{ fontSize: 13, color: '#0c2f4a' }}>
                {hasLiveHardwareStream
                  ? 'LIVE HARDWARE INGESTION ACTIVE — FMC920 REPORTING'
                  : wsConnected
                  ? 'TELTONIKA FMC920 TCP GATEWAY ONLINE & READY'
                  : 'GATEWAY DISCONNECTED (OFFLINE)'}
              </b>
              <p style={{ margin: 0, fontSize: 11, color: '#688296' }}>
                {hasLiveHardwareStream
                  ? 'Receiving genuine binary Codec 8 / 8E AVL frames and acknowledging with 4-byte Big-Endian integers'
                  : wsConnected
                  ? 'TCP Ingestion Server active on port 5027 · Listening for physical tracker IMEI 864022089340664'
                  : 'Start tracker ingestion service: `npm run tracker:start`'}
              </p>
            </div>
          </div>
          <button
            type="button"
            className="icon-button"
            title="Refresh connection"
            onClick={reconnect}
            aria-label="Reconnect gateway"
          >
            <RefreshCw size={15} />
          </button>
        </div>

        {/* Registered Devices Health Table */}
        <div>
          <h4 style={{ margin: '0 0 8px 0', fontSize: 13, color: '#0c2f4a', display: 'flex', alignItems: 'center', gap: 6 }}>
            <Cpu size={15} />
            Authorized Device Registry & Socket Health
          </h4>

          {deviceHealthList.length === 0 ? (
            <div style={{ padding: 16, textAlign: 'center', fontSize: 12, color: '#688296' }}>
              No devices configured. Checking registry...
            </div>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
              {deviceHealthList.map((d) => {
                const isTcpActive = d.tcpState === 'Authenticated' || d.connectionStatus === 'Reporting' || (!d.isStale && d.totalPacketsReceived > 0);
                return (
                  <div
                    key={d.imei}
                    style={{
                      border: '1px solid #e1e8ed',
                      borderRadius: 8,
                      padding: 12,
                      backgroundColor: '#fafbfc'
                    }}
                  >
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 8 }}>
                      <div>
                        <b style={{ fontSize: 13, color: '#0c2f4a' }}>IMEI: {d.imei}</b>
                        <span style={{ fontSize: 11, color: '#688296', marginLeft: 8 }}>
                          Assigned Vehicle: <b>{d.vehicleId}</b> ({d.vehicleName})
                        </span>
                      </div>
                      <Badge className={isTcpActive ? 'moving' : d.tcpState === 'Rejected' ? 'offline' : ''}>
                        {d.tcpState === 'Authenticated' ? 'TCP: Connected' : isTcpActive ? 'TCP: Active (Standby)' : 'TCP: Disconnected'}
                      </Badge>
                    </div>

                    <div
                      style={{
                        display: 'grid',
                        gridTemplateColumns: 'repeat(auto-fit, minmax(130px, 1fr))',
                        gap: 8,
                        fontSize: 11,
                        backgroundColor: '#ffffff',
                        padding: 10,
                        borderRadius: 6,
                        border: '1px solid #edf2f5'
                      }}
                    >
                      <div>
                        <span style={{ color: '#688296', display: 'block' }}>Remote Socket</span>
                        <b>{d.remoteAddress ? `${d.remoteAddress}:${d.remotePort}` : 'Cellular Standby'}</b>
                      </div>
                      <div>
                        <span style={{ color: '#688296', display: 'block' }}>Last Packet Received</span>
                        <b>{d.lastPacketReceived ? new Date(d.lastPacketReceived).toLocaleTimeString() : 'Awaiting packet'}</b>
                      </div>
                      <div>
                        <span style={{ color: '#688296', display: 'block' }}>Last Valid GPS Time</span>
                        <b>{d.lastValidGps ? new Date(d.lastValidGps).toLocaleTimeString() : 'Indoor Fix (0 satellites)'}</b>
                      </div>
                      <div>
                        <span style={{ color: '#688296', display: 'block' }}>Last Acknowledged</span>
                        <b>{d.lastAckHex ? `ACK 0x${d.lastAckHex}` : 'None'}</b>
                      </div>
                      <div>
                        <span style={{ color: '#688296', display: 'block' }}>AVL Records Ingested</span>
                        <b style={{ color: '#2d8c75' }}>{d.totalRecordsProcessed} records</b>
                      </div>
                      <div>
                        <span style={{ color: '#688296', display: 'block' }}>Packets Ingested</span>
                        <b>{d.totalPacketsReceived} pkts</b>
                      </div>
                    </div>

                    {d.lastError && d.totalPacketsReceived === 0 && (
                      <div style={{ marginTop: 8, padding: '6px 10px', backgroundColor: '#fff5f5', border: '1px solid #ffd1d1', borderRadius: 4, fontSize: 11, color: '#c47b6b' }}>
                        <AlertTriangle size={12} style={{ display: 'inline', marginRight: 4 }} />
                        Sanitized Parser Error: {d.lastError}
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          )}
        </div>

        {/* Quick Testing & Hardware Setup Checklist */}
        <div style={{ backgroundColor: '#f4f7f9', padding: 12, borderRadius: 8, fontSize: 11, color: '#334e68', lineHeight: 1.6 }}>
          <b style={{ display: 'block', color: '#0c2f4a', marginBottom: 4 }}>
            <Terminal size={12} style={{ display: 'inline', marginRight: 4 }} />
            Teltonika FMC920 Physical Hardware Setup Checklist:
          </b>
          <ol style={{ margin: '4px 0 0 16px', padding: 0 }}>
            <li>Connect FMC920 via micro-USB to PC and launch <b>Teltonika Configurator</b>.</li>
            <li>In <b>GPRS Settings</b>, enter local UAE SIM APN (e.g. <i>du</i> or <i>etisalat</i>).</li>
            <li>In <b>Server Settings</b>, set Protocol to <b>TCP</b>, Target Server IP, and Port: <code>5027</code>.</li>
            <li>In <b>System Settings</b>, select Data Protocol: <b>Codec 8</b> or <b>Codec 8 Extended</b>.</li>
            <li>Verify authorized IMEI matches the Trackwe registry. Unauthorized IMEIs are rejected with <code>0x00</code>.</li>
          </ol>
          <div style={{ marginTop: 8, fontSize: 11, color: '#688296' }}>
            To test without hardware right now, run in terminal: <code>npm run tracker:sim</code>
          </div>
        </div>

        <div className="modal-actions">
          <button
            type="button"
            className="button primary"
            onClick={() => setOpenHealthModal(false)}
          >
            Close Diagnostics
          </button>
        </div>
      </div>
    </Modal>
  );
}
