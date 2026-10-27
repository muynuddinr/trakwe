"use client";
import { useRecordForm } from "./use-record-form";

import { Dialog } from "@/components/ui/dialog";
import { demoDate } from "@/data/records";
import { useEffect, useState } from "react";

import { fields } from "@/config/form-fields";

import { VehicleDetails } from "@/features/vehicles/components/vehicle-details";
import { useWorkspace } from "@/providers/workspace-provider";
export function WorkspaceDialogs() {
  const {
    setSelectedId,
    setNotice,
    modal,
    setModal,
    commandTarget,
    setCommandTarget,
    setRecords,
    reset,
    selected,
    update,
  } = useWorkspace();
  const { saveForm, formFields } = useRecordForm();
  const [reason, setReason] = useState("");
  useEffect(() => setReason(""), [commandTarget]);
  return (
    <>
      <Dialog
        open={!!modal}
        onClose={() => setModal(null)}
        title={
          modal?.module === "reset"
            ? "Reset demo data"
            : modal?.module === "vehicle-detail"
              ? "Assigned vehicle"
              : modal?.module === "camera"
                ? "Camera details"
                : modal?.module === "integration"
                  ? "Device configuration"
                  : `${modal?.row ? "Edit" : "Add"} ${{ vehicles: "vehicle", drivers: "driver", tasks: "task", expenses: "expense", users: "user" }[modal?.module ?? ""] ?? "record"}`
        }
      >
        {modal && fields[modal.module] && (
          <form onSubmit={saveForm}>
            <div className="form-grid">
              {formFields(modal.module).map((f) => (
                <label key={f.key}>
                  {f.label}
                  {f.options ? (
                    <select
                      name={f.key}
                      defaultValue={String(
                        modal.row?.[f.key] ??
                          (f.key === "vehicle" && selected
                            ? selected.registration
                            : f.options[0]),
                      )}
                    >
                      {f.options.map((o) => (
                        <option key={o}>{o}</option>
                      ))}
                    </select>
                  ) : (
                    <input
                      name={f.key}
                      type={f.type ?? "text"}
                      min={f.type === "number" ? 1 : undefined}
                      step={f.type === "number" ? ".01" : undefined}
                      required={!f.optional}
                      defaultValue={
                        modal.row?.[f.key] ??
                        (f.type === "date" ? demoDate : "")
                      }
                    />
                  )}
                </label>
              ))}
            </div>
            {modal.module === "expenses" && (
              <p className="muted">
                Receipt uploads are not connected in this phase.
              </p>
            )}
            <div className="modal-actions">
              <button
                type="button"
                className="button"
                onClick={() => setModal(null)}
              >
                Cancel
              </button>
              <button className="button primary">
                Save {modal.module === "users" ? "preview" : "record"}
              </button>
            </div>
          </form>
        )}
        {modal?.module === "reset" && (
          <>
            <p className="muted">
              Restore the demo seed records in your authorized scope? This
              removes saved demo edits in that scope.
            </p>
            <div className="modal-actions">
              <button className="button" onClick={() => setModal(null)}>
                Cancel
              </button>
              <button
                className="button primary"
                onClick={() => {
                  if (reset()) {
                    setModal(null);
                    setSelectedId(null);
                    setNotice("Demo records reset.");
                  }
                }}
              >
                Confirm reset
              </button>
            </div>
          </>
        )}
        {modal?.module === "vehicle-detail" && selected && (
          <div className="inline-detail">
            {<VehicleDetails vehicle={selected} />}
          </div>
        )}
        {modal?.module === "camera" && (
          <div>
            <dl>
              <dt>Vehicle</dt>
              <dd>{selected?.registration}</dd>
              <dt>Connectivity</dt>
              <dd>Not Connected</dd>
              <dt>Recordings</dt>
              <dd>Unavailable</dd>
            </dl>
            <p>
              Connect a supported camera API in Phase 2 to enable video playback
              and event recordings.
            </p>
          </div>
        )}
        {modal?.module === "integration" && (
          <form
            onSubmit={(e) => {
              e.preventDefault();
              update("integrations", modal.row!.id, {
                status: "Configured",
                configurationLabel: String(
                  new FormData(e.currentTarget).get("label"),
                ),
              });
              setModal(null);
              setNotice(
                "Demo configuration saved. Device remains disconnected.",
              );
            }}
          >
            <label>
              Configuration label
              <input
                name="label"
                required
                defaultValue={String(
                  modal.row?.configurationLabel ?? modal.row?.model,
                )}
              />
            </label>
            <p>
              Endpoint credentials and real device connections will be added in
              Phase 2.
            </p>
            <button className="button primary">Save demo configuration</button>
          </form>
        )}
      </Dialog>
      <Dialog
        open={!!commandTarget}
        title="Confirm demo immobilizer command"
        onClose={() => setCommandTarget(null)}
      >
        <form
          onSubmit={(e) => {
            e.preventDefault();
            setRecords((r) => ({
              ...r,
              commands: [
                {
                  id: `cmd${Date.now()}`,
                  vehicle: commandTarget!.registration,
                  action: "Immobilize · simulation",
                  reason,
                  time: new Date().toISOString(),
                  status: "Simulated only",
                },
                ...r.commands,
              ],
            }));
            setCommandTarget(null);
            setNotice("Simulation recorded. No command was sent.");
          }}
        >
          <div className="info-banner warning">
            This does not physically immobilize {commandTarget?.registration}.
            Hardware state remains unknown.
          </div>
          <label>
            Reason for simulation
            <input
              required
              value={reason}
              onChange={(e) => setReason(e.target.value)}
            />
          </label>
          <div className="modal-actions">
            <button
              type="button"
              className="button"
              onClick={() => setCommandTarget(null)}
            >
              Cancel
            </button>
            <button className="button primary">Confirm simulation</button>
          </div>
        </form>
      </Dialog>
    </>
  );
}
