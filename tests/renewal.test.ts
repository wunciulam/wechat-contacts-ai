import { test } from "node:test";
import assert from "node:assert/strict";
import {
  mergePolicies,
  latestPayment,
  dueItems,
  parseWorkbook,
  candidates,
} from "../services/renewal.ts";
import * as XLSX from "xlsx";
const p: any = {
  id: "p",
  company: "A",
  policyNumber: "001",
  productName: "产品",
  status: "正式保单",
  applicant: "甲",
  insured: "乙",
  payments: [],
};
test("reimport keeps identity and overwrites one installment, retaining audit", () => {
  const a = {
    ...p,
    payments: [
      { date: "2026-11-01", amount: "20", status: "已缴费" },
      { date: "2025-11-01", amount: "20", status: "已缴费" },
    ],
  };
  const b = {
    ...p,
    id: "other",
    payments: [{ date: "2026-11-01", amount: "20", status: "未缴费" }],
  };
  const [r] = mergePolicies([a], [b, b]);
  assert.equal(r.id, "p");
  assert.equal(r.payments.length, 2);
  assert.equal(latestPayment(r)?.date, "2026-11-01");
  assert.equal(r.payments[1].history?.length, 1);
});
test("only latest unpaid installment; thirty-day window and inactive exclusions", () => {
  const a = {
    ...p,
    payments: [
      { date: "2025-11-01", amount: "20", status: "未缴费" },
      { date: "2026-11-01", amount: "20", status: "未缴费" },
    ],
  };
  assert.equal(dueItems([a], "2026-10-22").length, 1);
  assert.equal(dueItems([a], "2026-01-01").length, 0);
  assert.equal(dueItems([{ ...a, status: "撤单" }], "2026-10-22").length, 0);
});
test("duplicate status headers use policy status, not business category", () => {
  const wb = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(
    wb,
    XLSX.utils.aoa_to_sheet([
      ["保单号", " 保单状态 ", " 保单状态 ", "应缴费时间", "缴费状态"],
      ["001", "个寿", "正式保单", "2026-11-01", "未缴费"],
    ]),
    "表",
  );
  const [r] = parseWorkbook(
    XLSX.write(wb, { type: "array", bookType: "xlsx" }),
    "test",
  );
  assert.equal(r.status, "正式保单");
  assert.equal(r.payments[0].status, "未缴费");
});
test("name alone never auto-merges; contradictory identifiers rejected", () => {
  const c: any = {
    id: "a",
    remarkName: "甲",
    phoneNumber: "13812345678",
    idCard: "123456789012345678",
  };
  assert.equal(candidates("甲", undefined, undefined, [c])[0].strong, false);
  assert.equal(
    candidates("甲", "138****5678", "***1111", [c])[0].strong,
    false,
  );
  assert.equal(candidates("甲", "138****5678", "***5678", [c])[0].strong, true);
});

test("paid latest installment does not resurrect old unpaid history",()=>{assert.equal(latestPayment({...p,payments:[{date:"2025-11-01",amount:"20",status:"未缴费"},{date:"2026-11-01",amount:"20",status:"已缴费"}]}),undefined);});
