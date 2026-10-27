"use client";
import { DataTable } from "@/components/table";
import { ArrowUpRight } from "lucide-react";

import { Panel } from "@/components/ui/panel";
import { organizations } from "@/data/geography";

import { useWorkspace } from "@/providers/workspace-provider";
export function OrganizationsPage() {
  const { setOrganization, go } = useWorkspace();
  return (
    <Panel title="Demo organizations" sub="Super Admin · platform scope">
      <DataTable
        rows={organizations.map((o) => ({
          id: o.id,
          name: o.name,
          status: "Demo",
          region: "United Arab Emirates",
        }))}
        searchable={false}
        action={(r) => (
          <button
            className="text-button"
            onClick={() => {
              setOrganization(r.id);
              go("dashboard");
            }}
          >
            Open organization
            <ArrowUpRight size={14} />
          </button>
        )}
      />
    </Panel>
  );
}
