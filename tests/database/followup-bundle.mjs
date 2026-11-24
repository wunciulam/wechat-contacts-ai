const { PGlite } = await import(
  process.env.PGLITE_MODULE || "@electric-sql/pglite"
);
import fs from "node:fs";
import assert from "node:assert/strict";
const db = new PGlite();
await db.exec(
  `create role anon;create role authenticated;create table app_data(id text primary key default gen_random_uuid()::text,app_id text,data_type text,data jsonb,updated_at timestamptz);`,
);
await db.exec(
  fs.readFileSync(
    new URL(
      "../../supabase/migrations/20261125000100_followup_bundle.sql",
      import.meta.url,
    ),
    "utf8",
  ),
);
await db.exec(
  fs.readFileSync(
    new URL(
      "../../supabase/migrations/20261122030239_skip_unchanged_followup_projection.sql",
      import.meta.url,
    ),
    "utf8",
  ),
);
await db.exec(
  "create trigger protect_contact_followups_v1 before update of data on app_data for each row when(new.data_type='contacts') execute function guard_contact_followups_v1();grant select,update,insert on app_data to anon;",
);
const task = {
  id: "t",
  kind: "task",
  content: "核对保障表",
  date: "2026-11-23",
  completed: false,
};
await db.query("insert into app_data values($1,$2,$3,$4,now())", [
  "row",
  "test",
  "contacts",
  JSON.stringify([{ id: "c", progressHistory: [task] }]),
]);
const record = {
  id: "r",
  kind: "communication",
  channel: "wechat",
  date: "2026-11-23",
  content: "客户发来了保障表",
  completed: true,
};
const bundle = {
  writes: [
    { record: { ...task, completed: true }, expected: task },
    { record, expected: null },
  ],
};
const save = async (b) =>
  (
    await db.query("select save_followup_bundle_v1($1,$2,$3) c", [
      "test",
      "c",
      JSON.stringify(b),
    ])
  ).rows[0].c;
await db.exec("set role anon");
const c = await save(bundle);
assert.equal(c.progressHistory.length, 2);
assert.equal(c.lastDate, "2026-11-23");
assert.deepEqual(await save(bundle), c);
await assert.rejects(
  save({ writes: [{ record: { ...task, content: "覆盖" }, expected: task }] }),
);
await assert.rejects(
  save({
    writes: [
      { record: { ...record, id: "valid" }, expected: null },
      { record: { ...record, id: "bad", date: "2026-02-30" }, expected: null },
    ],
  }),
);
const unchanged = (
  await db.query("select data from app_data where data_type='contacts'")
).rows[0].data;
assert.equal(unchanged[0].progressHistory.length, 2);
const completed = c.progressHistory.find((r) => r.id === "t");
const undo = await save({
  writes: [{ record: { ...completed, completed: false }, expected: completed }],
});
assert.equal(undo.progressHistory.length, 2);
assert.equal(undo.progressHistory.find((r) => r.id === "t").completed, false);
await assert.rejects(
  save({ writes: [{ record: { ...task, id: "duplicate" }, expected: null }] }),
);
await assert.rejects(
  save({ writes: [], analysis: { stage: "承保" }, sourceHistory: [] }),
);
console.log(
  "PASS SQL atomic completion, retry, conflict, rollback, undo, duplicate-task and stale-analysis checks",
);
await db.close();
