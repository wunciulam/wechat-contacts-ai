import type { ChatMessage } from "../types.ts";
import { isChatDate } from "./chatAnalysis.ts";
export interface SelectionRect {
  left: number;
  top: number;
  right: number;
  bottom: number;
}
export const dragRect = (
  x1: number,
  y1: number,
  x2: number,
  y2: number,
): SelectionRect => ({
  left: Math.min(x1, x2),
  right: Math.max(x1, x2),
  top: Math.min(y1, y2),
  bottom: Math.max(y1, y2),
});
export const intersects = (a: SelectionRect, b: SelectionRect) =>
  a.left <= b.right &&
  a.right >= b.left &&
  a.top <= b.bottom &&
  a.bottom >= b.top;
export function applyMarquee(
  base: Set<string>,
  hits: string[],
  mode: "retain" | "exclude",
) {
  const next = new Set(base);
  for (const id of hits) mode === "retain" ? next.add(id) : next.delete(id);
  return next;
}
export function summarySelection(
  messages: ChatMessage[],
  selected: Set<string>,
) {
  const picked = messages.filter((m) => selected.has(m.id));
  const ready = picked.filter(
    (m) =>
      isChatDate(m.date) &&
      ["self", "customer"].includes(m.speaker) &&
      Boolean(m.text.trim()),
  );
  return { picked, ready, skipped: picked.length - ready.length };
}
