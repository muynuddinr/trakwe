'use client';

import React, { useState, useMemo } from 'react';
import { ChevronLeft, ChevronRight, ArrowUpDown, Download, Search } from 'lucide-react';
import { Badge } from './badge';

export function exportCSV(rows: any[], filename = 'trackwe-export') {
  if (!rows || !rows.length) return;
  const keys = Object.keys(rows[0]).filter((k) => k !== 'id' && !k.startsWith('_'));
  const escapeCell = (val: any) =>
    '"' + String(val ?? '').replace(/^[=+@-]/, "'$&").replaceAll('"', '""') + '"';

  const csvContent = [
    keys.join(','),
    ...rows.map((row) => keys.map((k) => escapeCell(row[k])).join(','))
  ].join('\n');

  const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.setAttribute('href', url);
  link.setAttribute('download', `${filename}-${new Date().toISOString().slice(0, 10)}.csv`);
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(url);
}

interface DataTableProps {
  rows: any[];
  columns?: [string, string][];
  action?: (row: any) => React.ReactNode;
  searchable?: boolean;
  exportable?: boolean;
  exportName?: string;
  limit?: number;
  emptyMessage?: string;
}

export function DataTable({
  rows,
  columns,
  action,
  searchable = true,
  exportable = false,
  exportName = 'trackwe-report',
  limit = 7,
  emptyMessage = 'No matching records found'
}: DataTableProps) {
  const [query, setQuery] = useState('');
  const [sortKey, setSortKey] = useState<string>('');
  const [sortAsc, setSortAsc] = useState<boolean>(true);
  const [page, setPage] = useState<number>(0);

  const cols: [string, string][] = useMemo(() => {
    if (columns && columns.length > 0) return columns;
    if (!rows.length) return [];
    return Object.keys(rows[0])
      .filter((k) => k !== 'id' && !k.startsWith('_'))
      .map((k) => [k, k.charAt(0).toUpperCase() + k.slice(1)] as [string, string]);
  }, [columns, rows]);

  const filteredRows = useMemo(() => {
    return rows
      .filter((r) => {
        if (!query.trim()) return true;
        const fullText = Object.values(r).join(' ').toLowerCase();
        return fullText.includes(query.toLowerCase());
      })
      .sort((a, b) => {
        if (!sortKey) return 0;
        const valA = a[sortKey];
        const valB = b[sortKey];
        if (typeof valA === 'number' && typeof valB === 'number') {
          return (valA - valB) * (sortAsc ? 1 : -1);
        }
        return String(valA ?? '').localeCompare(String(valB ?? '')) * (sortAsc ? 1 : -1);
      });
  }, [rows, query, sortKey, sortAsc]);

  const totalPages = Math.max(1, Math.ceil(filteredRows.length / limit));
  const currentPage = Math.min(page, totalPages - 1);
  const paginatedRows = filteredRows.slice(currentPage * limit, (currentPage + 1) * limit);

  const handleSort = (key: string) => {
    if (sortKey === key) {
      setSortAsc(!sortAsc);
    } else {
      setSortKey(key);
      setSortAsc(true);
    }
  };

  const renderCellValue = (key: string, val: any) => {
    if (val === null || val === undefined) return '—';

    // Badge styling for common status columns
    if (['status', 'severity', 'priority', 'connection'].includes(key)) {
      return <Badge>{val}</Badge>;
    }

    // Currency formatting in AED
    if (key === 'amount' && typeof val === 'number') {
      return (
        <span style={{ fontWeight: 600 }}>
          AED {val.toLocaleString('en-AE')}
        </span>
      );
    }

    if (key === 'temperature' && typeof val === 'number') {
      return `${val} °C`;
    }

    if (key === 'speed' && typeof val === 'number') {
      return `${val} km/h`;
    }

    return String(val);
  };

  return (
    <>
      {(searchable || exportable) && (
        <div className="table-toolbar">
          {searchable && (
            <label className="search">
              <Search size={15} />
              <input
                aria-label="Search table"
                placeholder="Search records…"
                value={query}
                onChange={(e) => {
                  setQuery(e.target.value);
                  setPage(0);
                }}
              />
            </label>
          )}
          {exportable && (
            <button
              type="button"
              className="button"
              onClick={() => exportCSV(filteredRows, exportName)}
              title="Download CSV"
            >
              <Download size={14} />
              Export CSV
            </button>
          )}
        </div>
      )}

      <div className="table-scroll">
        <table>
          <thead>
            <tr>
              {cols.map(([key, label]) => (
                <th key={key}>
                  <button
                    type="button"
                    onClick={() => handleSort(key)}
                    style={{ background: 'none', border: 'none', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 6 }}
                  >
                    {label}
                    <ArrowUpDown size={11} style={{ opacity: sortKey === key ? 1 : 0.4 }} />
                  </button>
                </th>
              ))}
              {action && <th>Actions</th>}
            </tr>
          </thead>
          <tbody>
            {paginatedRows.map((r, idx) => (
              <tr key={r.id || idx}>
                {cols.map(([key]) => (
                  <td key={key}>{renderCellValue(key, r[key])}</td>
                ))}
                {action && <td>{action(r)}</td>}
              </tr>
            ))}
          </tbody>
        </table>

        {!filteredRows.length && (
          <div className="empty">{emptyMessage}</div>
        )}
      </div>

      {filteredRows.length > limit && (
        <div className="pagination">
          <span>
            {currentPage * limit + 1}–{Math.min((currentPage + 1) * limit, filteredRows.length)} of {filteredRows.length}
          </span>
          <button
            type="button"
            disabled={currentPage === 0}
            onClick={() => setPage((p) => Math.max(0, p - 1))}
            aria-label="Previous page"
          >
            <ChevronLeft size={16} />
          </button>
          <span>
            {currentPage + 1} / {totalPages}
          </span>
          <button
            type="button"
            disabled={currentPage >= totalPages - 1}
            onClick={() => setPage((p) => Math.min(totalPages - 1, p + 1))}
            aria-label="Next page"
          >
            <ChevronRight size={16} />
          </button>
        </div>
      )}
    </>
  );
}
