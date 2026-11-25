import React from "react";

export function useControlPopover(
  open: boolean,
  onClose: () => void,
  anchor: React.RefObject<HTMLElement | null>,
  panel: React.RefObject<HTMLDivElement | null>,
  width?: number,
) {
  const close = React.useRef(onClose);
  close.current = onClose;
  React.useLayoutEffect(() => {
    if (!open || !anchor.current || !panel.current) return;
    const el = panel.current;
    el.showPopover();
    const position = () => {
      const r = anchor.current?.getBoundingClientRect();
      if (!r) return;
      const w = Math.min(
        width || Math.max(r.width, 180),
        window.innerWidth - 32,
      );
      el.style.width = `${w}px`;
      const below = window.innerHeight - r.bottom - 16,
        above = r.top - 16;
      const up = below < Math.min(el.scrollHeight, 280) && above > below;
      const available = Math.max(100, up ? above - 6 : below - 6);
      el.style.maxHeight = `${available}px`;
      const h = Math.min(el.scrollHeight, available);
      el.style.left = `${Math.max(16, Math.min(r.left, window.innerWidth - w - 16))}px`;
      el.style.top = `${up ? Math.max(16, r.top - h - 6) : r.bottom + 6}px`;
    };
    position();
    const observer = new ResizeObserver(position);
    observer.observe(el);
    const scroll = (e: Event) => {
      if (!el.contains(e.target as Node)) position();
    };
    const escape = (e: KeyboardEvent) => {
      if (e.key === "Escape" && el.matches(":popover-open")) {
        e.preventDefault();
        e.stopPropagation();
        el.hidePopover();
        close.current();
        (anchor.current?.matches("button,input")
          ? anchor.current
          : anchor.current?.querySelector<HTMLElement>('input:not([aria-hidden="true"]),button')
        )?.focus();
      }
    };
    const outsideFocus = (e: FocusEvent) => {
      if (
        !anchor.current?.contains(e.target as Node) &&
        !el.contains(e.target as Node)
      ) {
        if (el.matches(":popover-open")) el.hidePopover();
        close.current();
      }
    };
    const toggle = (e: Event) => {
      if ((e as ToggleEvent).newState === "closed") close.current();
    };
    el.addEventListener("toggle", toggle);
    document.addEventListener("focusin", outsideFocus);
    document.addEventListener("keydown", escape, true);
    document.addEventListener("scroll", scroll, true);
    window.addEventListener("resize", position);
    return () => {
      observer.disconnect();
      document.removeEventListener("focusin", outsideFocus);
      el.removeEventListener("toggle", toggle);
      document.removeEventListener("keydown", escape, true);
      document.removeEventListener("scroll", scroll, true);
      window.removeEventListener("resize", position);
      if (el.matches(":popover-open")) el.hidePopover();
    };
  }, [open, width, anchor, panel]);
}
