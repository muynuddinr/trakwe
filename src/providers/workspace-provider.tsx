"use client";
import { useWorkspaceController } from "@/hooks/use-workspace-controller";
import type { DemoAccount } from "@/types";
import { createContext, useContext } from "react";
const WorkspaceContext = createContext<ReturnType<
  typeof useWorkspaceController
> | null>(null);
export function WorkspaceProvider({
  account,
  onLogout,
  children,
}: {
  account: DemoAccount;
  onLogout: () => void;
  children: React.ReactNode;
}) {
  const value = useWorkspaceController(account, onLogout);
  return (
    <WorkspaceContext.Provider value={value}>
      {children}
    </WorkspaceContext.Provider>
  );
}
export function useWorkspace() {
  const value = useContext(WorkspaceContext);
  if (!value) throw new Error("useWorkspace requires WorkspaceProvider");
  return value;
}
