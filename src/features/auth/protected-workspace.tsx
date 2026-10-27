"use client";
import { AppShell } from "@/components/layout/app-shell";
import { LoadingScreen } from "@/components/ui/loading-screen";
import { useAuth } from "@/providers/auth-provider";
import { WorkspaceProvider } from "@/providers/workspace-provider";
import { useRouter } from "next/navigation";
import { Suspense, useEffect } from "react";
export function ProtectedWorkspace({
  children,
}: {
  children: React.ReactNode;
}) {
  const { account, ready, logout } = useAuth();
  const router = useRouter();
  useEffect(() => {
    if (ready && !account) router.replace("/login");
  }, [ready, account, router]);
  if (!ready || !account) return <LoadingScreen />;
  return (
    <Suspense fallback={<LoadingScreen />}>
      <WorkspaceProvider key={account.id} account={account} onLogout={logout}>
        <AppShell>{children}</AppShell>
      </WorkspaceProvider>
    </Suspense>
  );
}
