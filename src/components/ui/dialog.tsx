"use client";
import * as DialogPrimitive from "@radix-ui/react-dialog";
import { X } from "lucide-react";
import { useEffect, useState } from "react";
export function Dialog({
  title,
  open,
  onClose,
  children,
}: {
  title: string;
  open: boolean;
  onClose: () => void;
  children: React.ReactNode;
}) {
  // Preserve content through the short exit animation instead of flashing an empty dialog.
  const [lastContent, setLastContent] = useState({ title, children });
  useEffect(() => {
    if (open) setLastContent({ title, children });
  }, [open, title, children]);
  const displayed = open ? { title, children } : lastContent;
  return (
    <DialogPrimitive.Root open={open} onOpenChange={(v) => !v && onClose()}>
      <DialogPrimitive.Portal>
        <DialogPrimitive.Overlay className="modal-overlay" />
        <DialogPrimitive.Content className="modal">
          <DialogPrimitive.Title>{displayed.title}</DialogPrimitive.Title>
          <DialogPrimitive.Description className="muted">
            Changes are saved in this browser for the demo.
          </DialogPrimitive.Description>
          <DialogPrimitive.Close
            className="icon-button modal-close"
            aria-label="Close"
          >
            <X size={18} />
          </DialogPrimitive.Close>
          {displayed.children}
        </DialogPrimitive.Content>
      </DialogPrimitive.Portal>
    </DialogPrimitive.Root>
  );
}
