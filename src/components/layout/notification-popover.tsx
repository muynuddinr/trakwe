'use client';

import React from 'react';
import { useFleet } from '@/context/fleet-context';
import { NavItemKey } from '@/data/mock-credentials';
import { Bell, Check, ArrowRight } from 'lucide-react';
import { Badge } from '@/components/common/badge';

interface NotificationPopoverProps {
  onClose: () => void;
  onNavigate: (page: NavItemKey) => void;
}

export function NotificationPopover({ onClose, onNavigate }: NotificationPopoverProps) {
  const { alerts, acknowledgeAlert } = useFleet();
  const unreadAlerts = alerts.filter((a) => a.status === 'Unacknowledged');

  return (
    <div className="header-popover">
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '6px 10px 10px' }}>
        <h3 style={{ margin: 0, fontSize: 13, display: 'flex', alignItems: 'center', gap: 6 }}>
          <Bell size={15} /> Notifications
          <Badge>{unreadAlerts.length} Unread</Badge>
        </h3>
        <button
          type="button"
          className="text-button"
          onClick={() => {
            onNavigate('alerts');
            onClose();
          }}
          style={{ fontSize: 10 }}
        >
          View all <ArrowRight size={11} />
        </button>
      </div>

      <div style={{ maxHeight: 280, overflowY: 'auto' }}>
        {unreadAlerts.slice(0, 5).map((a) => (
          <div
            key={a.id}
            style={{
              padding: '9px 10px',
              borderBottom: '1px solid #f0f3f6',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              gap: 8
            }}
          >
            <div>
              <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                <i className={`dot ${a.severity === 'Critical' ? 'red-bg' : 'gold-bg'}`} />
                <b style={{ fontSize: 11 }}>{a.type}</b>
                <span style={{ fontSize: 10, color: '#688296' }}>{a.vehicle}</span>
              </div>
              <small style={{ color: '#8b98a5', fontSize: 9, display: 'block', marginTop: 2 }}>
                {a.time}
              </small>
            </div>
            <button
              type="button"
              className="button small"
              onClick={() => acknowledgeAlert(a.id)}
              style={{ padding: '3px 7px', fontSize: 9 }}
              title="Acknowledge alert"
            >
              <Check size={11} /> Ack
            </button>
          </div>
        ))}

        {!unreadAlerts.length && (
          <div style={{ padding: '20px 10px', textAlign: 'center', color: '#8898aa', fontSize: 11 }}>
            All alerts acknowledged. Fleet running smoothly.
          </div>
        )}
      </div>
    </div>
  );
}
