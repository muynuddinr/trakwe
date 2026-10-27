import { ProtectedWorkspace } from "@/features/auth/protected-workspace";
export default function WorkspaceLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return <ProtectedWorkspace>{children}</ProtectedWorkspace>;
}
