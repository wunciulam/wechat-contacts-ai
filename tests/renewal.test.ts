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

test("paid latest installment does not resurrect old unpaid history", () => {
  assert.equal(
    latestPayment({
      ...p,
      payments: [
        { date: "2025-11-01", amount: "20", status: "未缴费" },
        { date: "2026-11-01", amount: "20", status: "已缴费" },
      ],
    }),
    undefined,
  );
});

import {
  nextPayment,
  addMonths,
  projectContacts,
} from "../services/renewal.ts";
test("annual next payment is estimated and stops at payment term", () => {
  const a = {
    ...p,
    effectiveDate: "2024-02-29",
    paymentFrequency: "期交-年",
    paymentYears: "3年",
    payments: [{ date: "2025-02-28", amount: "100", status: "已缴费" }],
  };
  assert.equal(nextPayment(a)?.date, "2026-02-28");
  assert.equal(nextPayment(a)?.estimated, true);
  assert.equal(
    nextPayment({
      ...a,
      payments: [{ date: "2026-02-28", amount: "100", status: "已缴费" }],
    }),
    undefined,
  );
});
test("month end uses original anchor; explicit due dates win", () => {
  assert.equal(addMonths("2026-01-31", 1), "2026-02-28");
  assert.equal(addMonths("2026-01-31", 2), "2026-03-31");
  const a = {
    ...p,
    effectiveDate: "2026-01-31",
    paymentFrequency: "期交-月",
    paymentYears: "1年",
    payments: [{ date: "2026-02-28", amount: "10", status: "已缴费" }],
  };
  assert.equal(nextPayment(a)?.date, "2026-03-31");
  assert.equal(
    nextPayment({
      ...a,
      payments: [{ date: "2026-03-20", amount: "12", status: "未缴费" }],
    })?.date,
    "2026-03-20",
  );
});
test("single payment and incomplete term do not invent next date", () => {
  assert.equal(nextPayment({ ...p, paymentFrequency: "趸交" }), undefined);
  assert.equal(
    nextPayment({
      ...p,
      paymentFrequency: "期交-年",
      effectiveDate: "2024-01-01",
    }),
    undefined,
  );
});
test("both customer roles project same policy identity", () => {
  const cs: any = [
    { id: "a", policies: [] },
    { id: "b", policies: [] },
  ];
  const projected = projectContacts(
    cs,
    [{ ...p, applicantId: "a", insuredId: "b" }],
    true,
  );
  assert.equal(projected[0].policies?.[0], projected[1].policies?.[0]);
});

test("policy numbers with leading zero merge into the existing record", () => {
  const [merged] = mergePolicies([{...p, policyNumber:"2211805182135", id:"old"}], [{...p, policyNumber:"002211805182135", id:"export", paymentFrequency:"期交-年", payments:[{date:"2026-11-01", amount:"100", status:"未缴费"}]}]);
  assert.equal(merged.id,"old");
  assert.equal(merged.payments.length,1);
  assert.equal(merged.paymentFrequency,"期交-年");
});

import { remainingInstallments } from '../services/renewal.ts';
test('remaining installments include current due and stop at payment end', () => {
  const a = {...p, effectiveDate:'2024-02-29', paymentFrequency:'期交-年', paymentYears:'3年', payments:[{date:'2025-02-28',amount:'100',status:'未缴费'}]};
  assert.equal(remainingInstallments(a),2);
  assert.equal(remainingInstallments({...a,payments:[{date:'2025-02-28',amount:'100',status:'已缴费'}]}),1);
  assert.equal(remainingInstallments({...a,payments:[{date:'2026-02-28',amount:'100',status:'已缴费'}]}),0);
  assert.equal(remainingInstallments({...a,paymentYears:''}),undefined);
});


test("conflicting paid due date requires reconciliation instead of guessing its installment", () => {
  const policy = { ...p, effectiveDate: "2024-06-01", paymentFrequency: "期交-年", paymentYears: "10年", payments: [
    { date: "2025-06-01", amount: "2400", status: "已缴费" },
    { date: "2026-05-31", amount: "2400", status: "已缴费" },
  ] };
  assert.equal(nextPayment(policy), undefined);
});


test("actual confirmation date never moves the contractual next date", () => {
  const policy = { ...p, effectiveDate: "2024-06-01", paymentFrequency: "期交-年", paymentYears: "10年", payments: [
    { date: "2026-06-01", confirmedAt: "2026-05-20", amount: "2400", status: "已缴费" },
  ] };
  assert.equal(nextPayment(policy)?.date, "2027-06-01");
  assert.equal(nextPayment({ ...policy, payments: [{ ...policy.payments[0], confirmedAt: "2026-07-10" }] })?.date, "2027-06-01");
});

test('Mingya source identity preserves separate annual terms and old payment history', () => {
  const history={...p, effectiveDate:'2025-01-01', payments:[{date:'2026-01-01',amount:'20',status:'已缴费'}]};
  const source={...history, mingya:{key:'index:2025'},payments:[]};
  const newer={...p,id:'new',effectiveDate:'2026-01-01',mingya:{key:'index:2026'},payments:[]};
  const merged=mergePolicies([history],[source,newer] as any);
  assert.equal(merged.length,2);
  assert.equal(merged[0].payments.length,1);
  assert.equal(mergePolicies(merged,[source,newer] as any).length,2);
  const excel={...p,id:'random-excel-id',effectiveDate:'2026-01-01',payments:[]};
  assert.equal(mergePolicies(merged,[excel]).length,2);
});

test('unrecognized Mingya states do not create renewal alerts',()=>{
  assert.equal(dueItems([{...p,status:'明亚状态（23）',expiryDate:'2026-11-01',payments:[]}], '2026-11-01').length,0);
});

test('detail paid date resolves the old unpaid installment and shows the official next date as a reference',()=>{
  const policy:any={...p,effectiveDate:'2025-11-18',paymentFrequency:'期交-年',paymentYears:'10年',paymentEndDate:'2035-11-18',
    payments:[{date:'2026-11-18',amount:'12000.0000',status:'未缴费',history:[]}],
    mingya:{mappingVersion:2,capturedAt:'2026-11-21T03:35:47Z',nextPayDate:'2027-11-18',nextPremium:'12000',nextPremiumIsReference:true,lastPaidDate:'2026-11-18',lastPaidPremium:'12000'}};
  const next=nextPayment(policy)!;assert.equal(next.date,'2027-11-18');assert.equal(next.amount,'12000');assert.equal(next.amountReference,true);assert.equal(next.estimated,undefined);
  assert.equal(dueItems([policy],'2026-11-21').length,0);
  const merged=mergePolicies([policy],[policy]);assert.equal(merged[0].payments[0].status,'已缴费');assert.equal(merged[0].payments[0].paidAt,'2026-11-18');
  assert.equal(mergePolicies(merged,[merged[0]])[0].payments[0].history!.length,1);
});
test('manual payment changes after capture take priority over the old detail snapshot',()=>{
  const policy:any={...p,effectiveDate:'2025-11-18',paymentFrequency:'期交-年',paymentYears:'10年',
    payments:[{date:'2026-11-18',amount:'12000',status:'未缴费',history:[{at:'2026-11-21T05:00:00Z',source:'手动标记',from:'已缴费',to:'未缴费'}]}],
    mingya:{mappingVersion:2,capturedAt:'2026-11-21T03:35:47Z',nextPayDate:'2027-11-18',nextPremium:'12000',lastPaidDate:'2026-11-18',lastPaidPremium:'12000'}};
  assert.equal(nextPayment(policy)!.date,'2026-11-18');assert.equal(mergePolicies([policy],[policy])[0].payments[0].status,'未缴费');
});
test('merging a detail-paid installment preserves its source audit rather than turning it into a manual change',()=>{
 const old:any={...p,payments:[{date:'2026-11-18',amount:'12000',status:'未缴费',history:[]}]};
 const detail:any={...old,mingya:{mappingVersion:2,key:'sample',capturedAt:'2026-11-21T03:35:47Z'},payments:[{date:'2026-11-18',amount:'12000',status:'已缴费',source:'明亚保单详情',history:[{at:'2026-11-21T03:35:47Z',from:'未缴费',to:'已缴费',source:'明亚保单详情·上期实缴'}]}]};
 const result=mergePolicies([old],[detail]);assert.equal(result[0].payments[0].history!.length,1);assert.match(result[0].payments[0].history![0].source,/^明亚/);
});

test('policy workbook filters terminal and cancellation rows before checking identifiers',()=>{
 const book=XLSX.utils.book_new();XLSX.utils.book_append_sheet(book,XLSX.utils.aoa_to_sheet([
  ['保单号','保单状态'],['A','正式保单'],['','撤单'],['END','终止保单'],['PENDING','撤单中'],['SUSPEND','中止保单'],
 ]),'保单');
 const result=parseWorkbook(XLSX.write(book,{type:'array',bookType:'xlsx'}),'filter.xlsx');
 assert.deepEqual(result.map(p=>p.policyNumber),['A','PENDING','SUSPEND']);
});
test('Mingya workbook status codes use the verified cancellation mapping',()=>{
 const book=XLSX.utils.book_new();XLSX.utils.book_append_sheet(book,XLSX.utils.aoa_to_sheet([
  ['保单号','保单状态代码'],['A',16],['END',17],['CANCEL',22],['PENDING',21],
 ]),'保单');
 assert.deepEqual(parseWorkbook(XLSX.write(book,{type:'array',bookType:'xlsx'}),'codes.xlsx').map(p=>p.policyNumber),['A','PENDING']);
});
