import { LoaderCircle } from "lucide-react";
export function LoadingScreen() {
  return (
    <div className="auth-loading" role="status">
      <LoaderCircle size={24} className="spin" />
      <span>Opening your workspace…</span>
    </div>
  );
}
