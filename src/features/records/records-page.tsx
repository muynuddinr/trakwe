"use client";
import { PersonAvatar } from "@/components/ui/person-avatar";
import { vehiclePhoto } from "@/lib/media";
import { Trend } from "@/components/charts";
import { Badge, DataTable } from "@/components/table";
import { demoDate } from "@/data/records";
import { RecordItem } from "@/types";
import { ArrowUpRight, Check, Clock, ShieldCheck, Wallet } from "lucide-react";
import { useState } from "react";

import { KPI } from "@/components/ui/kpi";
import { Panel } from "@/components/ui/panel";
import { fields } from "@/config/form-fields";
import { canApprove, canEdit } from "@/lib/auth";
import { dateLabel, money } from "@/lib/format";

import { useWorkspace } from "@/providers/workspace-provider";
export function RecordsPage({ module }: { module: string }) {
  const {
    account,
    openVehicle,
    setSelectedId,
    query,
    setQuery,
    days,
    setModal,
    priority,
    setPriority,
    severity,
    setSeverity,
    category,
    setCategory,
    vehicles,
    records,
    access,
    series,
    employee,
    title,
    filteredVehicles,
    filterRows,
    vehicleSelect,
    newButton,
    go,
    update,
    selectStatus,
  } = useWorkspace();
  const [board, setBoard] = useState(false);

  const m = module;
  const rows: RecordItem[] =
    m === "vehicles"
      ? filteredVehicles.map((v) => ({
          id: v.id,
          registration: v.registration,
          name: v.name,
          type: v.type,
          driver: v.driver,
          status: v.status,
          updated: v.updated,
          device: v.device,
          region: v.region,
        }))
      : filterRows(records[m] ?? []);
  const columns: Record<string, [string, string][]> = {
    drivers: [
      ["name", "Driver"],
      ["contact", "Contact"],
      ["vehicle", "Assigned vehicle"],
      ["score", "Safety score"],
      ["status", "Status"],
    ],
    tasks: [
      ["title", "Task"],
      ["employee", "Assigned to"],
      ["vehicle", "Vehicle"],
      ["priority", "Priority"],
      ["due", "Due date"],
      ["status", "Status"],
    ],
    expenses: [
      ["title", "Expense"],
      ["category", "Category"],
      ["vehicle", "Vehicle"],
      ["amount", "Amount (AED)"],
      ["date", "Date"],
      ["submitted", "Submitted by"],
      ["status", "Status"],
    ],
    alerts: [
      ["type", "Alert"],
      ["severity", "Severity"],
      ["vehicle", "Vehicle"],
      ["time", "Time (GST)"],
      ["location", "Location"],
      ["status", "Status"],
    ],
    users: [
      ["name", "Name"],
      ["email", "Email"],
      ["role", "Role"],
      ["team", "Team"],
      ["status", "Status"],
    ],
  };
  const editable = (r: RecordItem) =>
    canEdit(account, m) &&
    !(m === "users" && r.id.startsWith("account-")) &&
    !(employee && m === "expenses" && r.status !== "Pending");
  const action = (r: RecordItem) =>
    m === "alerts" ? (
      <button
        className="text-button"
        disabled={r.status === "Acknowledged"}
        onClick={() => update("alerts", r.id, { status: "Acknowledged" })}
      >
        {r.status === "Acknowledged" ? <Check size={15} /> : null}
        {r.status === "Acknowledged" ? "Acknowledged" : "Acknowledge"}
      </button>
    ) : m === "vehicles" ? (
      <div className="row-actions">
        <button
          className="text-button"
          onClick={() => {
            openVehicle(r.id);
          }}
        >
          View details
          <ArrowUpRight size={12} />
        </button>
        {canEdit(account, m) && (
          <button
            className="text-button"
            onClick={() =>
              setModal({
                module: "vehicles",
                row: vehicles.find(
                  (v) => v.id === r.id,
                ) as unknown as RecordItem,
              })
            }
          >
            Edit
          </button>
        )}
      </div>
    ) : (
      <div className="row-actions">
        {editable(r) && (
          <button
            className="text-button"
            onClick={() => setModal({ module: m, row: r })}
          >
            {employee && m === "tasks" ? "Update status" : "Edit"}
          </button>
        )}
        {m === "users" && r.id.startsWith("account-") && (
          <small className="muted">Fixed demo login</small>
        )}
        {m === "tasks" && r.status !== "Completed" && (
          <button
            className="text-button"
            onClick={() => update(m, r.id, { status: "Completed" })}
          >
            Complete
          </button>
        )}
        {m === "expenses" && canApprove(account) && r.status === "Pending" && (
          <>
            <button
              className="text-button"
              onClick={() => update(m, r.id, { status: "Approved" })}
            >
              Approve
            </button>
            <button
              className="text-button"
              onClick={() => update(m, r.id, { status: "Rejected" })}
            >
              Reject
            </button>
          </>
        )}
      </div>
    );
  return (
    <>
      <div className="module-toolbar">
        <div className="filters">
          {m === "vehicles" ? (
            selectStatus(["Moving", "Idle", "Offline"])
          ) : m === "drivers" ? (
            selectStatus(["On duty", "Off duty"])
          ) : m === "tasks" ? (
            <>
              <input
                aria-label="Search tasks"
                placeholder="Search tasks…"
                value={query}
                onChange={(e) => setQuery(e.target.value)}
              />
              {selectStatus(["To do", "In progress", "Completed"])}
              <select
                aria-label="Priority"
                value={priority}
                onChange={(e) => setPriority(e.target.value)}
              >
                {["All", "High", "Medium", "Low"].map((x) => (
                  <option key={x}>{x}</option>
                ))}
              </select>
            </>
          ) : m === "expenses" ? (
            selectStatus(["Pending", "Approved", "Rejected"])
          ) : m === "alerts" ? (
            <>
              {selectStatus(["Unacknowledged", "Acknowledged"])}
              <select
                aria-label="Severity"
                value={severity}
                onChange={(e) => setSeverity(e.target.value)}
              >
                {["All", "Critical", "Warning"].map((x) => (
                  <option key={x}>{x}</option>
                ))}
              </select>
              <select
                aria-label="Alert category"
                value={category}
                onChange={(e) => setCategory(e.target.value)}
              >
                {[
                  "All",
                  "Overspeed",
                  "Fuel drop",
                  "Temperature",
                  "Device offline",
                ].map((x) => (
                  <option key={x}>{x}</option>
                ))}
              </select>
              {vehicleSelect}
            </>
          ) : null}
        </div>
        <div className="filters">
          {m === "tasks" && (
            <button className="button" onClick={() => setBoard(!board)}>
              {board ? "List view" : "Board view"}
            </button>
          )}
          {fields[m] &&
            newButton(
              m,
              "Add " +
                {
                  vehicles: "vehicle",
                  drivers: "driver",
                  tasks: "task",
                  expenses: "expense",
                  users: "user",
                }[m],
            )}
        </div>
      </div>
      {m === "users" && (
        <div className="info-banner">
          <ShieldCheck size={16} />
          Manage demo directory users in your permitted scope. The four test
          login identities are fixed. New directory records do not create login
          credentials.
        </div>
      )}
      {m === "expenses" && (
        <div className="three-grid">
          <KPI
            label="Total expenses"
            value={money(
              records.expenses.reduce((s, e) => s + Number(e.amount), 0),
            )}
            icon={Wallet}
            note="Your permitted expense records"
          />
          <KPI
            label="Awaiting approval"
            value={
              records.expenses.filter((e) => e.status === "Pending").length
            }
            icon={Clock}
            note={
              employee
                ? "Approval by a manager or admin"
                : "Pending expense requests"
            }
          />
          <Panel title="Expense trend" sub="AED · stored demo expenses">
            <Trend data={series} type="expenses" bar days={days} />
          </Panel>
        </div>
      )}
      {m === "tasks" && board ? (
        <div className="kanban">
          {["To do", "In progress", "Completed"].map((status) => (
            <div className="kanban-column" key={status}>
              <h3>
                {status}
                <span>{rows.filter((r) => r.status === status).length}</span>
              </h3>
              {rows
                .filter((r) => r.status === status)
                .map((t) => (
                  <div className="task-card" key={t.id}>
                    <Badge>
                      {String(t.due) < demoDate && t.status !== "Completed"
                        ? "Overdue"
                        : t.priority}
                    </Badge>
                    <h3>{t.title}</h3>
                    <p>{t.description}</p>
                    <small>
                      {t.employee} · {dateLabel(String(t.due))}
                    </small>
                    <select
                      aria-label="Task status"
                      value={t.status}
                      onChange={(e) =>
                        update("tasks", t.id, { status: e.target.value })
                      }
                    >
                      {["To do", "In progress", "Completed"].map((x) => (
                        <option key={x}>{x}</option>
                      ))}
                    </select>
                    <button
                      className="text-button"
                      onClick={() => setModal({ module: "tasks", row: t })}
                    >
                      {employee ? "Update status" : "Edit task"}
                    </button>
                  </div>
                ))}
            </div>
          ))}
        </div>
      ) : (
        <Panel title={title} sub={`${rows.length} permitted demo records`}>
          <DataTable
            rows={rows}
            renderCell={(key, row) => {
              if (
                ((m === "drivers" || m === "users") && key === "name") ||
                (m === "vehicles" && key === "driver")
              )
                return (
                  <div className="person-cell">
                    <PersonAvatar name={String(row[key])} />
                    <span>{row[key]}</span>
                  </div>
                );
              if (m === "vehicles" && key === "registration")
                return (
                  <button
                    className="vehicle-cell"
                    onClick={() => openVehicle(row.id)}
                  >
                    <img
                      src={vehiclePhoto({ type: String(row.type) })}
                      alt="Demo vehicle"
                    />
                    <span>
                      {row.registration}
                      <small>View vehicle</small>
                    </span>
                  </button>
                );
              return undefined;
            }}
            columns={columns[m]}
            exportable
            action={action}
          />
        </Panel>
      )}
      {m === "expenses" && (
        <Panel title="Category breakdown">
          <div className="category-grid">
            {["Fuel", "Maintenance", "Tolls", "Insurance", "Other"].map(
              (category) => (
                <div key={category}>
                  <span>{category}</span>
                  <strong>
                    {money(
                      records.expenses
                        .filter((e) => e.category === category)
                        .reduce((s, e) => s + Number(e.amount), 0),
                    )}
                  </strong>
                </div>
              ),
            )}
          </div>
        </Panel>
      )}
    </>
  );
}
