'use client';

import React, { useState } from 'react';
import dynamic from 'next/dynamic';
import { useFleet } from '@/context/fleet-context';
import { useHardwareTracking } from '@/context/hardware-tracking-context';
import { Vehicle } from '@/types';
import { Badge } from '@/components/common/badge';
import { NavItemKey } from '@/data/mock-credentials';
import {
  Truck,
  Search,
  X,
  MapPin,
  Clock,
  Route,
  Plus,
  Bell,
  Cpu,
  Radio,
  Zap,
  Activity,
  AlertTriangle
} from 'lucide-react';

const FleetMap = dynamic(() => import('@/components/map/fleet-map'), {
  ssr: false,
  loading: () => <div className="map-loading">Loading interactive UAE fleet map…</div>
});

interface LiveTrackingViewProps {
  onNavigate: (page: NavItemKey) => void;
  onOpenTaskModal: () => void;
}

export function LiveTrackingView({ onNavigate, onOpenTaskModal }: LiveTrackingViewProps) {
  const { vehicles, selectedVehicle, selectedVehicleId, setSelectedVehicleId, geofences } = useFleet();
  const { hasLiveHardwareStream, setOpenHealthModal } = useHardwareTracking();
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState<'All' | 'Moving' | 'Idle' | 'Offline'>('All');

  const filteredVehicles = vehicles.filter((v) => {
    const matchesStatus = statusFilter === 'All' || v.status === statusFilter;
    const matchesSearch = `${v.registration} ${v.name} ${v.driver} ${v.emirate} ${v.locationName}`
      .toLowerCase()
      .includes(searchQuery.toLowerCase());
    return matchesStatus && matchesSearch;
  });

  const handleSelect = (v: Vehicle) => {
    setSelectedVehicleId(v.id);
  };

  return (
    <div className="tracking-layout">
      {/* Left Sidebar: Vehicle List & Filters */}
      <div className="vehicle-list">
        <div className="vehicle-list-header">
          <h3>
            UAE Fleet <span>{filteredVehicles.length} of {vehicles.length}</span>
          </h3>

          <label className="search">
            <Search size={15} />
            <input
              placeholder="Search plate, driver, emirate…"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              aria-label="Filter vehicles list"
            />
          </label>

          <div className="status-tabs">
            {(['All', 'Moving', 'Idle', 'Offline'] as const).map((s) => (
              <button
                key={s}
                type="button"
                className={statusFilter === s ? 'active' : ''}
                onClick={() => setStatusFilter(s)}
              >
                {s}
              </button>
            ))}
          </div>
        </div>

        <div className="vehicle-list-scroll">
          {filteredVehicles.map((v) => {
            const isSelected = v.id === selectedVehicleId;
            return (
              <button
                key={v.id}
                id={`vehicle-card-${v.id}`}
                type="button"
                className={`vehicle-row ${isSelected ? 'selected' : ''} ${v.isLiveHardware ? 'live-hardware-row' : ''}`}
                onClick={() => handleSelect(v)}
              >
                <span className="vehicle-type">
                  <Truck size={22} />
                </span>
                <span className="vehicle-copy">
                  <b style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                    {v.registration}
                    {v.isLiveHardware && (
                      <span className="hardware-pill-tag">
                        <span className="indicator-dot live-pulse small" />
                        FMC920
                      </span>
                    )}
                  </b>
                  <span>{v.name}</span>
                  <small>
                    <i className={`status-dot ${v.status.toLowerCase()}`} />
                    {v.status} · {v.emirate}
                  </small>
                </span>
                <span className="speed">
                  {v.speed}
                  <small>km/h</small>
                </span>
              </button>
            );
          })}

          {!filteredVehicles.length && (
            <div className="empty">No vehicles matching filter.</div>
          )}
        </div>

        <div className="vehicle-list-footer">
          {hasLiveHardwareStream
            ? '● Live Teltonika FMC920 telemetry stream active'
            : 'UAE Fleet Telemetry stream active · Dubai Dispatch'}
        </div>
      </div>

      {/* Right Map & Vehicle Details Card */}
      <div className="tracking-map">
        <FleetMap
          vehicles={filteredVehicles}
          selected={selectedVehicle}
          onSelect={handleSelect}
          geofences={geofences}
        />

        {/* Selected Vehicle Floating Details Card */}
        {selectedVehicle && (
          <div className="vehicle-details">
            <div className="detail-title">
              <span className="truck-illustration">
                <Truck size={34} />
              </span>
              <button
                type="button"
                className="icon-button"
                aria-label="Close vehicle details"
                onClick={() => setSelectedVehicleId(null)}
              >
                <X size={16} />
              </button>
            </div>

            {/* Teltonika FMC920 Live Hardware Stream Indicator */}
            {selectedVehicle.isLiveHardware ? (
              <div
                className="fmc920-live-pill"
                onClick={() => setOpenHealthModal(true)}
                title="Click to view Teltonika TCP packet & socket diagnostics"
              >
                <span className="indicator-dot live-pulse small" />
                <span>
                  <b>LIVE FMC920 HARDWARE</b> · IMEI: {selectedVehicle.liveImei || '864022089340664'}
                </span>
                <span className="fmc920-pill-action">Diagnostics ↗</span>
              </div>
            ) : (
              <div
                className="fmc920-live-pill"
                onClick={() => setOpenHealthModal(true)}
              >
                <span className="indicator-dot live-pulse small" />
                <span><b>LIVE FMC920 HARDWARE</b> · Port 5027</span>
              </div>
            )}

            <h3>{selectedVehicle.registration}</h3>
            <p>{selectedVehicle.name} ({selectedVehicle.type})</p>
            <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap', margin: '4px 0 8px' }}>
              <Badge>{selectedVehicle.status}</Badge>
              <Badge className="moving">TCP Codec 8/8E</Badge>
              {!selectedVehicle.hasGpsFix && (
                <Badge className="offline">Indoor Fix (Acquiring GPS)</Badge>
              )}
            </div>

            <div className="detail-driver">
              <span className="avatar small">
                {selectedVehicle.driver.slice(0, 1)}
              </span>
              <span>
                <b>{selectedVehicle.driver}</b>
                <small>Assigned Driver · {selectedVehicle.emirate}</small>
              </span>
            </div>

            <div className="detail-grid">
              <div>
                <small>Current Speed</small>
                <b>{selectedVehicle.speed} km/h</b>
              </div>
              <div>
                <small>Ignition (ID 239)</small>
                <b>
                  {selectedVehicle.ignitionState ? 'Engine ON (1)' : 'Engine OFF (0)'}
                </b>
              </div>
              <div>
                <small>Motion (ID 240)</small>
                <b>
                  {selectedVehicle.movementState ? 'In Motion (1)' : 'Stationary (0)'}
                </b>
              </div>
              <div>
                <small>Ext. Voltage (ID 66)</small>
                <b>{(selectedVehicle.externalVoltage || selectedVehicle.battery || 11.96).toFixed(1)} V</b>
              </div>
              <div>
                <small>Backup Battery (ID 67)</small>
                <b>{(selectedVehicle.internalBattery || 3.82).toFixed(2)} V</b>
              </div>
              <div>
                <small>GSM Signal (ID 21)</small>
                <b>{selectedVehicle.gsmSignal || 5} / 5 bars</b>
              </div>
            </div>

            {selectedVehicle.isOutOfCorridor && (
              <div className="corridor-warning-box">
                <AlertTriangle size={14} />
                <span>Notice: GPS coordinates reported outside UAE corridor ({selectedVehicle.lat.toFixed(4)}, {selectedVehicle.lng.toFixed(4)})</span>
              </div>
            )}

            <p className="detail-note">
              <MapPin size={13} />
              <span>{selectedVehicle.locationName}</span>
            </p>
            <p className="detail-note">
              <Clock size={13} />
              <span>GPS Updated: {selectedVehicle.updated}</span>
            </p>

            <div className="detail-actions">
              <button
                type="button"
                onClick={() => onNavigate('trips')}
              >
                <Route size={14} />
                Route history
              </button>
              <button
                type="button"
                onClick={() => onNavigate('vehicles')}
              >
                <Truck size={14} />
                Fleet details
              </button>
              <button
                type="button"
                onClick={onOpenTaskModal}
              >
                <Plus size={14} />
                Assign task
              </button>
              <button
                type="button"
                onClick={() => onNavigate('alerts')}
              >
                <Bell size={14} />
                View alerts
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
