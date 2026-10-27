"use client";
import { FleetMap } from "@/components/maps/fleet-map-client";
import { Badge } from "@/components/table";
import { Panel } from "@/components/ui/panel";
import { useWorkspace } from "@/providers/workspace-provider";
import { ArrowRight, Bell, ListTodo } from "lucide-react";
export function OperationsOverview() {
  const {
    setSelectedId,
    setFilterVehicle,
    vehicles,
    records,
    geofences,
    employee,
    activeAlerts,
    cardLink,
    go,
  } = useWorkspace();

  const openTasks = records.tasks.filter((t) => t.status !== "Completed");
  const score = records.drivers.length
    ? Math.round(
        records.drivers.reduce((n, d) => n + Number(d.score), 0) /
          records.drivers.length,
      )
    : 100;
  return (
    <>
      <div className="operations-grid">
        <Panel
          title={employee ? "Assigned vehicle locations" : "Fleet location"}
          sub="United Arab Emirates · demo positions"
          action={cardLink("tracking", "Open live tracking")}
          className="map-panel"
        >
          <div className="preview-map">
            <FleetMap
              vehicles={vehicles}
              compact
              geofences={geofences}
              onSelect={(v) => {
                setSelectedId(v.id);
                go(employee ? "vehicles" : "tracking");
              }}
            />
          </div>
        </Panel>
        <Panel
          title={employee ? "My work overview" : "Driver performance"}
          sub={
            employee
              ? "Assigned tasks and submitted expenses"
              : "Safety across your authorized fleet"
          }
          action={cardLink(employee ? "tasks" : "behavior")}
        >
          <div className="score">
            <div>
              <strong>
                {employee ? openTasks.length : score}
                {!employee && <small>/100</small>}
              </strong>
              <Badge>
                {employee ? "Open tasks" : score >= 90 ? "Good" : "Review"}
              </Badge>
            </div>
            <p>
              {employee
                ? "Tasks awaiting completion"
                : "Score derived from demo behavior events"}
            </p>
          </div>
          {(employee
            ? [
                [
                  "Completed tasks",
                  records.tasks.filter((t) => t.status === "Completed").length,
                ],
                [
                  "Pending expenses",
                  records.expenses.filter((e) => e.status === "Pending").length,
                ],
                ["My alerts", activeAlerts],
              ]
            : [
                [
                  "Overspeed",
                  records.behavior.filter((e) => e.event === "Overspeed")
                    .length,
                ],
                [
                  "Harsh braking",
                  records.behavior.filter((e) => e.event === "Harsh braking")
                    .length,
                ],
                [
                  "Excessive idling",
                  records.behavior.filter((e) => e.event === "Excessive idling")
                    .length,
                ],
              ]
          ).map(([label, value]) => (
            <div className="metric-bar" key={label}>
              <div>
                <span>{label}</span>
                <b>{value}</b>
              </div>
              <div className="bar-track">
                <i
                  style={{
                    width: `${Math.min(100, (Number(value) / Math.max(employee ? records.tasks.length : records.behavior.length, 1)) * 100)}%`,
                  }}
                />
              </div>
            </div>
          ))}
          <button
            className="subtle-link"
            onClick={() => go(employee ? "tasks" : "behavior")}
          >
            {employee ? "Manage my tasks" : "Explore driver insights"}
            <ArrowRight size={14} />
          </button>
        </Panel>
        <Panel
          title="Recent alerts"
          sub={`${activeAlerts} alerts need attention`}
          action={cardLink("alerts")}
        >
          {records.alerts.slice(0, 3).map((a) => (
            <button
              className="alert-row"
              key={a.id}
              onClick={() => {
                go("alerts");
                setFilterVehicle(String(a.vehicle));
              }}
            >
              <span
                className={
                  "alert-icon " + (a.severity === "Critical" ? "red" : "gold")
                }
              >
                <Bell size={15} />
              </span>
              <span>
                <b>{a.type}</b>
                <small>{a.vehicle}</small>
              </span>
              <Badge>{a.status === "Acknowledged" ? "Read" : "New"}</Badge>
            </button>
          ))}
          {!records.alerts.length && (
            <div className="empty">No alerts in your scope</div>
          )}
          <div className="mini-task">
            <span>
              <ListTodo size={16} />
              Open tasks
            </span>
            <b>{openTasks.length}</b>
            <button aria-label="View tasks" onClick={() => go("tasks")}>
              <ArrowRight size={15} />
            </button>
          </div>
        </Panel>
      </div>
    </>
  );
}
