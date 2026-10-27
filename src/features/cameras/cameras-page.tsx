"use client";
import { Badge } from "@/components/table";
import { Camera } from "lucide-react";

import { Panel } from "@/components/ui/panel";

import { useWorkspace } from "@/providers/workspace-provider";
export function CamerasPage() {
  const { setSelectedId, setModal, vehicles } = useWorkspace();
  return (
    <>
      <div className="info-banner">
        <Camera size={16} />
        Camera integration preview. No video provider is connected.
      </div>
      <div className="camera-grid">
        {vehicles
          .filter((v) => v.camera)
          .slice(0, 6)
          .map((v) => (
            <Panel key={v.id} title={v.registration} sub={v.name}>
              <div className="video-placeholder">
                <Camera size={34} />
                <strong>No stream connected</strong>
                <span>Connect a camera provider in Phase 2</span>
              </div>
              <div className="camera-footer">
                <Badge>Not Connected</Badge>
                <button
                  className="text-button"
                  onClick={() => {
                    setSelectedId(v.id);
                    setModal({ module: "camera" });
                  }}
                >
                  Camera details
                </button>
              </div>
            </Panel>
          ))}
      </div>
      <Panel title="Recording & event timeline">
        <div className="empty">
          No recordings available. Events will appear after a real camera
          integration is connected.
        </div>
      </Panel>
    </>
  );
}
