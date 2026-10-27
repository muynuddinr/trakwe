"use client";
import { PersonAvatar } from "@/components/ui/person-avatar";
import { Badge } from "@/components/table";
import { LogOut } from "lucide-react";

import { Panel } from "@/components/ui/panel";

import { useWorkspace } from "@/providers/workspace-provider";
export function ProfilePage() {
  const { account, onLogout, vehicles, employee, scopeName } = useWorkspace();
  return (
    <div className="settings-grid">
      <Panel title="My profile" sub="Current demo account">
        <div className="profile-portrait">
          <PersonAvatar name={account.name} size={80} />
          <div>
            <h3>{account.name}</h3>
            <p>{account.role} · Demo profile</p>
          </div>
        </div>
        <dl>
          <dt>Name</dt>
          <dd>{account.name}</dd>
          <dt>Email</dt>
          <dd>{account.email}</dd>
          <dt>Role</dt>
          <dd>
            <Badge>{account.role}</Badge>
          </dd>
          <dt>Organization</dt>
          <dd>{scopeName}</dd>
          <dt>Visible vehicles</dt>
          <dd>{vehicles.length}</dd>
        </dl>
        <div className="settings-actions">
          <button className="button primary" onClick={onLogout}>
            <LogOut size={15} />
            Log out / switch account
          </button>
        </div>
      </Panel>
      <Panel title="Your access">
        <div className="settings-actions">
          <p className="muted">
            {employee
              ? "You can view assigned vehicles, update your tasks, submit expenses, and acknowledge relevant notifications."
              : `Your ${account.role.toLowerCase()} workspace exposes only authorized records and actions.`}
          </p>
          <p className="muted">
            This is client-side demo authentication. It demonstrates workflows;
            it does not secure production data.
          </p>
        </div>
      </Panel>
    </div>
  );
}
