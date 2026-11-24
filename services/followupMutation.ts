import type { Contact, ProgressRecord, FollowupAnalysis } from "../types.ts";
import { isChatDate } from "./chatAnalysis.ts";
export interface FollowupWrite {
  record: ProgressRecord;
  expected: ProgressRecord | null;
}
export interface FollowupBundle {
  writes: FollowupWrite[];
  analysis?: FollowupAnalysis;
  sourceHistory?: ProgressRecord[];
  snoozedUntil?: string;
}
const stable = (v: unknown): string =>
  JSON.stringify(v, (_k, x) =>
    x && typeof x === "object" && !Array.isArray(x)
      ? Object.fromEntries(
          Object.entries(x).sort(([a], [b]) => a.localeCompare(b)),
        )
      : x,
  );
export function applyFollowupBundle(
  contact: Contact,
  bundle: FollowupBundle,
  stamp = new Date().toISOString(),
): Contact {
  if (!bundle || !Array.isArray(bundle.writes) || bundle.writes.length > 366)
    throw Error("保存格式有误。");
  const original = contact.progressHistory || [];
  if (
    bundle.analysis &&
    stable(original) !== stable(bundle.sourceHistory || [])
  )
    throw Error("分析期间跟进已变化，请更新分析。");
  const c = structuredClone(contact);
  let history = c.progressHistory || [];
  const ids = new Set<string>();
  for (const { record, expected } of bundle.writes) {
    if (
      !record?.id ||
      ids.has(record.id) ||
      !record.content?.trim() ||
      record.content.length > 24000 ||
      (!isChatDate(record.date) && !(record.kind === "task" && !record.date))
    )
      throw Error("请检查日期与内容。");
    ids.add(record.id);
    const old = history.find((r) => r.id === record.id);
    const strip = (r: ProgressRecord) => {
      const { updatedAt, ...rest } = r;
      return rest;
    };
    if (old && stable(strip(old)) === stable(strip(record))) continue;
    if (stable(old || null) !== stable(expected || null))
      throw Error("记录已在其他页面修改，请刷新核对后重试。");
    if (
      !old &&
      (
        c as Contact & { progressDeletedIds?: string[] }
      ).progressDeletedIds?.includes(record.id)
    )
      throw Error("该记录已删除，不能重复提交。");
    if (
      record.kind === "task" &&
      !record.completed &&
      history.some(
        (r) =>
          r.id !== record.id &&
          r.kind === "task" &&
          !r.completed &&
          (r.content.trim() === record.content.trim() ||
            Boolean(
              record.sourceRecordId &&
                r.sourceRecordId === record.sourceRecordId,
            )),
      )
    )
      throw Error("已有对应待办，请调整原任务。");
    const saved = { ...record, updatedAt: stamp };
    history = old
      ? history.map((r) => (r.id === record.id ? saved : r))
      : [saved, ...history];
  }
  c.progressHistory = history;
  if (bundle.analysis) c.followupAnalysis = bundle.analysis;
  if (bundle.snoozedUntil !== undefined) {
    if (bundle.snoozedUntil && !isChatDate(bundle.snoozedUntil))
      throw Error("提醒日期不正确。");
    c.followupSnoozedUntil = bundle.snoozedUntil;
  }
  if (
    bundle.writes.some(
      (w) =>
        w.record.kind !== "task" &&
        w.record.channel !== "attempt" &&
        w.record.channel !== "internal",
    )
  ) {
    const dates = history
      .filter(
        (r) =>
          r.kind !== "task" &&
          r.channel !== "attempt" &&
          r.channel !== "internal",
      )
      .map((r) => r.date)
      .filter(isChatDate)
      .sort();
    if (dates.length) c.lastDate = dates.at(-1);
  }
  return c;
}
