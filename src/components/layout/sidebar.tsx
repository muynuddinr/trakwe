'use client';

import React from 'react';
import { useAuth } from '@/context/auth-context';
import { useFleet } from '@/context/fleet-context';
import { NavItemKey } from '@/data/mock-credentials';
import {
  LayoutDashboard,
  MapPinned,
  Truck,
  Users,
  Route,
  MapPin,
  Fuel,
  Thermometer,
  Activity,
  ShieldCheck,
  Camera,
  Power,
  ListTodo,
  Wallet,
  Bell,
  ChartNoAxesCombined,
  UserCog,
  Plug,
  Settings,
  Navigation,
  ChevronsLeft,
  Building2
} from 'lucide-react';
import type { LucideIcon } from 'lucide-react';

interface SidebarProps {
  currentPage: NavItemKey;
  onNavigate: (page: NavItemKey) => void;
  collapsed: boolean;
  onToggleCollapse: () => void;
  mobileOpen: boolean;
  onCloseMobile: () => void;
}

type NavItemDef = [NavItemKey, string, LucideIcon];

const ALL_NAV_GROUPS: [string, NavItemDef[]][] = [
  [
    'OVERVIEW',
    [
      ['dashboard', 'Dashboard', LayoutDashboard],
      ['tracking', 'Live Tracking', MapPinned]
    ]
  ],
  [
    'FLEET',
    [
      ['vehicles', 'Vehicles', Truck],
      ['drivers', 'Drivers', Users],
      ['trips', 'Trips & Route History', Route],
      ['geofences', 'Geofences', MapPin]
    ]
  ],
  [
    'INTELLIGENCE',
    [
      ['fuel', 'Fuel Monitoring', Fuel],
      ['temperature', 'Temperature', Thermometer],
      ['diagnostics', 'CAN Bus & Diagnostics', Activity],
      ['behavior', 'Driver Behavior', ShieldCheck],
      ['cameras', 'Dash Cameras', Camera],
      ['immobilizer', 'Immobilizer', Power]
    ]
  ],
  [
    'OPERATIONS',
    [
      ['tasks', 'Tasks', ListTodo],
      ['expenses', 'Expenses', Wallet],
      ['alerts', 'Alerts & Notifications', Bell],
      ['reports', 'Reports & Analytics', ChartNoAxesCombined]
    ]
  ],
  [
    'ADMINISTRATION',
    [
      ['users', 'Users & Roles', UserCog],
      ['integrations', 'Device Integrations', Plug],
      ['settings', 'Settings', Settings]
    ]
  ]
];

export function Sidebar({
  currentPage,
  onNavigate,
  collapsed,
  onToggleCollapse,
  mobileOpen,
  onCloseMobile
}: SidebarProps) {
  const { hasPermission, role } = useAuth();
  const { alerts } = useFleet();

  const unacknowledgedAlerts = alerts.filter((a) => a.status === 'Unacknowledged').length;

  // Filter groups and items based on role permissions
  const visibleGroups = ALL_NAV_GROUPS.map(([groupName, items]) => {
    const allowedItems = items.filter(([key]) => hasPermission(key));
    return [groupName, allowedItems] as [string, NavItemDef[]];
  }).filter(([_, items]) => items.length > 0);

  const handleItemClick = (key: NavItemKey) => {
    onNavigate(key);
    onCloseMobile();
  };

  return (
    <>
      <aside className={`sidebar ${mobileOpen ? 'mobile-open' : ''}`}>
        {/* Brand */}
        <button
          type="button"
          className="brand"
          onClick={() => handleItemClick('dashboard')}
          aria-label="Trackwe home"
        >
          <span className="brand-mark">
            <Navigation size={24} fill="currentColor" />
          </span>
          <span>
            trackwe<span className="brand-dot">.</span>
          </span>
        </button>

        {/* Workspace Label */}
        <div className="workspace-label">
          <Building2 size={14} />
          <span>Trackwe Logistics UAE</span>
        </div>

        {/* Navigation list */}
        <nav>
          {visibleGroups.map(([groupLabel, items]) => (
            <div className="nav-group" key={groupLabel}>
              <p>{groupLabel}</p>
              {items.map(([key, label, Icon]) => {
                const isActive = currentPage === key;
                return (
                  <button
                    key={key}
                    type="button"
                    title={label}
                    className={`nav-item ${isActive ? 'active' : ''}`}
                    onClick={() => handleItemClick(key)}
                  >
                    <Icon size={18} />
                    <span>{label}</span>
                    {key === 'alerts' && unacknowledgedAlerts > 0 && (
                      <b>{unacknowledgedAlerts}</b>
                    )}
                    {key === 'tracking' && <i className="nav-live" title="Live GPS Feed" />}
                  </button>
                );
              })}
            </div>
          ))}
        </nav>

        {/* Sidebar Footer */}
        <div className="sidebar-bottom">
          <div className="demo-mode">
            <i />
            <span>UAE Demo · {role}</span>
          </div>
          <button
            type="button"
            onClick={onToggleCollapse}
            aria-label={collapsed ? 'Expand sidebar' : 'Collapse sidebar'}
          >
            <ChevronsLeft size={17} />
            <span>Collapse sidebar</span>
          </button>
        </div>
      </aside>

      {mobileOpen && (
        <button
          type="button"
          className="drawer-backdrop"
          onClick={onCloseMobile}
          aria-label="Close navigation"
        />
      )}
    </>
  );
}
