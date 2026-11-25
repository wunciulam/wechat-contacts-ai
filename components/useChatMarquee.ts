import { useEffect, useRef, useState } from "react";
import type React from "react";
import {
  applyMarquee,
  dragRect,
  intersects,
  type SelectionRect,
} from "../services/chatSelection";
export default function useChatMarquee(
  ref: { current: HTMLElement | null },
  selected: Set<string>,
  setSelected: React.Dispatch<React.SetStateAction<Set<string>>>,
  onChange: () => void,
  enabled: boolean,
) {
  const [mode, setMode] = useState<"retain" | "exclude">("retain"),
    [rect, setRect] = useState<SelectionRect | null>(null);
  const gesture = useRef<{
      x: number;
      y: number;
      clientX: number;
      clientY: number;
      startClientX: number;
      startClientY: number;
      base: Set<string>;
      mode: "retain" | "exclude";
      active: boolean;
      pointerId: number;
    } | null>(null),
    frame = useRef<number | undefined>(undefined),
    blockClick = useRef(false);
  function paint() {
    const g = gesture.current,
      host = ref.current;
    if (!g?.active || !host) return;
    const bounds = host.getBoundingClientRect();
    if (g.clientY < bounds.top + 24) host.scrollTop -= 10;
    else if (g.clientY > bounds.bottom - 24) host.scrollTop += 10;
    const r = dragRect(
      g.x,
      g.y,
      g.clientX - bounds.left + host.scrollLeft,
      g.clientY - bounds.top + host.scrollTop,
    );
    setRect(r);
    const hits = Array.from(
      host.querySelectorAll<HTMLElement>("[data-chat-message]"),
    )
      .filter((row) => {
        const b = (
          row.querySelector(".chat-bubble") || row
        ).getBoundingClientRect();
        return intersects(r, {
          left: b.left - bounds.left + host.scrollLeft,
          right: b.right - bounds.left + host.scrollLeft,
          top: b.top - bounds.top + host.scrollTop,
          bottom: b.bottom - bounds.top + host.scrollTop,
        });
      })
      .map((row) => row.dataset.chatMessage!);
    const next = applyMarquee(g.base, hits, g.mode);
    setSelected((old) =>
      old.size === next.size && [...old].every((id) => next.has(id))
        ? old
        : next,
    );
  }
  function tick() {
    paint();
    if (gesture.current?.active) frame.current = requestAnimationFrame(tick);
  }
  function down(e: React.PointerEvent<HTMLElement>) {
    if (
      !enabled ||
      e.pointerType !== "mouse" ||
      e.button !== 0 ||
      !(e.target instanceof Element)
    )
      return;
    const target = e.target;
    if (target.closest('input,textarea,[role="combobox"],[data-chat-editor]'))
      return;
    const button = target.closest("button");
    if (button && !button.hasAttribute("data-message-bubble")) return;
    const host = ref.current;
    if (!host) return;
    const b = host.getBoundingClientRect();
    gesture.current = {
      x: e.clientX - b.left + host.scrollLeft,
      y: e.clientY - b.top + host.scrollTop,
      clientX: e.clientX,
      clientY: e.clientY,
      startClientX: e.clientX,
      startClientY: e.clientY,
      base: new Set(selected),
      mode: e.altKey ? "exclude" : mode,
      active: false,
      pointerId: e.pointerId,
    };
  }
  function move(e: React.PointerEvent<HTMLElement>) {
    const g = gesture.current;
    if (!g) return;
    g.clientX = e.clientX;
    g.clientY = e.clientY;
    if (
      !g.active &&
      Math.hypot(e.clientX - g.startClientX, e.clientY - g.startClientY) >= 6
    ) {
      g.active = true;
      ref.current?.setPointerCapture(e.pointerId);
      document.getSelection()?.removeAllRanges();
      onChange();
      tick();
    }
    if (g.active) e.preventDefault();
  }
  function finish(e: React.PointerEvent<HTMLElement>) {
    const g = gesture.current;
    if (!g) return;
    if (g.active) {
      paint();
      blockClick.current = true;
      setTimeout(() => {
        blockClick.current = false;
      }, 0);
    }
    gesture.current = null;
    if (frame.current !== undefined) cancelAnimationFrame(frame.current);
    frame.current = undefined;
    setRect(null);
    const host = ref.current;
    if (host?.hasPointerCapture(e.pointerId))
      host.releasePointerCapture(e.pointerId);
  }
  useEffect(
    () => () => {
      if (frame.current !== undefined) cancelAnimationFrame(frame.current);
    },
    [],
  );
  return {
    mode,
    setMode,
    rect,
    handlers: {
      onPointerDown: down,
      onPointerMove: move,
      onPointerUp: finish,
      onPointerCancel: finish,
      onLostPointerCapture: finish,
      onClickCapture: (e: React.MouseEvent<HTMLElement>) => {
        if (blockClick.current) {
          e.preventDefault();
          e.stopPropagation();
        }
      },
    },
  };
}
