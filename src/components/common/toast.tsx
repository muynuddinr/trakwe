'use client';

import React, { useEffect } from 'react';
import { CheckCircle2, AlertCircle, X } from 'lucide-react';

interface ToastProps {
  message: string;
  type?: 'success' | 'error';
  onDismiss: () => void;
  duration?: number;
}

export function Toast({ message, type = 'success', onDismiss, duration = 4000 }: ToastProps) {
  useEffect(() => {
    if (!message) return;
    const timer = setTimeout(() => {
      onDismiss();
    }, duration);
    return () => clearTimeout(timer);
  }, [message, duration, onDismiss]);

  if (!message) return null;

  return (
    <div className="toast" role="status">
      {type === 'success' ? (
        <CheckCircle2 size={18} style={{ color: '#4ade80', flexShrink: 0 }} />
      ) : (
        <AlertCircle size={18} style={{ color: '#f87171', flexShrink: 0 }} />
      )}
      <span style={{ flex: 1 }}>{message}</span>
      <button
        type="button"
        aria-label="Dismiss toast"
        onClick={onDismiss}
        style={{ color: '#fff', background: 'none', border: 'none', cursor: 'pointer', padding: 2 }}
      >
        <X size={15} />
      </button>
    </div>
  );
}
