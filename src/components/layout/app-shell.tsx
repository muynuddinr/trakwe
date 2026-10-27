"use client";
import { WorkspaceDialogs } from "@/components/forms/workspace-dialogs";
import { Toast } from "@/components/ui/toast";
import { useWorkspace } from "@/providers/workspace-provider";
import { PageHeading } from "./page-heading";
import { Sidebar } from "./sidebar";
import { Topbar } from "./topbar";
import { WorkspaceFooter } from "./workspace-footer";
export function AppShell({ children }: { children: React.ReactNode }) {
  const { ready, collapsed, mobile, setMobile, access, page } = useWorkspace();
  if (!ready)
    return <div className="auth-loading">Loading your demo records…</div>;
  return (
    <div className={"app " + (collapsed ? "collapsed" : "")}>
      <Sidebar />
      {mobile && (
        <button
          className="drawer-backdrop"
          onClick={() => setMobile(false)}
          aria-label="Close navigation"
        />
      )}
      <div className="main">
        <Topbar />
        <main>
          <PageHeading />
          <div key={page} className="page-transition">
            {access(page) && children}
          </div>
          <WorkspaceFooter />
        </main>
      </div>
      <Toast />
      <WorkspaceDialogs />
    </div>
  );
}
