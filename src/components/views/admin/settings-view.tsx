'use client';

import React, { useState } from 'react';
import { useAuth } from '@/context/auth-context';
import { useFleet } from '@/context/fleet-context';
import { Panel } from '@/components/common/panel';
import { RotateCcw, AlertTriangle, CheckCircle2 } from 'lucide-react';

interface SettingsViewProps {
  showToast: (msg: string) => void;
}

export function SettingsView({ showToast }: SettingsViewProps) {
  const { permissions, role } = useAuth();
  const { resetDemoData } = useFleet();

  const [orgName, setOrgName] = useState('Trackwe Logistics UAE');
  const [timezone, setTimezone] = useState('Asia/Dubai (UTC +04:00)');
  const [distanceUnit, setDistanceUnit] = useState('Kilometres (km)');
  const [currency, setCurrency] = useState('AED (United Arab Emirates Dirham)');
  const [showConfirmReset, setShowConfirmReset] = useState(false);

  const handleSavePreferences = (e: React.FormEvent) => {
    e.preventDefault();
    showToast('Workspace settings saved successfully');
  };

  const handleReset = () => {
    resetDemoData();
    setShowConfirmReset(false);
    showToast('All fleet data reset to original UAE seed dataset');
  };

  return (
    <div className="settings-grid">
      <Panel title="UAE Workspace Preferences" sub="Organization defaults">
        <form onSubmit={handleSavePreferences}>
          <label>
            Organization Name
            <input
              required
              value={orgName}
              onChange={(e) => setOrgName(e.target.value)}
            />
          </label>

          <label>
            Regional Timezone
            <select
              value={timezone}
              onChange={(e) => setTimezone(e.target.value)}
            >
              <option value="Asia/Dubai (UTC +04:00)">Asia/Dubai (UTC +04:00) — Gulf Standard Time</option>
              <option value="UTC">UTC (Universal Time Coordinated)</option>
            </select>
          </label>

          <label>
            Distance Metric
            <select
              value={distanceUnit}
              onChange={(e) => setDistanceUnit(e.target.value)}
            >
              <option value="Kilometres (km)">Kilometres (km)</option>
              <option value="Miles (mi)">Miles (mi)</option>
            </select>
          </label>

          <label>
            Operating Currency
            <select
              value={currency}
              onChange={(e) => setCurrency(e.target.value)}
            >
              <option value="AED (United Arab Emirates Dirham)">AED (United Arab Emirates Dirham)</option>
            </select>
          </label>

          <button type="submit" className="button primary" style={{ marginTop: 10 }}>
            Save Preferences
          </button>
        </form>
      </Panel>

      <div style={{ display: 'flex', flexDirection: 'column', gap: 18 }}>
        <Panel title="System Architecture & Metadata" sub="Trackwe Platform Specs">
          <dl>
            <dt>Platform</dt>
            <dd>Trackwe Fleet Intelligence 2.0</dd>
            <dt>Geography</dt>
            <dd>United Arab Emirates (UAE)</dd>
            <dt>Map Provider</dt>
            <dd>OpenStreetMap (Leaflet Tile Engine)</dd>
            <dt>Active Role</dt>
            <dd><strong>{role}</strong></dd>
            <dt>Demo Persistence</dt>
            <dd>Browser Storage (Safe Hydration)</dd>
            <dt>Phase 2 Target</dt>
            <dd>MongoDB + Live TCP Telemetry Ingestion</dd>
          </dl>
        </Panel>

        {permissions?.canResetData && (
          <Panel
            title="Reset Demo Dataset"
            sub="Revert all changes to factory UAE seed data"
          >
            <div style={{ padding: 18 }}>
              <p style={{ fontSize: 11, color: '#688296', lineHeight: 1.6, marginBottom: 14 }}>
                Resets all vehicles, drivers, tasks, expenses, geofences, and alert acknowledgements back to their pristine seed state.
              </p>

              {showConfirmReset ? (
                <div style={{ padding: 12, background: '#fef2f2', border: '1px solid #fecaca', borderRadius: 6 }}>
                  <div style={{ display: 'flex', gap: 8, alignItems: 'center', color: '#991b1b', fontSize: 11, marginBottom: 10 }}>
                    <AlertTriangle size={16} />
                    <strong>Are you sure? This will clear all changes made in your browser session.</strong>
                  </div>
                  <div style={{ display: 'flex', gap: 8 }}>
                    <button
                      type="button"
                      className="button small"
                      onClick={handleReset}
                      style={{ background: '#b91c1c', color: '#fff', borderColor: '#b91c1c' }}
                    >
                      Yes, Reset Demo Data
                    </button>
                    <button
                      type="button"
                      className="button small"
                      onClick={() => setShowConfirmReset(false)}
                    >
                      Cancel
                    </button>
                  </div>
                </div>
              ) : (
                <button
                  type="button"
                  className="button"
                  onClick={() => setShowConfirmReset(true)}
                  style={{ color: '#c47b6b', borderColor: '#fca5a5' }}
                >
                  <RotateCcw size={14} /> Reset Demo Data
                </button>
              )}
            </div>
          </Panel>
        )}
      </div>
    </div>
  );
}
