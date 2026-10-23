'use client';

import React, { useState } from 'react';
import { useAuth } from '@/context/auth-context';
import { useFleet } from '@/context/fleet-context';
import { Panel } from '@/components/common/panel';
import { Modal } from '@/components/common/modal';
import { Badge } from '@/components/common/badge';
import { NavItemKey } from '@/data/mock-credentials';
import { Plus, ArrowUpRight, Eye, LayoutGrid, List, Search, MapPin, Fuel, Gauge, Navigation } from 'lucide-react';
import { Vehicle } from '@/types';

interface VehiclesViewProps {
  onNavigate: (page: NavItemKey) => void;
  onSelectVehicle: (id: string) => void;
  onOpenDetail: (id: string) => void;
  showToast: (msg: string) => void;
}

export function VehiclesView({
  onNavigate,
  onSelectVehicle,
  onOpenDetail,
  showToast
}: VehiclesViewProps) {
  const { permissions } = useAuth();
  const { vehicles, addVehicle, drivers } = useFleet();

  const [statusFilter, setStatusFilter] = useState('All');
  const [emirateFilter, setEmirateFilter] = useState('All');
  const [searchQuery, setSearchQuery] = useState('');
  const [viewMode, setViewMode] = useState<'grid' | 'table'>('grid');
  const [showAddModal, setShowAddModal] = useState(false);

  // Form state
  const [newReg, setNewReg] = useState('');
  const [newName, setNewName] = useState('');
  const [newType, setNewType] = useState('Light truck');
  const [newDriver, setNewDriver] = useState(drivers[0]?.name || 'Zayed Al Mansoori');
  const [newEmirate, setNewEmirate] = useState('Dubai');
  const [newLocation, setNewLocation] = useState('Al Quoz Industrial Depot');

  const filtered = vehicles.filter((v) => {
    const matchStatus = statusFilter === 'All' || v.status === statusFilter;
    const matchEmirate = emirateFilter === 'All' || v.emirate === emirateFilter;
    const matchSearch = `${v.registration} ${v.name} ${v.driver} ${v.emirate} ${v.locationName}`
      .toLowerCase()
      .includes(searchQuery.toLowerCase());
    return matchStatus && matchEmirate && matchSearch;
  });

  const handleCreateVehicle = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newReg.trim() || !newName.trim()) return;

    addVehicle({
      registration: newReg.trim(),
      name: newName.trim(),
      type: newType,
      driver: newDriver,
      emirate: newEmirate,
      locationName: newLocation,
      status: 'Idle',
      fuel: 90,
      image: 'https://images.unsplash.com/photo-1601584115197-04ecc0da31d7?auto=format&fit=crop&w=1200&q=80'
    });

    setShowAddModal(false);
    setNewReg('');
    setNewName('');
    showToast(`Vehicle ${newReg.trim()} added to UAE fleet`);
  };

  const emirates = ['All', 'Dubai', 'Abu Dhabi', 'Sharjah', 'Ajman', 'Ras Al Khaimah', 'Fujairah', 'Al Ain'];

  return (
    <>
      <div className="module-toolbar">
        <div className="filters">
          <label className="search" style={{ maxWidth: 220 }}>
            <Search size={15} />
            <input
              placeholder="Search plate, model, driver…"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
            />
          </label>

          <select
            aria-label="Filter status"
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
          >
            <option value="All">All Statuses</option>
            <option value="Moving">Moving</option>
            <option value="Idle">Idle</option>
            <option value="Offline">Offline</option>
          </select>

          <select
            aria-label="Filter Emirate"
            value={emirateFilter}
            onChange={(e) => setEmirateFilter(e.target.value)}
          >
            {emirates.map((em) => (
              <option key={em} value={em}>
                {em === 'All' ? 'All Emirates' : em}
              </option>
            ))}
          </select>
        </div>

        <div className="filters">
          <div className="view-toggle-wrap">
            <button
              type="button"
              className={`button small ${viewMode === 'grid' ? 'primary' : ''}`}
              onClick={() => setViewMode('grid')}
              title="Show vehicle photo cards"
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

          {permissions?.canAddVehicle && (
            <button
              type="button"
              className="button primary"
              onClick={() => {
                setNewReg(`Dubai ${String.fromCharCode(65 + Math.floor(Math.random() * 26))}-${Math.floor(10000 + Math.random() * 90000)}`);
                setShowAddModal(true);
              }}
            >
              <Plus size={15} /> Add Vehicle
            </button>
          )}
        </div>
      </div>

      {viewMode === 'grid' ? (
        /* Grid Showcase with Vehicle Photos */
        <div className="vehicle-cards-grid">
          {filtered.map((v) => (
            <div key={v.id} className="fleet-card">
              <div
                className="fleet-card-img-wrap"
                onClick={() => onOpenDetail(v.id)}
                style={{ cursor: 'pointer' }}
              >
                <img
                  src={v.image || 'https://images.unsplash.com/photo-1601584115197-04ecc0da31d7?auto=format&fit=crop&w=800&q=80'}
                  alt={v.name}
                  className="fleet-card-img"
                />
                <div className="fleet-card-tags">
                  <span className={`status-pill ${v.status.toLowerCase()}`}>
                    <i className="pulse-dot" />
                    {v.status}
                  </span>
                  <span className="emirate-tag">{v.emirate}</span>
                </div>
              </div>

              <div className="fleet-card-body">
                <div className="fleet-card-header">
                  <div>
                    <h3
                      className="fleet-card-title"
                      onClick={() => onOpenDetail(v.id)}
                      style={{ cursor: 'pointer' }}
                    >
                      {v.name}
                    </h3>
                    <div className="fleet-card-reg">{v.registration}</div>
                  </div>
                  <Badge>{v.type}</Badge>
                </div>

                <div className="fleet-card-driver">
                  <small>Assigned Driver</small>
                  <b>{v.driver}</b>
                </div>

                <div className="fleet-card-stats">
                  <div>
                    <small><Gauge size={12} /> Speed</small>
                    <b>{v.speed} km/h</b>
                  </div>
                  <div>
                    <small><Fuel size={12} /> Fuel</small>
                    <b>{v.fuel}%</b>
                  </div>
                  <div>
                    <small><MapPin size={12} /> Location</small>
                    <b className="truncate">{v.locationName.split('/')[0]}</b>
                  </div>
                </div>

                <div className="fleet-card-actions">
                  <button
                    type="button"
                    className="button small"
                    onClick={() => onOpenDetail(v.id)}
                  >
                    <Eye size={13} /> View Details
                  </button>
                  <button
                    type="button"
                    className="button primary small"
                    onClick={() => {
                      onSelectVehicle(v.id);
                      onNavigate('tracking');
                    }}
                  >
                    <Navigation size={13} fill="currentColor" /> Track Live
                  </button>
                </div>
              </div>
            </div>
          ))}

          {!filtered.length && (
            <div className="empty panel" style={{ gridColumn: '1 / -1' }}>
              No vehicles found matching the filter criteria.
            </div>
          )}
        </div>
      ) : (
        /* Table View */
        <Panel
          title="UAE Fleet Directory"
          sub={`${filtered.length} commercial vehicles registered in UAE`}
        >
          <div className="table-scroll">
            <table>
              <thead>
                <tr>
                  <th>Vehicle</th>
                  <th>Registration</th>
                  <th>Body Type</th>
                  <th>Emirate</th>
                  <th>Assigned Driver</th>
                  <th>Speed</th>
                  <th>Status</th>
                  <th>Actions</th>
                </tr>
              </thead>
              <tbody>
                {filtered.map((v) => (
                  <tr key={v.id}>
                    <td>
                      <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                        <img
                          src={v.image || 'https://images.unsplash.com/photo-1601584115197-04ecc0da31d7?auto=format&fit=crop&w=120&q=80'}
                          alt={v.name}
                          style={{ width: 44, height: 32, objectFit: 'cover', borderRadius: 4, border: '1px solid var(--border)' }}
                        />
                        <div>
                          <strong
                            onClick={() => onOpenDetail(v.id)}
                            style={{ cursor: 'pointer', color: 'var(--navy)' }}
                          >
                            {v.name}
                          </strong>
                          <small style={{ display: 'block', color: 'var(--muted)' }}>
                            {v.device}
                          </small>
                        </div>
                      </div>
                    </td>
                    <td><b>{v.registration}</b></td>
                    <td>{v.type}</td>
                    <td>{v.emirate}</td>
                    <td>{v.driver}</td>
                    <td>{v.speed} km/h</td>
                    <td><Badge>{v.status}</Badge></td>
                    <td>
                      <div style={{ display: 'flex', gap: 6 }}>
                        <button
                          type="button"
                          className="button small"
                          onClick={() => onOpenDetail(v.id)}
                        >
                          <Eye size={12} /> Details
                        </button>
                        <button
                          type="button"
                          className="button primary small"
                          onClick={() => {
                            onSelectVehicle(v.id);
                            onNavigate('tracking');
                          }}
                        >
                          <ArrowUpRight size={12} /> Track
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </Panel>
      )}

      {/* Add Vehicle Modal */}
      <Modal
        open={showAddModal}
        onClose={() => setShowAddModal(false)}
        title="Register New UAE Vehicle"
      >
        <form onSubmit={handleCreateVehicle}>
          <div className="form-grid">
            <label>
              UAE Plate Number
              <input
                required
                placeholder="e.g. Dubai B-48291"
                value={newReg}
                onChange={(e) => setNewReg(e.target.value)}
              />
            </label>

            <label>
              Vehicle Model / Name
              <input
                required
                placeholder="e.g. Scania R500 Long Haul"
                value={newName}
                onChange={(e) => setNewName(e.target.value)}
              />
            </label>

            <label>
              Vehicle Type
              <select value={newType} onChange={(e) => setNewType(e.target.value)}>
                <option value="Light truck">Light truck</option>
                <option value="Heavy truck">Heavy truck</option>
                <option value="Refrigerated">Refrigerated</option>
                <option value="Van">Van</option>
              </select>
            </label>

            <label>
              Assigned UAE Driver
              <select value={newDriver} onChange={(e) => setNewDriver(e.target.value)}>
                {drivers.map((d) => (
                  <option key={d.id} value={d.name}>
                    {d.name}
                  </option>
                ))}
              </select>
            </label>

            <label>
              Home Emirate
              <select value={newEmirate} onChange={(e) => setNewEmirate(e.target.value)}>
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
              Base Hub / Depot Location
              <input
                required
                value={newLocation}
                onChange={(e) => setNewLocation(e.target.value)}
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
              Save Vehicle to UAE Fleet
            </button>
          </div>
        </form>
      </Modal>
    </>
  );
}
