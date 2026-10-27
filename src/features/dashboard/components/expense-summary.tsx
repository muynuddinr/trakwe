"use client";
import { Panel } from "@/components/ui/panel";
import { inPeriod } from "@/lib/demo-data";
import { money } from "@/lib/format";
import { useWorkspace } from "@/providers/workspace-provider";
export function ExpenseSummary() {
  const { days, vehicles, records, employee, cardLink } = useWorkspace();

  const expenses = records.expenses.filter((e) => inPeriod(e, days));

  return (
    <>
      <Panel
        title={employee ? "My expense summary" : "Expense summary"}
        sub={`Last ${days} days · AED`}
        action={cardLink("expenses")}
      >
        <div className="category-grid">
          {["Pending", "Approved", "Rejected"].map((status) => (
            <div key={status}>
              <span>{status}</span>
              <strong>
                {money(
                  expenses
                    .filter((e) => e.status === status)
                    .reduce((n, e) => n + Number(e.amount), 0),
                )}
              </strong>
            </div>
          ))}
          <div>
            <span>Completed tasks</span>
            <strong>
              {records.tasks.filter((t) => t.status === "Completed").length} /{" "}
              {records.tasks.length}
            </strong>
          </div>
        </div>
      </Panel>
    </>
  );
}
