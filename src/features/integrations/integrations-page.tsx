"use client";
import { Badge } from "@/components/table";
import { Plug } from "lucide-react";

import { Panel } from "@/components/ui/panel";

import { useWorkspace } from "@/providers/workspace-provider";
export function IntegrationsPage() {
  const { setModal, records } = useWorkspace();
  return (
    <>
      <div className="info-banner">
        <Plug size={16} />
        Configuration persists in this browser. No GPS, telemetry, camera, or
        immobilizer devices are connected.
      </div>
      <div className="integration-grid">
        {records.integrations.map((i) => (
          <Panel
            key={i.id}
            title={String(i.manufacturer)}
            sub={String(i.model)}
          >
            <div className="integration-icon">
              <Plug size={30} />
            </div>
            <dl>
              <dt>Protocol</dt>
              <dd>{i.protocol}</dd>
              <dt>Capabilities</dt>
              <dd>{i.capabilities}</dd>
              <dt>Connection</dt>
              <dd>
                <Badge>{i.connection}</Badge>
              </dd>
              <dt>Configuration</dt>
              <dd>
                <Badge>{i.status}</Badge>
              </dd>
            </dl>
            <button
              className="button full"
              onClick={() => setModal({ module: "integration", row: i })}
            >
              Configure preview
            </button>
          </Panel>
        ))}
      </div>
    </>
  );
}
