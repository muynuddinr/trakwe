"use client";
import { Badge, DataTable } from "@/components/table";
import { Panel } from "@/components/ui/panel";
import { demoDate } from "@/data/records";
import { inPeriod } from "@/lib/demo-data";
import { dateLabel } from "@/lib/format";
import { useWorkspace } from "@/providers/workspace-provider";
export function RecentActivity() {
  const { days, setModal, vehicles, records, employee, cardLink } =
    useWorkspace();

  const periodTrips = records.trips.filter((t) => inPeriod(t, days)),
    openTasks = records.tasks.filter((t) => t.status !== "Completed");

  return (
    <>
      <div className="bottom-grid">
        <Panel
          title={employee ? "My recent activity" : "Recent trips"}
          sub={`Last ${days} days · your scope`}
          action={cardLink(employee ? "vehicles" : "trips")}
        >
          <DataTable
            rows={[...periodTrips].reverse().slice(0, 4)}
            columns={[
              ["vehicle", "Vehicle"],
              ["route", "Route"],
              ["distance", "Distance (km)"],
              ["date", "Date"],
            ]}
            searchable={false}
          />
        </Panel>
        <Panel
          title={employee ? "My tasks" : "Upcoming tasks"}
          sub="Updates stay in sync across the workspace"
          action={cardLink("tasks")}
        >
          {openTasks.slice(0, 3).map((t) => (
            <button
              className="task-row"
              key={t.id}
              onClick={() => setModal({ module: "tasks", row: t })}
            >
              <span className="task-checkbox" />
              <span>
                <b>{t.title}</b>
                <small>{t.vehicle}</small>
              </span>
              <span>
                <Badge>
                  {String(t.due) < demoDate ? "Overdue" : t.priority}
                </Badge>
                <small>{dateLabel(String(t.due))}</small>
              </span>
            </button>
          ))}
          {!openTasks.length && (
            <div className="empty">All tasks completed</div>
          )}
        </Panel>
      </div>
    </>
  );
}
