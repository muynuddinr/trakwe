'use client';

import React, { useState } from 'react';
import { useAuth } from '@/context/auth-context';
import { useFleet } from '@/context/fleet-context';
import { Panel } from '@/components/common/panel';
import { Modal } from '@/components/common/modal';
import { Badge } from '@/components/common/badge';
import { Plus, LayoutGrid, List, Phone, ShieldCheck, Award } from 'lucide-react';
import { Driver } from '@/types';

interface DriversViewProps {
  showToast: (msg: string) => void;
}

export function DriversView({ showToast }: DriversViewProps) {
  const { permissions } = useAuth();
  const { drivers, addDriver, vehicles } = useFleet();

  const [statusFilter, setStatusFilter] = useState('All');
  const [viewMode, setViewMode] = useState<'grid' | 'table'>('grid');
  const [showAddModal, setShowAddModal] = useState(false);

  // Form state
  const [name, setName] = useState('');
  const [contact, setContact] = useState('+971 50 ');
  const [assignedVehicle, setAssignedVehicle] = useState(vehicles[0]?.registration || 'Dubai A-10842');
  const [licenseNo, setLicenseNo] = useState('DXB-HC-');
  const [emirate, setEmirate] = useState('Dubai');
  const [experience, setExperience] = useState('5 years');

  const filtered = drivers.filter((d) => {
    if (statusFilter === 'All') return true;
    return d.status === statusFilter;
  });

  const handleCreateDriver = (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim()) return;

    addDriver({
      name: name.trim(),
      contact: contact.trim(),
      vehicle: assignedVehicle,
      licenseNo: licenseNo.trim(),
      emirate,
      status: 'On duty',
      score: 100,
      events: 0,
      avatar: 'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?auto=format&fit=crop&w=256&h=256&q=80',
      experience: experience.trim()
    });

    setShowAddModal(false);
    setName('');
    showToast(`Driver ${name.trim()} added successfully`);
  };

  return (
    <>
      <div className="module-toolbar">
        <div className="filters">
          <select
            aria-label="Filter status"
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
          >
            <option value="All">All Drivers</option>
            <option value="On duty">On Duty</option>
            <option value="Off duty">Off Duty</option>
          </select>
        </div>

        <div className="filters">
          <div className="view-toggle-wrap">
            <button
              type="button"
              className={`button small ${viewMode === 'grid' ? 'primary' : ''}`}
              onClick={() => setViewMode('grid')}
              title="Show driver profile cards"
            >
              <LayoutGrid size={14} /> Cards
            </button>
            <button
              type="button"
              className={`button small ${viewMode === 'table' ? 'primary' : ''}`}
              onClick={() => setViewMode('table')}
              title="Show list table"
            >
              <List size={14} /> Table
            </button>
          </div>

          {permissions?.canAddDriver && (
            <button
              type="button"
              className="button primary"
              onClick={() => {
                setLicenseNo(`DXB-HC-${Math.floor(1000 + Math.random() * 9000)}`);
                setShowAddModal(true);
              }}
            >
              <Plus size={15} /> Add Driver
            </button>
          )}
        </div>
      </div>

      {viewMode === 'grid' ? (
        /* Driver Profile Cards with Pictures */
        <div className="drivers-cards-grid">
          {filtered.map((d) => (
            <div key={d.id} className="driver-showcase-card">
              <div className="driver-card-top">
                <div className="driver-avatar-container">
                  <img
                    src={d.avatar || 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?auto=format&fit=crop&w=256&h=256&q=80'}
                    alt={d.name}
                    className="driver-card-avatar"
                  />
                  <span className={`driver-duty-badge ${d.status === 'On duty' ? 'active' : 'offline'}`} />
                </div>

                <div className="driver-card-info">
                  <h3>{d.name}</h3>
                  <span className="driver-license">{d.licenseNo} · {d.emirate}</span>
                  <Badge>{d.status}</Badge>
                </div>
              </div>

              <div className="driver-card-meta">
                <div>
                  <small>Assigned Vehicle</small>
                  <b>{d.vehicle}</b>
                </div>
                <div>
                  <small>Safety Rating</small>
                  <b style={{ color: d.score > 90 ? '#2d8c75' : '#c6ab6d' }}>
                    <ShieldCheck size={13} style={{ display: 'inline', verticalAlign: 'text-bottom' }} /> {d.score} / 100
                  </b>
                </div>
                <div>
                  <small>Experience</small>
                  <b>{d.experience || '6 years'}</b>
                </div>
                <div>
                  <small>Safety Violations</small>
                  <b>{d.events} events</b>
                </div>
              </div>

              <div className="driver-card-footer">
                <a href={`tel:${d.contact}`} className="button small full">
                  <Phone size={13} /> Call {d.contact}
                </a>
              </div>
            </div>
          ))}

          {!filtered.length && (
            <div className="empty panel" style={{ gridColumn: '1 / -1' }}>
              No drivers found matching status.
            </div>
          )}
        </div>
      ) : (
        /* Driver Table View */
        <Panel
          title="UAE Driver Directory"
          sub={`${filtered.length} licensed commercial fleet drivers`}
        >
          <div className="table-scroll">
            <table>
              <thead>
                <tr>
                  <th>Driver</th>
                  <th>Contact</th>
                  <th>Commercial License</th>
                  <th>Assigned Vehicle</th>
                  <th>Safety Score</th>
                  <th>Duty Status</th>
                  <th>Violations</th>
                </tr>
              </thead>
              <tbody>
                {filtered.map((d) => (
                  <tr key={d.id}>
                    <td>
                      <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                        <img
                          src={d.avatar || 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?auto=format&fit=crop&w=120&q=80'}
                          alt={d.name}
                          style={{ width: 34, height: 34, borderRadius: '50%', objectFit: 'cover', border: '1px solid var(--border)' }}
                        />
                        <div>
                          <strong>{d.name}</strong>
                          <small style={{ display: 'block', color: 'var(--muted)' }}>
                            {d.experience || 'Licensed Commercial Operator'}
                          </small>
                        </div>
                      </div>
                    </td>
                    <td>{d.contact}</td>
                    <td><code>{d.licenseNo}</code></td>
                    <td><b>{d.vehicle}</b></td>
                    <td>
                      <span style={{ fontWeight: 600, color: d.score > 90 ? '#2d8c75' : '#c6ab6d' }}>
                        {d.score} / 100
                      </span>
                    </td>
                    <td><Badge>{d.status}</Badge></td>
                    <td>{d.events}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </Panel>
      )}

      {/* Add Driver Modal */}
      <Modal
        open={showAddModal}
        onClose={() => setShowAddModal(false)}
        title="Register New UAE Commercial Driver"
      >
        <form onSubmit={handleCreateDriver}>
          <div className="form-grid">
            <label>
              Full Name
              <input
                required
                placeholder="e.g. Sultan Al Kaabi"
                value={name}
                onChange={(e) => setName(e.target.value)}
              />
            </label>

            <label>
              UAE Mobile Contact
              <input
                required
                placeholder="+971 50 XXX XXXX"
                value={contact}
                onChange={(e) => setContact(e.target.value)}
              />
            </label>

            <label>
              Assigned Fleet Vehicle
              <select
                value={assignedVehicle}
                onChange={(e) => setAssignedVehicle(e.target.value)}
              >
                {vehicles.map((v) => (
                  <option key={v.id} value={v.registration}>
                    {v.registration} — {v.name}
                  </option>
                ))}
              </select>
            </label>

            <label>
              RTA / Commercial Driving License No
              <input
                required
                value={licenseNo}
                onChange={(e) => setLicenseNo(e.target.value)}
              />
            </label>

            <label>
              Licensing Emirate
              <select value={emirate} onChange={(e) => setEmirate(e.target.value)}>
                <option value="Dubai">Dubai</option>
                <option value="Abu Dhabi">Abu Dhabi</option>
                <option value="Sharjah">Sharjah</option>
                <option value="Ajman">Ajman</option>
                <option value="Ras Al Khaimah">Ras Al Khaimah</option>
                <option value="Fujairah">Fujairah</option>
                <option value="Al Ain">Al Ain</option>
              </select>
            </label>

            <label>
              Years of Heavy Vehicle Experience
              <input
                value={experience}
                onChange={(e) => setExperience(e.target.value)}
                placeholder="e.g. 7 years"
              />
            </label>
          </div>

          <div className="modal-actions">
            <button
              type="button"
              className="button"
              onClick={() => setShowAddModal(false)}
            >
              Cancel
            </button>
            <button type="submit" className="button primary">
              Save Driver
            </button>
          </div>
        </form>
      </Modal>
    </>
  );
}
