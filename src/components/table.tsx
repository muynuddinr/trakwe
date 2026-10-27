"use client";
import { dateLabel, money } from "@/lib/format";
import { RecordItem } from "@/types";
import {
  ArrowUpDown,
  ChevronLeft,
  ChevronRight,
  Download,
  Search,
} from "lucide-react";
import { useMemo, useState } from "react";
export function exportCSV(rows: RecordItem[], name = "trackwe-report") {
  if (!rows.length) return;
  const keys = Object.keys(rows[0]).filter((k) => k !== "id");
  const cell = (v: unknown) =>
    '"' +
    String(v ?? "")
      .replace(/^[=+@-]/, "'$&")
      .replaceAll('"', '""') +
    '"';
  const blob = new Blob(
    [
      [keys, ...rows.map((r) => keys.map((k) => r[k]))]
        .map((r) => r.map(cell).join(","))
        .join("\n"),
    ],
    { type: "text/csv;charset=utf-8;" },
  );
  const a = document.createElement("a");
  a.href = URL.createObjectURL(blob);
  a.download = name + ".csv";
  a.click();
  URL.revokeObjectURL(a.href);
}
export function Badge({ children }: { children: React.ReactNode }) {
  return (
    <span
      className={"badge " + String(children).toLowerCase().replaceAll(" ", "-")}
    >
      {children}
    </span>
  );
}
export function DataTable({
  rows,
  columns,
  action,
  renderCell,
  searchable = true,
  exportable = false,
  limit = 7,
}: {
  rows: RecordItem[];
  columns?: [string, string][];
  action?: (r: RecordItem) => React.ReactNode;
  renderCell?: (key: string, row: RecordItem) => React.ReactNode | undefined;
  searchable?: boolean;
  exportable?: boolean;
  limit?: number;
}) {
  const [q, setQ] = useState(""),
    [sort, setSort] = useState(""),
    [asc, setAsc] = useState(true),
    [page, setPage] = useState(0);
  const cols =
    columns ??
    Object.keys(rows[0] ?? {})
      .filter((k) => !["id", "orgId"].includes(k))
      .map((k) => [k, k[0].toUpperCase() + k.slice(1)] as [string, string]);
  const filtered = useMemo(
    () =>
      rows
        .filter((r) =>
          Object.values(r).join(" ").toLowerCase().includes(q.toLowerCase()),
        )
        .sort((a, b) =>
          sort
            ? (typeof a[sort] === "number" && typeof b[sort] === "number"
                ? Number(a[sort]) - Number(b[sort])
                : String(a[sort]).localeCompare(String(b[sort]))) *
              (asc ? 1 : -1)
            : 0,
        ),
    [rows, q, sort, asc],
  );
  const pages = Math.max(1, Math.ceil(filtered.length / limit)),
    p = Math.min(page, pages - 1);
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
                value={q}
                onChange={(e) => {
                  setQ(e.target.value);
                  setPage(0);
                }}
              />
            </label>
          )}
          {exportable && (
            <button className="button" onClick={() => exportCSV(filtered)}>
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
              {cols.map(([k, l]) => (
                <th key={k}>
                  <button
                    onClick={() => {
                      setSort(k);
                      setAsc(sort === k ? !asc : true);
                    }}
                  >
                    {l}
                    <ArrowUpDown size={11} />
                  </button>
                </th>
              ))}
              {action && <th>Actions</th>}
            </tr>
          </thead>
          <tbody>
            {filtered.slice(p * limit, (p + 1) * limit).map((r) => (
              <tr key={r.id}>
                {cols.map(([k]) => (
                  <td key={k}>
                    {renderCell?.(k, r) ??
                      ([
                        "status",
                        "severity",
                        "priority",
                        "connection",
                      ].includes(k) ? (
                        <Badge>{r[k]}</Badge>
                      ) : k === "amount" ? (
                        money(Number(r[k]))
                      ) : ["date", "due", "time", "updated"].includes(k) ? (
                        dateLabel(String(r[k]))
                      ) : (
                        r[k]
                      ))}
                  </td>
                ))}
                {action && <td>{action(r)}</td>}
              </tr>
            ))}
          </tbody>
        </table>
        {!filtered.length && <div className="empty">No matching records</div>}
      </div>
      {filtered.length > limit && (
        <div className="pagination">
          <span>
            {p * limit + 1}–{Math.min((p + 1) * limit, filtered.length)} of{" "}
            {filtered.length}
          </span>
          <button
            disabled={p === 0}
            onClick={() => setPage(p - 1)}
            aria-label="Previous page"
          >
            <ChevronLeft size={16} />
          </button>
          <span>
            {p + 1} / {pages}
          </span>
          <button
            disabled={p === pages - 1}
            onClick={() => setPage(p + 1)}
            aria-label="Next page"
          >
            <ChevronRight size={16} />
          </button>
        </div>
      )}
    </>
  );
}
