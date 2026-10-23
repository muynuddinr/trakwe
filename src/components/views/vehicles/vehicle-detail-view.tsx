'use client';

import React, { useState } from 'react';
import { useFleet } from '@/context/fleet-context';
import { NavItemKey } from '@/data/mock-credentials';
import { Panel } from '@/components/common/panel';
import { Badge } from '@/components/common/badge';
import {
  Navigation,
  ArrowLeft,
  Truck,
  Fuel,
  Gauge,
  Thermometer,
  Battery,
  ShieldCheck,
  Calendar,
  Wrench,
  Phone,
  AlertTriangle,
  Route,
  CheckCircle2,
  Clock,
  MapPin,
  Plus
} from 'lucide-react';
import { Vehicle } from '@/types';

interface VehicleDetailViewProps {
  vehicleId: string | null;
  onNavigate: (page: NavItemKey) => void;
  onTrackOnMap: (vehicleId: string) => void;
  onOpenTaskModal?: () => void;
  onSelectVehicle?: (vehicleId: string) => void;
  showToast?: (msg: string) => void;
}

export function VehicleDetailView({
  vehicleId,
  onNavigate,
  onTrackOnMap,
  onOpenTaskModal,
  onSelectVehicle,
  showToast
}: VehicleDetailViewProps) {
  const { vehicles, drivers, trips, alerts } = useFleet();

  // Find the vehicle, fallback to the first vehicle if id not found
  const vehicle: Vehicle =
    vehicles.find((v) => v.id === vehicleId) || vehicles[0];

  const assignedDriver = drivers.find((d) => d.name === vehicle?.driver);
  const vehicleTrips = trips.filter((t) => t.vehicle === vehicle?.registration);
  const vehicleAlerts = alerts.filter((a) => a.vehicle === vehicle?.registration);

  const [activePhoto, setActivePhoto] = useState<string>(
    vehicle?.image ||
      'https://images.unsplash.com/photo-1601584115197-04ecc0da31d7?auto=format&fit=crop&w=1200&q=80'
  );

  const gallery = vehicle?.gallery && vehicle.gallery.length > 0
    ? [vehicle.image, ...vehicle.gallery.filter((img) => img !== vehicle.image)]
    : [vehicle?.image || 'https://images.unsplash.com/photo-1601584115197-04ecc0da31d7?auto=format&fit=crop&w=1200&q=80'];

  const specs = vehicle?.specs || {
    engine: '13L Turbo Diesel Common Rail 460hp',
    transmission: '12-Speed Automated Manual',
    payload: '24,000 kg',
    tankCapacity: '600 L',
    dimensions: '16.5m × 2.6m × 4.0m',
    vin: 'YV2RT40A9MA104829',
    year: 2025,
    odometer: 48210,
    oilLife: 82,
    brakeLife: 90,
    tireHealth: '94% (Good)',
    nextService: '2026-12-15'
  };

  return (
    <div className="vehicle-detail-page">
      {/* Top Navigation Bar */}
      <div className="detail-top-nav">
        <button
          type="button"
          className="button back-btn"
          onClick={() => onNavigate('vehicles')}
        >
          <ArrowLeft size={15} />
          <span>Back to Fleet Directory</span>
        </button>

        <div className="detail-top-actions">
          {onOpenTaskModal && (
            <button
              type="button"
              className="button"
              onClick={onOpenTaskModal}
            >
              <Plus size={14} />
              <span>Assign Maintenance Task</span>
            </button>
          )}

          <button
            type="button"
            className="button primary track-live-btn"
            onClick={() => onTrackOnMap(vehicle.id)}
            title="Open interactive UAE live map centered on this vehicle"
          >
            <Navigation size={15} fill="currentColor" />
            <span>Track Vehicle Live on Map</span>
          </button>
        </div>
      </div>

      {/* Hero Showcase Card */}
      <div className="vehicle-hero-card">
        <div className="vehicle-gallery-section">
          <div className="hero-image-wrap">
            <img
              src={activePhoto}
              alt={vehicle.name}
              className="hero-vehicle-img"
            />
            <div className="hero-badge-overlay">
              <span className={`status-pill ${vehicle.status.toLowerCase()}`}>
                <i className="pulse-dot" />
                {vehicle.status}
              </span>
              <span className="emirate-tag">{vehicle.emirate}</span>
            </div>
          </div>

          {gallery.length > 1 && (
            <div className="gallery-thumbnails">
              {gallery.map((thumbUrl, idx) => (
                <button
                  key={idx}
                  type="button"
                  className={`thumb-btn ${activePhoto === thumbUrl ? 'active' : ''}`}
                  onClick={() => { if (thumbUrl) setActivePhoto(thumbUrl); }}
                >
                  <img src={thumbUrl} alt={`Thumbnail ${idx + 1}`} />
                </button>
              ))}
            </div>
          )}
        </div>

        {/* Hero Details Meta */}
        <div className="vehicle-meta-section">
          <div className="plate-badge-row">
            <div className="uae-plate-box">
              <span className="plate-emirate">{vehicle.emirate.toUpperCase()}</span>
              <span className="plate-number">{vehicle.registration.replace(/^.*?\s/, '')}</span>
            </div>
            <Badge>{vehicle.type}</Badge>
          </div>

          <h2 className="hero-vehicle-title">{vehicle.name}</h2>
          <p className="hero-vehicle-location">
            <MapPin size={14} />
            <span>{vehicle.locationName}</span>
          </p>

          {/* Quick Metrics Strip */}
          <div className="hero-metrics-strip">
            <div className="metric-box">
              <span className="metric-lbl">
                <Gauge size={14} /> Live Speed
              </span>
              <strong>{vehicle.speed} <small>km/h</small></strong>
            </div>

            <div className="metric-box">
              <span className="metric-lbl">
                <Fuel size={14} /> Fuel Level
              </span>
              <strong>{vehicle.fuel}% <small>({Math.round(vehicle.fuel * 5.8)} L)</small></strong>
            </div>

            {vehicle.temperature !== null ? (
              <div className="metric-box">
                <span className="metric-lbl">
                  <Thermometer size={14} /> Cargo Temp
                </span>
                <strong style={{ color: vehicle.temperature > 8.0 ? '#c47b6b' : '#2d8c75' }}>
                  {vehicle.temperature} °C
                </strong>
              </div>
            ) : (
              <div className="metric-box">
                <span className="metric-lbl">
                  <Battery size={14} /> Battery
                </span>
                <strong>{vehicle.battery.toFixed(1)} <small>V</small></strong>
              </div>
            )}

            <div className="metric-box">
              <span className="metric-lbl">
                <Route size={14} /> Today's Run
              </span>
              <strong>{vehicle.distance} <small>km</small></strong>
            </div>
          </div>

          {/* CTA Banner inside hero */}
          <div className="hero-cta-banner">
            <div>
              <b>GPS Telematics Active</b>
              <small>Last handshake: {vehicle.updated}</small>
            </div>
            <button
              type="button"
              className="button primary small"
              onClick={() => onTrackOnMap(vehicle.id)}
            >
              <Navigation size={13} fill="currentColor" /> Live Telemetry Feed
            </button>
          </div>
        </div>
      </div>

      {/* Main Grid: Specifications, Assigned Driver, Health */}
      <div className="detail-content-grid">
        {/* Column 1: Specifications & Telematics Hardware */}
        <div className="detail-col">
          {/* Teltonika FMC920 Live Hardware Telemetry Panel */}
          <Panel
            title="Teltonika FMC920 Hardware Telemetry"
            sub="Real-time Codec 8 / Codec 8 Extended I/O parameter streams"
            action={
              <Badge className={vehicle.isLiveHardware ? 'moving' : ''}>
                {vehicle.isLiveHardware ? '● Live Hardware Stream' : 'FMC920 Profile'}
              </Badge>
            }
          >
            <div className="fmc920-telemetry-grid">
              <div className="fmc-item">
                <span className="fmc-code">I/O ID 239</span>
                <span className="fmc-label">Ignition (ACC)</span>
                <b className={vehicle.ignitionState ? 'status-on' : ''}>
                  {vehicle.isLiveHardware
                    ? (vehicle.ignitionState ? 'Engine ON (1)' : 'Engine OFF (0)')
                    : (vehicle.status === 'Offline' ? 'Engine OFF' : 'Engine ON (1)')}
                </b>
              </div>
              <div className="fmc-item">
                <span className="fmc-code">I/O ID 240</span>
                <span className="fmc-label">Movement State</span>
                <b className={vehicle.movementState ? 'status-on' : ''}>
                  {vehicle.isLiveHardware
                    ? (vehicle.movementState ? 'In Motion (1)' : 'Stationary (0)')
                    : (vehicle.status === 'Moving' ? 'In Motion (1)' : 'Stationary (0)')}
                </b>
              </div>
              <div className="fmc-item">
                <span className="fmc-code">I/O ID 66</span>
                <span className="fmc-label">External Main Battery</span>
                <b>{(vehicle.externalVoltage || vehicle.battery).toFixed(2)} V</b>
              </div>
              <div className="fmc-item">
                <span className="fmc-code">I/O ID 67</span>
                <span className="fmc-label">Internal Backup Battery</span>
                <b>{(vehicle.internalBattery || 3.82).toFixed(2)} V</b>
              </div>
              <div className="fmc-item">
                <span className="fmc-code">I/O ID 21</span>
                <span className="fmc-label">GSM Signal Strength</span>
                <b>{vehicle.gsmSignal || 4} / 5 bars</b>
              </div>
              <div className="fmc-item">
                <span className="fmc-code">DEVICE IMEI</span>
                <span className="fmc-label">Authorized Hardware</span>
                <b style={{ fontFamily: 'monospace', fontSize: 12 }}>{vehicle.liveImei || '356289104928172'}</b>
              </div>
            </div>
            {vehicle.isOutOfCorridor && (
              <div style={{ marginTop: 10, padding: '8px 12px', background: '#fff5f5', border: '1px solid #fed7d7', borderRadius: 6, fontSize: 11, color: '#c47b6b' }}>
                <AlertTriangle size={13} style={{ display: 'inline', marginRight: 4 }} />
                Device reported coordinates outside standard UAE corridor ({vehicle.lat.toFixed(4)}, {vehicle.lng.toFixed(4)})
              </div>
            )}
          </Panel>

          <Panel title="Vehicle Specifications & Build" sub="Manufacturer documentation">
            <div className="spec-table-wrap">
              <table className="spec-table">
                <tbody>
                  <tr>
                    <td>Engine Powertrain</td>
                    <td><strong>{specs.engine}</strong></td>
                  </tr>
                  <tr>
                    <td>Transmission</td>
                    <td>{specs.transmission}</td>
                  </tr>
                  <tr>
                    <td>Payload Capacity</td>
                    <td>{specs.payload}</td>
                  </tr>
                  <tr>
                    <td>Fuel Tank Capacity</td>
                    <td>{specs.tankCapacity}</td>
                  </tr>
                  <tr>
                    <td>Overall Dimensions</td>
                    <td>{specs.dimensions}</td>
                  </tr>
                  <tr>
                    <td>VIN (Chassis Number)</td>
                    <td><code>{specs.vin}</code></td>
                  </tr>
                  <tr>
                    <td>Model Year</td>
                    <td>{specs.year}</td>
                  </tr>
                  <tr>
                    <td>Installed Telematics Gateway</td>
                    <td><Badge>{vehicle.device}</Badge></td>
                  </tr>
                </tbody>
              </table>
            </div>
          </Panel>

          {/* Fleet Health & Preventative Maintenance */}
          <Panel title="Preventative Fleet Maintenance" sub="Sensor health diagnostics">
            <div className="health-grid">
              <div className="health-card">
                <div className="health-head">
                  <span>Engine Oil Life</span>
                  <b>{specs.oilLife}%</b>
                </div>
                <div className="health-bar">
                  <span style={{ width: `${specs.oilLife}%`, background: specs.oilLife > 40 ? '#2d8c75' : '#c6ab6d' }} />
                </div>
              </div>

              <div className="health-card">
                <div className="health-head">
                  <span>Brake Pad Remaining</span>
                  <b>{specs.brakeLife}%</b>
                </div>
                <div className="health-bar">
                  <span style={{ width: `${specs.brakeLife}%`, background: specs.brakeLife > 40 ? '#2d8c75' : '#c47b6b' }} />
                </div>
              </div>

              <div className="health-info-row">
                <div>
                  <small>Tire Wear Status</small>
                  <b>{specs.tireHealth}</b>
                </div>
                <div>
                  <small>Next Scheduled Service</small>
                  <b>{specs.nextService}</b>
                </div>
              </div>
            </div>
          </Panel>
        </div>

        {/* Column 2: Assigned Driver & Recent Activity */}
        <div className="detail-col">
          {/* Assigned Driver Profile Card */}
          <Panel title="Assigned Commercial Driver" sub="Operating in UAE fleet jurisdiction">
            <div className="driver-profile-card">
              <div className="driver-avatar-wrap">
                <img
                  src={
                    assignedDriver?.avatar ||
                    'https://images.unsplash.com/photo-1534528741775-53994a69daeb?auto=format&fit=crop&w=256&h=256&q=80'
                  }
                  alt={vehicle.driver}
                  className="driver-portrait"
                />
                <span className="driver-status-badge">
                  {assignedDriver?.status || 'On duty'}
                </span>
              </div>

              <div className="driver-details-body">
                <h3>{vehicle.driver}</h3>
                <span className="driver-role-title">Commercial Transport Specialist</span>

                <div className="driver-meta-grid">
                  <div>
                    <small>UAE License</small>
                    <b>{assignedDriver?.licenseNo || 'DXB-HC-9821'}</b>
                  </div>
                  <div>
                    <small>Mobile Phone</small>
                    <b>{assignedDriver?.contact || '+971 50 241 8921'}</b>
                  </div>
                  <div>
                    <small>Driving Experience</small>
                    <b>{assignedDriver?.experience || '8 years'}</b>
                  </div>
                  <div>
                    <small>Safety Rating</small>
                    <b style={{ color: '#2d8c75' }}>{assignedDriver?.score || 98} / 100</b>
                  </div>
                </div>

                <div className="driver-actions">
                  <a
                    href={`tel:${assignedDriver?.contact || '+971502418921'}`}
                    className="button small"
                  >
                    <Phone size={13} /> Call Driver
                  </a>
                  <button
                    type="button"
                    className="button small"
                    onClick={() => onNavigate('behavior')}
                  >
                    <ShieldCheck size={13} /> Driver Scorecard
                  </button>
                </div>
              </div>
            </div>
          </Panel>

          {/* Recent Trips */}
          <Panel
            title="Recent Trips & Route History"
            sub={`Corridors logged for ${vehicle.registration}`}
            action={
              <button
                type="button"
                className="text-button"
                onClick={() => onNavigate('trips')}
              >
                All trips
              </button>
            }
          >
            <div className="trip-mini-list">
              {vehicleTrips.length > 0 ? (
                vehicleTrips.slice(0, 3).map((t) => (
                  <div key={t.id} className="trip-mini-item">
                    <div className="trip-mini-icon">
                      <Route size={16} />
                    </div>
                    <div className="trip-mini-info">
                      <b>{t.route}</b>
                      <small>
                        {t.date} · {t.distance} km · {t.duration}
                      </small>
                    </div>
                    <Badge>{t.status}</Badge>
                  </div>
                ))
              ) : (
                <div className="empty" style={{ padding: 18 }}>
                  No recent trips logged today for this vehicle.
                </div>
              )}
            </div>
          </Panel>

          {/* Active Alerts for this vehicle */}
          <Panel
            title="Sensor & Geofence Alerts"
            sub="Active telemetry notifications"
            action={
              <button
                type="button"
                className="text-button"
                onClick={() => onNavigate('alerts')}
              >
                View all alerts
              </button>
            }
          >
            <div className="alerts-mini-list">
              {vehicleAlerts.length > 0 ? (
                vehicleAlerts.slice(0, 3).map((a) => (
                  <div key={a.id} className="alert-mini-item">
                    <AlertTriangle
                      size={16}
                      style={{
                        color: a.severity === 'Critical' ? '#c47b6b' : '#c6ab6d',
                        flexShrink: 0
                      }}
                    />
                    <div className="alert-mini-text">
                      <b>{a.type}</b>
                      <span>{a.location}</span>
                      <small>{a.time}</small>
                    </div>
                    <Badge>{a.status}</Badge>
                  </div>
                ))
              ) : (
                <div style={{ padding: '16px 18px', display: 'flex', alignItems: 'center', gap: 8, fontSize: 11, color: '#2d8c75' }}>
                  <CheckCircle2 size={16} />
                  <span>No active telemetry alerts for {vehicle.registration}.</span>
                </div>
              )}
            </div>
          </Panel>
        </div>
      </div>
    </div>
  );
}
