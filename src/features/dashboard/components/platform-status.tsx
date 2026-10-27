"use client";
import { Panel } from "@/components/ui/panel";
import { organizations } from "@/data/geography";
import { useWorkspace } from "@/providers/workspace-provider";
export function PlatformStatus() {
  const { account, organization, vehicles, records, cardLink } = useWorkspace();

  return (
    <>
      {account.role === "Super Admin" && (
        <Panel
          title="Platform status"
          sub="All connectors remain safely disconnected"
          action={cardLink("integrations")}
        >
          <div className="category-grid">
            <div>
              <span>Organizations</span>
              <strong>
                {organization === "All" ? organizations.length : 1}
              </strong>
            </div>
            <div>
              <span>Device adapters</span>
              <strong>{records.integrations.length}</strong>
            </div>
            <div>
              <span>Hardware connected</span>
              <strong>0</strong>
            </div>
            <div>
              <span>Configured previews</span>
              <strong>
                {
                  records.integrations.filter((i) => i.status === "Configured")
                    .length
                }
              </strong>
            </div>
          </div>
        </Panel>
      )}
    </>
  );
}
