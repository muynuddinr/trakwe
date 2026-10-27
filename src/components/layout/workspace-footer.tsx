"use client";

import { useWorkspace } from "@/providers/workspace-provider";
export function WorkspaceFooter() {
  const { refresh } = useWorkspace();
  return (
    <footer>
      <span>
        <i className="pulse" />
        Demo snapshot · Updated {refresh} GST · UTC+4
      </span>
      <span>Trackwe · Fleet intelligence, in focus.</span>
    </footer>
  );
}
