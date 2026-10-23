import React from 'react';

export function Badge({ children, className = '' }: { children: React.ReactNode; className?: string }) {
  const norm = String(children).toLowerCase().replace(/\s+/g, '-');
  return <span className={`badge ${norm} ${className}`}>{children}</span>;
}
