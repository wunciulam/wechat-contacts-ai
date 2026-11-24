import React, { useEffect, useRef, useState, useId, useContext } from "react";
import { createPortal } from "react-dom";
import { X } from "lucide-react";
import { IconButton } from "./ui/Button";
export const DialogFooterContext = React.createContext<HTMLDivElement | null>(
  null,
);
type Props = {
  title: string;
  subtitle?: string;
  headerContent?: React.ReactNode;
  accessibleTitle?: string;
  onClose: () => void;
  children: React.ReactNode;
  compact?: boolean;
  size?: "import" | "confirm" | "contact" | "chat" | "followup";
  className?: string;
  bodyClassName?: string;
  closeDisabled?: boolean;
  presentation?: "modal" | "drawer";
  hideHeader?: boolean;
  closeOnBackdrop?: boolean;
};
export default function WorkspaceDialog({
  title,
  subtitle,
  headerContent,
  accessibleTitle,
  onClose,
  children,
  compact = false,
  size,
  className = "",
  bodyClassName,
  closeDisabled = false,
  presentation = "modal",
  hideHeader = false,
  closeOnBackdrop = false,
}: Props) {
  const titleId = useId(),
    ref = useRef<HTMLDialogElement>(null);
  const [footer, setFooter] = useState<HTMLDivElement | null>(null);
  useEffect(() => {
    const trigger = document.activeElement as HTMLElement | null;
    const dialog = ref.current;
    dialog?.showModal();
    return () => {
      dialog?.close();
      queueMicrotask(() => {
        if (trigger?.isConnected) trigger.focus();
      });
    };
  }, []);
  const width =
    size === "chat"
      ? "max-w-[920px]"
      : size === "followup"
        ? "max-w-[953px]"
        : compact
          ? "max-w-lg"
          : size === "import"
            ? "max-w-3xl"
            : size === "confirm"
              ? "max-w-sm"
              : size === "contact"
                ? "max-w-5xl"
                : "max-w-4xl";
  const drawer = presentation === "drawer";
  return (
    <dialog
      ref={ref}
      aria-labelledby={hideHeader || accessibleTitle ? undefined : titleId}
      aria-label={accessibleTitle || (hideHeader ? title : undefined)}
      className={`workspace-dialog bg-white p-0 text-gray-900 ${drawer ? "ui-navigation-drawer" : `m-auto w-[calc(100%-2rem)] ${width} rounded-2xl border border-gray-200 shadow-2xl`} ${className}`}
      onCancel={(event) => {
        event.preventDefault();
        event.stopPropagation();
        if (!closeDisabled) onClose();
      }}
      onClick={(event) => {
        if (closeOnBackdrop && !closeDisabled && event.target === ref.current) {
          const r = ref.current!.getBoundingClientRect();
          if (
            event.clientX < r.left ||
            event.clientX > r.right ||
            event.clientY < r.top ||
            event.clientY > r.bottom
          )
            onClose();
        }
      }}
    >
      <div
        className={
          drawer ? "flex h-full flex-col" : "flex max-h-[90dvh] flex-col"
        }
      >
        {!hideHeader && (
          <header className="flex shrink-0 items-center justify-between gap-3 border-b border-gray-100 px-5 py-4">
            {headerContent || (
              <div className="flex min-w-0 items-center gap-2">
                <h2 id={titleId} className="text-base font-semibold">
                  {title}
                </h2>
                {subtitle && (
                  <span className="text-xs text-gray-500">{subtitle}</span>
                )}
              </div>
            )}
            <IconButton
              aria-label="关闭"
              className={headerContent ? "self-start" : undefined}
              disabled={closeDisabled}
              onClick={onClose}
            >
              <X size={20} aria-hidden="true" />
            </IconButton>
          </header>
        )}
        <DialogFooterContext.Provider value={footer}>
          <div
            data-dialog-body
            className={bodyClassName || "min-h-0 overflow-y-auto p-5"}
          >
            {children}
          </div>
        </DialogFooterContext.Provider>
        <div ref={setFooter} className="shrink-0 empty:hidden" />
      </div>
    </dialog>
  );
}
export function WorkspaceDialogFooter({
  children,
}: {
  children: React.ReactNode;
}) {
  const host = useContext(DialogFooterContext);
  return host
    ? createPortal(
        <div className="flex flex-wrap items-center justify-end gap-2 border-t border-gray-100 px-5 py-4">
          {children}
        </div>,
        host,
      )
    : null;
}
