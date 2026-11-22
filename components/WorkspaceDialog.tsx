import React, { useEffect, useRef, useState, useId, useContext } from 'react';
import { createPortal } from 'react-dom';
import { X } from 'lucide-react';

export const DialogFooterContext = React.createContext<HTMLDivElement | null>(null);

export default function WorkspaceDialog({ title, onClose, children, compact = false, size, className = "" }: {
  title: string; onClose: () => void; children: React.ReactNode; compact?: boolean; size?: "import" | "confirm"; className?: string;
}) {
  const titleId = useId();
  const [footer, setFooter] = useState<HTMLDivElement | null>(null);
  const ref = useRef<HTMLDialogElement>(null);
  useEffect(() => {
    const trigger = document.activeElement as HTMLElement | null;
    ref.current?.showModal();
    return () => { ref.current?.close(); trigger?.focus(); };
  }, []);
  return <dialog aria-labelledby={titleId} ref={ref} onCancel={event => { event.preventDefault(); event.stopPropagation(); onClose(); }}
    className={`workspace-dialog m-auto w-[calc(100%-2rem)] ${compact ? 'max-w-lg' : size === 'import' ? 'max-w-3xl' : size === 'confirm' ? 'max-w-sm' : 'max-w-4xl'} ${className} rounded-2xl border border-gray-200 bg-white p-0 text-gray-900 shadow-2xl`}>
    <div className="flex max-h-[90dvh] flex-col">
      <header className="flex shrink-0 items-center justify-between gap-3 border-b border-gray-100 px-5 py-4">
        <h2 id={titleId} className="text-base font-semibold">{title}</h2>
        <button type="button" className="icon-btn" aria-label="关闭" onClick={onClose}><X size={20}/></button>
      </header>
      <DialogFooterContext.Provider value={footer}><div className="min-h-0 overflow-y-auto p-5">{children}</div></DialogFooterContext.Provider>
      <div ref={setFooter} className="shrink-0 empty:hidden"/>
    </div>
  </dialog>;
}

export function WorkspaceDialogFooter({ children }: { children: React.ReactNode }) {
  const host = useContext(DialogFooterContext);
  return host ? createPortal(<div className="flex flex-wrap items-center justify-end gap-2 border-t border-gray-100 px-5 py-4">{children}</div>, host) : null;
}
