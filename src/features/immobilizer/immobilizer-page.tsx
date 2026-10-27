"use client";
import { DataTable } from "@/components/table";
import { Power } from "lucide-react";

import { Panel } from "@/components/ui/panel";

import { useWorkspace } from "@/providers/workspace-provider";
export function ImmobilizerPage() {
  const { setCommandTarget, vehicles, records } = useWorkspace();
  return (
    <>
      <div className="info-banner warning">
        <Power size={16} />
        DEMO MODE — actions record a local simulation only. No commands are sent
        to a vehicle.
      </div>
      <Panel title="Compatible vehicles">
        <DataTable
          rows={vehicles
            .filter((v) => v.immobilizer)
            .map((v) => ({
              id: v.id,
              vehicle: v.registration,
              device: v.device,
              connection: "Not Connected",
              state: "Unknown · no hardware feedback",
            }))}
          action={(r) => (
            <button
              className="button"
              onClick={() => {
                setCommandTarget(vehicles.find((v) => v.id === r.id)!);
              }}
            >
              Simulate command
            </button>
          )}
        />
      </Panel>
      <Panel title="Demo command history">
        <DataTable
          rows={records.commands}
          columns={[
            ["vehicle", "Vehicle"],
            ["action", "Action"],
            ["reason", "Reason"],
            ["time", "Timestamp"],
            ["status", "Status"],
          ]}
        />
      </Panel>
    </>
  );
}
