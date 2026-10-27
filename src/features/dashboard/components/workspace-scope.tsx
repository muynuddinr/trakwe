"use client";
import { useWorkspace } from "@/providers/workspace-provider";
import { ShieldCheck } from "lucide-react";
export function WorkspaceScope() {
  const { account, vehicles, employee, scopeName } = useWorkspace();

  return (
    <>
      <div className="scope-banner">
        <span>
          <ShieldCheck size={14} />
          {account.role} workspace
        </span>
        <span>
          {employee
            ? "Your assigned vehicles and work"
            : account.role === "Manager"
              ? "Authorized fleet only"
              : scopeName}{" "}
          · UAE demo
        </span>
      </div>
    </>
  );
}
