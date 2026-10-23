'use client';
import * as DialogPrimitive from '@radix-ui/react-dialog';
import {X} from 'lucide-react';
export function Dialog({title,open,onClose,children}:{title:string;open:boolean;onClose:()=>void;children:React.ReactNode}){return <DialogPrimitive.Root open={open} onOpenChange={v=>!v&&onClose()}><DialogPrimitive.Portal><DialogPrimitive.Overlay className="modal-overlay"/><DialogPrimitive.Content className="modal"><DialogPrimitive.Title>{title}</DialogPrimitive.Title><DialogPrimitive.Description className="muted">Changes apply to this frontend demo session.</DialogPrimitive.Description><DialogPrimitive.Close className="icon-button modal-close" aria-label="Close"><X size={18}/></DialogPrimitive.Close>{children}</DialogPrimitive.Content></DialogPrimitive.Portal></DialogPrimitive.Root>}
