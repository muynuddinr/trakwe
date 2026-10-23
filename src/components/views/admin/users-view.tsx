'use client';

import React, { useState } from 'react';
import { Panel } from '@/components/common/panel';
import { Modal } from '@/components/common/modal';
import { Badge } from '@/components/common/badge';
import { Plus, ShieldCheck, Check, X, Mail, Building2 } from 'lucide-react';
import { UserRole } from '@/types';

interface UsersViewProps {
  showToast: (msg: string) => void;
}

interface DemoUserRecord {
  id: string;
  name: string;
  email: string;
  role: UserRole;
  team: string;
  emirate: string;
  status: string;
  avatar: string;
}

export function UsersView({ showToast }: UsersViewProps) {
  const [users, setUsers] = useState<DemoUserRecord[]>([
    {
      id: 'usr-1',
      name: 'Tariq Al Hashimi',
      email: 'superadmin@trackwe.demo',
      role: 'Super Admin',
      team: 'Executive Fleet Operations',
      emirate: 'Dubai',
      status: 'Active',
      avatar: 'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?auto=format&fit=crop&w=256&h=256&q=80'
    },
    {
      id: 'usr-2',
      name: 'Mariam Al Falasi',
      email: 'admin@trackwe.demo',
      role: 'Admin',
      team: 'Logistics Operations UAE',
      emirate: 'Dubai',
      status: 'Active',
      avatar: 'https://images.unsplash.com/photo-1573496359142-b8d87734a5a2?auto=format&fit=crop&w=256&h=256&q=80'
    },
    {
      id: 'usr-3',
      name: 'Rashid Al Nuaimi',
      email: 'manager@trackwe.demo',
      role: 'Manager',
      team: 'Dispatch & Fleet Monitoring',
      emirate: 'Abu Dhabi',
      status: 'Active',
      avatar: 'https://images.unsplash.com/photo-1500648767791-00dcc994a43e?auto=format&fit=crop&w=256&h=256&q=80'
    },
    {
      id: 'usr-4',
      name: 'Zayed Al Mansoori',
      email: 'employee@trackwe.demo',
      role: 'Employee',
      team: 'Delivery Operations Dubai',
      emirate: 'Dubai',
      status: 'Active',
      avatar: 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?auto=format&fit=crop&w=256&h=256&q=80'
    }
  ]);

  const [showAddModal, setShowAddModal] = useState(false);
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [role, setRole] = useState<UserRole>('Manager');
  const [team, setTeam] = useState('Logistics Operations');
  const [emirate, setEmirate] = useState('Dubai');

  const handleCreateUser = (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim() || !email.trim()) return;

    const newUser: DemoUserRecord = {
      id: `usr-${Date.now()}`,
      name: name.trim(),
      email: email.trim(),
      role,
      team: team.trim(),
      emirate,
      status: 'Active',
      avatar: 'https://images.unsplash.com/photo-1535713875002-d1d0cf377fde?auto=format&fit=crop&w=256&h=256&q=80'
    };

    setUsers((prev) => [...prev, newUser]);
    setShowAddModal(false);
    setName('');
    setEmail('');
    showToast(`User ${name.trim()} added with role ${role}`);
  };

  const matrix = [
    { permission: 'Platform & All UAE Organizations', superAdmin: true, admin: false, manager: false, employee: false },
    { permission: 'Full UAE Fleet Tracking & Corridors', superAdmin: true, admin: true, manager: true, employee: false },
    { permission: 'Detailed Vehicle Showcase & Specifications', superAdmin: true, admin: true, manager: true, employee: true },
    { permission: 'Assign Tasks & Dispatch Orders', superAdmin: true, admin: true, manager: true, employee: false },
    { permission: 'Approve & Review Expense Claims', superAdmin: true, admin: true, manager: true, employee: false },
    { permission: 'Simulate Immobilizer Relay Commands', superAdmin: true, admin: true, manager: false, employee: false },
    { permission: 'Create & Edit Vehicles / Drivers', superAdmin: true, admin: true, manager: false, employee: false },
    { permission: 'Manage Users & Role Assignments', superAdmin: true, admin: true, manager: false, employee: false },
    { permission: 'Export Analytical CSV Reports', superAdmin: true, admin: true, manager: true, employee: false },
    { permission: 'Submit Field Expenses & Complete Tasks', superAdmin: true, admin: true, manager: true, employee: true }
  ];

  return (
    <>
      <div className="module-toolbar">
        <p>Manage organizational hierarchy and review the Role-Based Access Control (RBAC) matrix.</p>
        <button
          type="button"
          className="button primary"
          onClick={() => setShowAddModal(true)}
        >
          <Plus size={15} /> Add User
        </button>
      </div>

      <div className="info-banner">
        <ShieldCheck size={16} />
        Role-based permissions enforce strict route guarding and view restrictions across Super Admin, Admin, Manager, and Employee roles.
      </div>

      {/* User Showcase Cards */}
      <div className="users-cards-grid" style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(260px, 1fr))', gap: 16, marginBottom: 20 }}>
        {users.map((u) => (
          <div key={u.id} className="panel" style={{ padding: 18, margin: 0 }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 14 }}>
              <img
                src={u.avatar}
                alt={u.name}
                style={{ width: 48, height: 48, borderRadius: '50%', objectFit: 'cover', border: '2px solid var(--border)' }}
              />
              <div>
                <h3 style={{ fontSize: 13, margin: '0 0 4px' }}>{u.name}</h3>
                <span className={`badge role-${u.role.toLowerCase().replace(/\s+/g, '-')}`}>
                  {u.role}
                </span>
              </div>
            </div>

            <div style={{ fontSize: 11, color: 'var(--muted)', display: 'flex', flexDirection: 'column', gap: 6 }}>
              <span style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                <Mail size={13} /> {u.email}
              </span>
              <span style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                <Building2 size={13} /> {u.team} · {u.emirate}
              </span>
            </div>
          </div>
        ))}
      </div>

      {/* Table View */}
      <Panel title="Platform User Directory" sub={`${users.length} active demo accounts`}>
        <div className="table-scroll">
          <table>
            <thead>
              <tr>
                <th>User</th>
                <th>Demo Email</th>
                <th>Assigned Role</th>
                <th>Department / Team</th>
                <th>Emirate Base</th>
                <th>Status</th>
              </tr>
            </thead>
            <tbody>
              {users.map((u) => (
                <tr key={u.id}>
                  <td>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                      <img
                        src={u.avatar}
                        alt={u.name}
                        style={{ width: 32, height: 32, borderRadius: '50%', objectFit: 'cover', border: '1px solid var(--border)' }}
                      />
                      <strong>{u.name}</strong>
                    </div>
                  </td>
                  <td><code>{u.email}</code></td>
                  <td><span className={`badge role-${u.role.toLowerCase().replace(/\s+/g, '-')}`}>{u.role}</span></td>
                  <td>{u.team}</td>
                  <td>{u.emirate}</td>
                  <td><Badge>{u.status}</Badge></td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </Panel>

      {/* Permissions Matrix */}
      <Panel title="Role-Based Access Control (RBAC) Permissions Matrix">
        <div className="table-scroll">
          <table>
            <thead>
              <tr>
                <th style={{ width: '40%' }}>Operational Capability / Permission</th>
                <th style={{ textAlign: 'center' }}>Super Admin</th>
                <th style={{ textAlign: 'center' }}>Admin</th>
                <th style={{ textAlign: 'center' }}>Manager</th>
                <th style={{ textAlign: 'center' }}>Employee</th>
              </tr>
            </thead>
            <tbody>
              {matrix.map((row, idx) => (
                <tr key={idx}>
                  <td><strong>{row.permission}</strong></td>
                  <td style={{ textAlign: 'center' }}>
                    {row.superAdmin ? <Check size={16} style={{ color: '#2d8c75' }} /> : <X size={16} style={{ color: '#cad2db' }} />}
                  </td>
                  <td style={{ textAlign: 'center' }}>
                    {row.admin ? <Check size={16} style={{ color: '#2d8c75' }} /> : <X size={16} style={{ color: '#cad2db' }} />}
                  </td>
                  <td style={{ textAlign: 'center' }}>
                    {row.manager ? <Check size={16} style={{ color: '#2d8c75' }} /> : <X size={16} style={{ color: '#cad2db' }} />}
                  </td>
                  <td style={{ textAlign: 'center' }}>
                    {row.employee ? <Check size={16} style={{ color: '#2d8c75' }} /> : <X size={16} style={{ color: '#cad2db' }} />}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </Panel>

      {/* Add User Modal */}
      <Modal
        open={showAddModal}
        onClose={() => setShowAddModal(false)}
        title="Register New User Account"
      >
        <form onSubmit={handleCreateUser}>
          <div className="form-grid">
            <label>
              Full Name
              <input
                required
                placeholder="e.g. Fatima Al Marzouqi"
                value={name}
                onChange={(e) => setName(e.target.value)}
              />
            </label>

            <label>
              Email Address
              <input
                type="email"
                required
                placeholder="name@trackwe.ae"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
              />
            </label>

            <label>
              Assigned Role
              <select
                value={role}
                onChange={(e) => setRole(e.target.value as UserRole)}
              >
                <option value="Employee">Employee</option>
                <option value="Manager">Manager</option>
                <option value="Admin">Admin</option>
                <option value="Super Admin">Super Admin</option>
              </select>
            </label>

            <label>
              Department / Team
              <input
                required
                value={team}
                onChange={(e) => setTeam(e.target.value)}
              />
            </label>

            <label>
              Emirate Base
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
              Create User Account
            </button>
          </div>
        </form>
      </Modal>
    </>
  );
}
