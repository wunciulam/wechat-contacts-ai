import React, { useEffect, useRef, useState } from 'react';
import { X } from 'lucide-react';

export const DialogFooterContext = React.createContext<HTMLDivElement | null>(null);

export default function WorkspaceDialog({ title, onClose, children, compact = false }: {
  title: string; onClose: () => void; children: React.ReactNode; compact?: boolean;
}) {
  const [footer, setFooter] = useState<HTMLDivElement | null>(null);
  const ref = useRef<HTMLDialogElement>(null);
  useEffect(() => {
    const trigger = document.activeElement as HTMLElement | null;
    ref.current?.showModal();
    return () => { ref.current?.close(); trigger?.focus(); };
  }, []);
  return <dialog ref={ref} onCancel={event => { event.preventDefault(); onClose(); }}
    className={`workspace-dialog m-auto w-[calc(100%-2rem)] ${compact ? 'max-w-lg' : 'max-w-4xl'} rounded-2xl border border-gray-200 bg-white p-0 text-gray-900 shadow-2xl`}>
    <div className="flex max-h-[90dvh] flex-col">
      <header className="flex shrink-0 items-center justify-between gap-3 border-b border-gray-100 px-5 py-4">
        <h2 className="text-base font-semibold">{title}</h2>
        <button type="button" className="icon-btn" aria-label="关闭" onClick={onClose}><X size={20}/></button>
      </header>
      <DialogFooterContext.Provider value={footer}><div className="min-h-0 overflow-y-auto p-5">{children}</div></DialogFooterContext.Provider>
      <div ref={setFooter} className="shrink-0 empty:hidden"/>
    </div>
  </dialog>;
}
