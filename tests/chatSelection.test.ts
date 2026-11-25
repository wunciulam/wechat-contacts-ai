import test from "node:test";
import assert from "node:assert/strict";
import {
  dragRect,
  intersects,
  applyMarquee,
  summarySelection,
} from "../services/chatSelection.ts";
import { lastEffective, revision } from "../services/followupDomain.ts";
test("marquee selects and cancels intersecting bubbles from an unchanged baseline in either drag direction", () => {
  const rect = dragRect(100, 100, 10, 10);
  assert.deepEqual(rect, { left: 10, top: 10, right: 100, bottom: 100 });
  assert.equal(
    intersects(rect, { left: 20, top: 20, right: 60, bottom: 60 }),
    true,
  );
  assert.equal(
    intersects(rect, { left: 101, top: 20, right: 120, bottom: 50 }),
    false,
  );
  const base = new Set(["a"]);
  assert.deepEqual([...applyMarquee(base, ["b"])], ["a", "b"]);
  assert.deepEqual([...applyMarquee(base, ["a"])], []);
  assert.deepEqual([...applyMarquee(base, ["a","b","b"])], ["b"]);
  assert.deepEqual([...base], ["a"]);
});
test("unreviewed selected text with known date and speaker can generate, unfinished unrelated rows never block it", () => {
  const messages: any = [
    {
      id: "a",
      date: "2026-11-25",
      speaker: "customer",
      text: "尚未逐字校对的原话",
      reviewRequired: true,
    },
    { id: "b", date: "", speaker: "self", text: "未注明日期" },
    { id: "c", date: "2026-11-25", speaker: "unknown", text: "说话人未知" },
    { id: "d", date: "2026-11-25", speaker: "self", text: "未勾选" },
  ];
  const selection = summarySelection(messages, new Set(["a", "b", "c"]));
  assert.equal(selection.ready.length, 1);
  assert.equal(selection.ready[0].id, "a");
  assert.equal(selection.ready[0].reviewRequired, true);
  assert.equal(selection.skipped, 2);
  assert.equal(summarySelection(messages, new Set(["a"])).skipped, 0);
});
test("deleted last history does not leave a phantom effective contact date; revision invalidates prior analysis", () => {
  const old: any = {
    lastDate: "2026-11-20",
    progressHistory: [{ id: "r", date: "2026-11-20", content: "原沟通" }],
  };
  const removed: any = {
    ...old,
    progressHistory: [],
    progressDeletedIds: ["r"],
  };
  assert.equal(lastEffective(old, "2026-11-25"), "2026-11-20");
  assert.equal(lastEffective(removed, "2026-11-25"), "");
  assert.notEqual(revision(removed), revision(old));
});
