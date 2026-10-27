"use client";
import { RotateCcw } from "lucide-react";
import { useEffect, useState } from "react";

import { Panel } from "@/components/ui/panel";
import { canReset } from "@/lib/auth";

import { useWorkspace } from "@/providers/workspace-provider";
export function SettingsPage() {
  const {
    organization,
    store,
    ready,
    account,
    setNotice,
    setModal,
    savePreferences,
  } = useWorkspace();
  const [org, setOrg] = useState("Trackwe Logistics");
  const [emailAlerts, setEmailAlerts] = useState(true);
  useEffect(() => {
    const id =
      account.role === "Super Admin"
        ? organization === "All"
          ? "org-dubai"
          : organization
        : account.orgId;
    const prefs = store.preferences[id];
    if (prefs) {
      setOrg(prefs.name);
      setEmailAlerts(prefs.emailAlerts);
    }
  }, [ready, organization, account.orgId]);
  return (
    <div className="settings-grid">
      <Panel
        title={
          account.role === "Super Admin"
            ? "Organization preferences"
            : "Organization settings"
        }
        sub="Saved locally for this demo"
      >
        <form
          onSubmit={(e) => {
            e.preventDefault();
            if (savePreferences(org, emailAlerts))
              setNotice("Preferences saved to this browser.");
          }}
        >
          <label>
            Organization name
            <input
              value={org}
              required
              onChange={(e) => setOrg(e.target.value)}
            />
          </label>
          <label>
            Timezone
            <input readOnly value="Asia/Dubai (UTC +04:00)" />
          </label>
          <label>
            Currency
            <input readOnly value="AED — UAE dirham" />
          </label>
          <label className="check-label">
            <input
              type="checkbox"
              checked={emailAlerts}
              onChange={(e) => setEmailAlerts(e.target.checked)}
            />
            Notification preference (demo only)
          </label>
          <button className="button primary">Save preferences</button>
        </form>
      </Panel>
      <Panel title="Demo data & system status">
        <dl>
          <dt>Data</dt>
          <dd>Persistent browser demo records</dd>
          <dt>Map</dt>
          <dd>OpenStreetMap · UAE</dd>
          <dt>Backend / devices</dt>
          <dd>Not connected</dd>
          <dt>Session</dt>
          <dd>8-hour demo session</dd>
        </dl>
        <div className="settings-actions">
          <p className="muted">
            Reset restores{" "}
            {account.role === "Super Admin"
              ? "all organizations"
              : "your organization"}{" "}
            to reproducible seed data. Other saved work in that scope will be
            removed.
          </p>
          {canReset(account) && (
            <button
              className="button"
              onClick={() => setModal({ module: "reset" })}
            >
              <RotateCcw size={14} />
              Reset demo data
            </button>
          )}
        </div>
      </Panel>
    </div>
  );
}
