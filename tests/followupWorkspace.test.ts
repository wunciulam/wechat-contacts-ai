import test from "node:test";
import assert from "node:assert/strict";
import {
  parseMessages,
  mergeMessages,
  importRecords,
  taskBuckets,
  lastEffective,
  leadGroups,
  revision,
} from "../services/followupDomain.ts";
import { applyFollowupBundle } from "../services/followupMutation.ts";
import type { Contact, ProgressRecord } from "../types.ts";
const base = () =>
  ({
    id: "c",
    nickname: "客户",
    remarkName: "客户",
    tags: [],
    progressHistory: [],
  }) as unknown as Contact;
const communication: ProgressRecord = {
  id: "r",
  date: "2026-11-20",
  kind: "communication",
  channel: "wechat",
  content: "保障表发来了，请核对",
  completed: true,
};
test("dates belong to each message; ambiguous relative dates never silently become today", () => {
  const rows = parseMessages(
    "2026年11月20日 09:00\n客户：保障够吗\n我：先核对\n2026-11-21 10:30\n客户：收到\n星期五 20:36\n客户：不确定",
  );
  assert.deepEqual(
    rows.map((r) => r.date),
    ["2026-11-20", "2026-11-20", "2026-11-21", ""],
  );
  assert.equal(parseMessages("昨天 10:30\n客户：收到")[0].date, "");
  assert.equal(parseMessages("2026-02-30\n客户：收到")[0].date, "");
});
test("known-time overlap merges by day; repeated untimed replies stay", () => {
  const rows = parseMessages("2026-11-20 09:00\n客户：收到");
  assert.equal(mergeMessages(rows, rows).length, 1);
  assert.equal(
    mergeMessages([{ ...rows[0], time: "" }], [{ ...rows[0], time: "" }])
      .length,
    2,
  );
  const c = base();
  let writes = importRecords(c, rows, { "2026-11-20": "客户确认收到。" });
  const saved = applyFollowupBundle(c, { writes });
  assert.equal(importRecords(saved, rows, {}).length, 0);
  writes = importRecords(
    saved,
    parseMessages("2026-11-20 10:00\n我：明天核对"),
    { "2026-11-20": "客户确认收到，我说明明天核对。" },
  );
  assert.equal(writes.length, 1);
  assert.equal(writes[0].record.chat?.messages?.length, 2);
  assert.equal(writes[0].record.id, saved.progressHistory![0].id);
});
test("today/overdue, future and undated are exclusive; legacy notes are not tasks", () => {
  const c = base();
  c.progressHistory = [
    communication,
    ...["2026-11-19", "2026-11-23", "2026-11-24", ""].map((date, i) => ({
      id: "t" + i,
      date,
      content: "任务" + i,
      kind: "task" as const,
      completed: false,
    })),
  ];
  const b = taskBuckets([c], "2026-11-23");
  assert.equal(b.now.length, 2);
  assert.equal(b.future.length, 1);
  assert.equal(b.undated.length, 1);
});
test("completion and result commit atomically; retries do not duplicate, undo keeps history", () => {
  const c = base(),
    task: ProgressRecord = {
      id: "t",
      kind: "task",
      date: "2026-11-23",
      content: "核对保障",
      completed: false,
    };
  c.progressHistory = [task];
  const writes = [
    { record: { ...task, completed: true }, expected: task },
    { record: communication, expected: null },
  ];
  const saved = applyFollowupBundle(c, { writes });
  assert.equal(saved.progressHistory?.length, 2);
  assert.equal(taskBuckets([saved], "2026-11-23").now.length, 0);
  assert.deepEqual(applyFollowupBundle(saved, { writes }), saved);
  const completed = saved.progressHistory!.find((r) => r.id === "t")!;
  const undo = applyFollowupBundle(saved, {
    writes: [
      { record: { ...completed, completed: false }, expected: completed },
    ],
  });
  assert.equal(undo.progressHistory?.length, 2);
  assert.equal(taskBuckets([undo], "2026-11-23").now.length, 1);
  assert.throws(() =>
    applyFollowupBundle(saved, {
      writes: [{ record: { ...task, content: "覆盖" }, expected: task }],
    }),
  );
  assert.equal(c.progressHistory.length, 1);
});
test("attempts and internal preparation do not count as effective contact", () => {
  const c = base();
  c.progressHistory = [
    communication,
    { ...communication, id: "attempt", channel: "attempt", date: "2026-11-22" },
    { ...communication, id: "prep", channel: "internal", date: "2026-11-23" },
  ];
  assert.equal(lastEffective(c, "2026-11-23"), "2026-11-20");
});
test("leads need exact evidence, respect waiting and corresponding tasks, and question threshold", () => {
  const c = base();
  c.progressHistory = [communication];
  c.followupAnalysis = {
    stage: "需求确认",
    blocker: "待核对",
    explanation: "",
    nextAction: "核对保障表",
    script: "",
    evidence: [{ recordId: "r", quote: "保障表发来了" }],
    opportunity: {
      type: "follow",
      trigger: "question",
      reason: "未答复",
      evidenceIds: ["r"],
    },
    revision: revision(c),
    generatedAt: "2026-11-23",
  };
  assert.equal(leadGroups([c], undefined, "2026-11-22").follow.length, 0);
  assert.equal(leadGroups([c], undefined, "2026-11-23").follow.length, 1);
  c.followupAnalysis.opportunity!.date = "2026-12-01";
  assert.deepEqual(leadGroups([c], undefined, "2026-11-30"), {
    follow: [],
    activate: [],
    check: [],
  });
  delete c.followupAnalysis.opportunity!.date;
  c.progressHistory.push({
    id: "t",
    kind: "task",
    date: "2026-11-23",
    content: "核对保障表",
    sourceRecordId: "r",
    completed: false,
  });
  c.followupAnalysis.revision = revision(c);
  assert.equal(leadGroups([c], undefined, "2026-11-23").follow.length, 0);
  c.progressHistory.pop();
  c.followupAnalysis.revision = revision(c);
  c.followupAnalysis.evidence[0].quote = "虚构";
  assert.equal(leadGroups([c], undefined, "2026-11-23").follow.length, 0);
});
