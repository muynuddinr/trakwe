import { ExpenseSummary } from "./components/expense-summary";
import { FleetCharts } from "./components/fleet-charts";
import { FleetMetrics } from "./components/fleet-metrics";
import { OperationsOverview } from "./components/operations-overview";
import { PlatformStatus } from "./components/platform-status";
import { RecentActivity } from "./components/recent-activity";
import { WorkspaceScope } from "./components/workspace-scope";
export function DashboardPage() {
  return (
    <>
      <WorkspaceScope />
      <FleetMetrics />
      <FleetCharts />
      <OperationsOverview />
      <RecentActivity />
      <ExpenseSummary />
      <PlatformStatus />
    </>
  );
}
