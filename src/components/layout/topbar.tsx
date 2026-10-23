'use client';

import React, { useState } from 'react';
import { useAuth } from '@/context/auth-context';
import { useFleet } from '@/context/fleet-context';
import { useTheme } from '@/context/theme-context';
import { NavItemKey } from '@/data/mock-credentials';
import { NotificationPopover } from './notification-popover';
import { UserPopover } from './user-popover';
import { LiveHardwareBadge } from '@/components/hardware/live-hardware-badge';
import {
  Menu,
  Search,
  Bell,
  ChevronDown,
  Truck,
  ListTodo,
  Sun,
  Moon
} from 'lucide-react';

interface TopbarProps {
  title: string;
  onNavigate: (page: NavItemKey) => void;
  onToggleMobile: () => void;
  onSelectVehicle: (id: string) => void;
}

export function Topbar({
  title,
  onNavigate,
  onToggleMobile,
  onSelectVehicle
}: TopbarProps) {
  const { user, role } = useAuth();
  const { alerts, vehicles, tasks } = useFleet();
  const { theme, toggleTheme } = useTheme();

  const [globalSearch, setGlobalSearch] = useState('');
  const [showNotifications, setShowNotifications] = useState(false);
  const [showProfile, setShowProfile] = useState(false);

  const unreadAlerts = alerts.filter((a) => a.status === 'Unacknowledged').length;

  const filteredVehicles = globalSearch.trim()
    ? vehicles.filter((v) =>
        `${v.registration} ${v.name} ${v.driver} ${v.emirate}`
          .toLowerCase()
          .includes(globalSearch.toLowerCase())
      ).slice(0, 4)
    : [];

  const filteredTasks = globalSearch.trim()
    ? tasks.filter((t) =>
        `${t.title} ${t.vehicle} ${t.employee}`
          .toLowerCase()
          .includes(globalSearch.toLowerCase())
      ).slice(0, 3)
    : [];

  return (
    <header className="topbar">
      {/* Left: Mobile Toggle & Breadcrumbs */}
      <div className="breadcrumb">
        <button
          type="button"
          className="icon-button mobile-menu"
          onClick={onToggleMobile}
          aria-label="Toggle navigation menu"
        >
          <Menu size={20} />
        </button>
        <span>Trackwe UAE</span>
        <span>/</span>
        <b>{title}</b>
      </div>

      {/* Right: Search, Theme Toggle, Notifications, Profile */}
      <div className="topbar-right">
        {/* Global Search */}
        <div className="global-search">
          <Search size={15} />
          <input
            placeholder="Search fleet, tasks, UAE plates…"
            value={globalSearch}
            onChange={(e) => setGlobalSearch(e.target.value)}
            aria-label="Global fleet search"
          />
          {globalSearch.trim() && (
            <div className="search-results">
              <div style={{ padding: '6px 8px 4px', fontSize: 9, color: '#8898aa', fontWeight: 700 }}>
                MATCHING VEHICLES
              </div>
              {filteredVehicles.map((v) => (
                <button
                  key={v.id}
                  type="button"
                  onClick={() => {
                    onSelectVehicle(v.id);
                    onNavigate('vehicle-detail');
                    setGlobalSearch('');
                  }}
                >
                  <Truck size={15} />
                  <span>
                    {v.registration}
                    <small>{v.name} · {v.emirate}</small>
                  </span>
                </button>
              ))}

              {filteredTasks.length > 0 && (
                <>
                  <div style={{ padding: '8px 8px 4px', fontSize: 9, color: '#8898aa', fontWeight: 700 }}>
                    MATCHING TASKS
                  </div>
                  {filteredTasks.map((t) => (
                    <button
                      key={t.id}
                      type="button"
                      onClick={() => {
                        onNavigate('tasks');
                        setGlobalSearch('');
                      }}
                    >
                      <ListTodo size={15} />
                      <span>
                        {t.title}
                        <small>{t.vehicle} · {t.status}</small>
                      </span>
                    </button>
                  ))}
                </>
              )}

              {!filteredVehicles.length && !filteredTasks.length && (
                <div style={{ padding: 12, fontSize: 11, color: '#8898aa', textAlign: 'center' }}>
                  No fleet records found
                </div>
              )}
            </div>
          )}
        </div>

        {/* Teltonika FMC920 Hardware Status Badge */}
        <LiveHardwareBadge />

        {/* Theme Mode Toggle (Light / Dark) */}
        <button
          type="button"
          className="icon-button theme-toggle-btn"
          onClick={toggleTheme}
          title={theme === 'dark' ? 'Switch to Light Mode' : 'Switch to Dark Mode'}
          aria-label="Toggle theme"
        >
          {theme === 'dark' ? (
            <Sun size={18} style={{ color: '#f59e0b' }} />
          ) : (
            <Moon size={18} style={{ color: '#64748b' }} />
          )}
        </button>

        <span className="top-divider" />

        {/* Notifications Bell */}
        <button
          type="button"
          className="icon-button notification-button"
          aria-label={`Notifications (${unreadAlerts} unread)`}
          onClick={() => {
            setShowNotifications(!showNotifications);
            setShowProfile(false);
          }}
        >
          <Bell size={19} />
          {unreadAlerts > 0 && <i />}
        </button>

        {/* User Profile */}
        <button
          type="button"
          className="profile-button"
          onClick={() => {
            setShowProfile(!showProfile);
            setShowNotifications(false);
          }}
          aria-label="User account menu"
        >
          {user?.avatarUrl ? (
            <img
              src={user.avatarUrl}
              alt={user.name}
              className="topbar-avatar-img"
              style={{ width: 34, height: 34, borderRadius: '50%', objectFit: 'cover', border: '2px solid #c6ab6d', flexShrink: 0, display: 'block' }}
            />
          ) : (
            <span className="avatar">
              {user?.avatar || user?.name?.slice(0, 2).toUpperCase() || 'TW'}
            </span>
          )}
          <span style={{ minWidth: 0, overflow: 'hidden' }}>
            <b style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{user?.name}</b>
            <small>{role}</small>
          </span>
          <ChevronDown size={13} />
        </button>
      </div>

      {/* Popovers */}
      {showNotifications && (
        <NotificationPopover
          onClose={() => setShowNotifications(false)}
          onNavigate={onNavigate}
        />
      )}

      {showProfile && (
        <UserPopover
          onClose={() => setShowProfile(false)}
          onNavigate={onNavigate}
        />
      )}
    </header>
  );
}
