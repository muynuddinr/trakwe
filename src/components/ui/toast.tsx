"use client";
import { CheckCircle2, X } from "lucide-react";

import { useWorkspace } from "@/providers/workspace-provider";
export function Toast() {
  const { notice, setNotice } = useWorkspace();
  return (
    <>
      {notice && (
        <div className="toast" role="status">
          <CheckCircle2 size={18} />
          {notice}
          <button aria-label="Dismiss" onClick={() => setNotice("")}>
            <X size={14} />
          </button>
        </div>
      )}
    </>
  );
}
