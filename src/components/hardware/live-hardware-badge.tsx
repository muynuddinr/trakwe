'use client';

import React from 'react';
import { useHardwareTracking } from '@/context/hardware-tracking-context';
import { Cpu, Radio, AlertCircle } from 'lucide-react';

export function LiveHardwareBadge() {
  const {
    wsConnected,
    hasLiveHardwareStream,
    activeDeviceHealth,
    setOpenHealthModal,
    lastPacketTime
  } = useHardwareTracking();

  if (!wsConnected) {
    return (
      <button
        type="button"
        className="live-hardware-badge offline"
        onClick={() => setOpenHealthModal(true)}
        title="Tracking gateway offline. Click for diagnostics."
      >
        <span className="indicator-dot offline" />
        <span className="badge-text">GATEWAY OFFLINE (RETRYING)</span>
      </button>
    );
  }

  if (hasLiveHardwareStream) {
    return (
      <button
        type="button"
        className="live-hardware-badge live"
        onClick={() => setOpenHealthModal(true)}
        title="Receiving live Teltonika FMC920 TCP telemetry packets! Click for diagnostics."
      >
        <span className="indicator-dot live-pulse" />
        <span className="badge-text">
          LIVE HARDWARE · TELTONIKA FMC920
        </span>
        {lastPacketTime && (
          <span className="badge-sub">{lastPacketTime}</span>
        )}
      </button>
    );
  }

  return (
    <button
      type="button"
      className="live-hardware-badge live"
      onClick={() => setOpenHealthModal(true)}
      title="Teltonika FMC920 TCP Gateway active on Port 5027. Click for diagnostics."
    >
      <span className="indicator-dot live-pulse" />
      <span className="badge-text">LIVE HARDWARE · TELTONIKA FMC920</span>
      <span className="badge-sub">Port 5027</span>
    </button>
  );
}
