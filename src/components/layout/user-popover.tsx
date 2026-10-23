'use client';

import React from 'react';
import { useAuth } from '@/context/auth-context';
import { useTheme } from '@/context/theme-context';
import { UserRole } from '@/types';
import { NavItemKey } from '@/data/mock-credentials';
import { LogOut, Settings, UserCheck, Shield, Sun, Moon } from 'lucide-react';

interface UserPopoverProps {
  onClose: () => void;
  onNavigate: (page: NavItemKey) => void;
}

export function UserPopover({ onClose, onNavigate }: UserPopoverProps) {
  const { user, role, logout, quickLogin } = useAuth();
  const { theme, toggleTheme, setTheme } = useTheme();

  const handleRoleSwitch = async (newRole: UserRole) => {
    onClose();
    await quickLogin(newRole);
    onNavigate('dashboard');
  };

  const handleLogout = () => {
    onClose();
    logout();
  };

  const roles: UserRole[] = ['Super Admin', 'Admin', 'Manager', 'Employee'];

  return (
    <div className="header-popover profile-popover" style={{ minWidth: 260 }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 12, borderBottom: '1px solid var(--border-color, #edf1f5)', paddingBottom: 12, marginBottom: 10 }}>
        {user?.avatarUrl ? (
          <img
            src={user.avatarUrl}
            alt={user.name}
            style={{ width: 44, height: 44, borderRadius: '50%', objectFit: 'cover', border: '2px solid #c6ab6d', flexShrink: 0 }}
          />
        ) : (
          <div className="avatar" style={{ width: 44, height: 44, fontSize: 16 }}>
            {user?.name?.slice(0, 2).toUpperCase() || 'TW'}
          </div>
        )}
        <div style={{ flex: 1, minWidth: 0 }}>
          <b style={{ fontSize: 13, display: 'block', color: 'var(--text-primary, #172b3a)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
            {user?.name}
          </b>
          <span style={{ fontSize: 11, color: 'var(--text-muted, #688296)', display: 'flex', alignItems: 'center', gap: 5, marginTop: 2 }}>
            <Shield size={12} style={{ color: '#c6ab6d' }} />
            {role} · {user?.team}
          </span>
          <code style={{ fontSize: 10, color: 'var(--text-muted, #8898aa)', display: 'block', marginTop: 2, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
            {user?.email}
          </code>
        </div>
      </div>

      {/* Theme Switcher */}
      <div style={{ marginBottom: 12, padding: '6px 8px', background: 'var(--surface-sunken, #f8fafc)', borderRadius: 8, border: '1px solid var(--border-color, #e2e8f0)' }}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 6 }}>
          <small style={{ fontSize: 9, color: 'var(--text-muted, #8b98a5)', textTransform: 'uppercase', letterSpacing: '0.8px', fontWeight: 700 }}>
            Appearance / Theme
          </small>
          <span style={{ fontSize: 10, color: theme === 'dark' ? '#c6ab6d' : '#4a6572', fontWeight: 600 }}>
            {theme === 'dark' ? 'Dark Mode' : 'Light Mode'}
          </span>
        </div>
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 4 }}>
          <button
            type="button"
            className={`button small ${theme === 'light' ? 'primary' : ''}`}
            style={{ fontSize: 10, padding: '5px 8px', justifyContent: 'center', gap: 6 }}
            onClick={() => setTheme('light')}
          >
            <Sun size={12} /> Light
          </button>
          <button
            type="button"
            className={`button small ${theme === 'dark' ? 'primary' : ''}`}
            style={{ fontSize: 10, padding: '5px 8px', justifyContent: 'center', gap: 6 }}
            onClick={() => setTheme('dark')}
          >
            <Moon size={12} /> Dark
          </button>
        </div>
      </div>

      <div style={{ marginBottom: 12 }}>
        <small style={{ fontSize: 9, color: 'var(--text-muted, #8b98a5)', textTransform: 'uppercase', letterSpacing: '0.8px', fontWeight: 700, display: 'block', marginBottom: 6 }}>
          Quick Role Switch (Demo)
        </small>
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 4 }}>
          {roles.map((r) => {
            const isCurrent = role === r;
            return (
              <button
                key={r}
                type="button"
                className={`button small ${isCurrent ? 'primary' : ''}`}
                style={{ fontSize: 9, padding: '4px 6px', justifyContent: 'center' }}
                onClick={() => handleRoleSwitch(r)}
                disabled={isCurrent}
              >
                {isCurrent && <UserCheck size={10} />} {r}
              </button>
            );
          })}
        </div>
      </div>

      <div style={{ borderTop: '1px solid var(--border-color, #edf1f5)', paddingTop: 8, display: 'flex', flexDirection: 'column', gap: 4 }}>
        {role !== 'Employee' && (
          <button
            type="button"
            onClick={() => {
              onNavigate('settings');
              onClose();
            }}
            style={{ padding: '8px 10px', fontSize: 11, display: 'flex', alignItems: 'center', gap: 8, borderRadius: 5, color: 'var(--text-primary, #172b3a)' }}
          >
            <Settings size={14} /> Workspace Settings
          </button>
        )}
        <button
          type="button"
          onClick={handleLogout}
          style={{ padding: '8px 10px', fontSize: 11, display: 'flex', alignItems: 'center', gap: 8, borderRadius: 5, color: '#e06a55' }}
        >
          <LogOut size={14} /> Sign out of Demo
        </button>
      </div>
    </div>
  );
}
