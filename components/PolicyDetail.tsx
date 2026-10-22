import type { Contact } from "../types";
import React, { useState } from "react";
import { ManagedPolicy, nextPayment } from "../services/renewal";
export default function PolicyDetail({
  policy,
  contacts,
  busy,
  onSave,
  onMark,
}: {
  policy: ManagedPolicy;
  contacts: Contact[];
  busy: boolean;
  onSave: (p: ManagedPolicy) => Promise<boolean>;
  onMark: (date: string) => void;
}) {
  const [draft, setDraft] = useState(policy),
    [saved, setSaved] = useState(false);
  React.useEffect(() => setDraft(policy), [policy]);
  const next = nextPayment(draft);
  const fields: [keyof ManagedPolicy, string, string?][] = [
    ["productName", "产品名称"],
    ["company", "保险公司"],
    ["policyNumber", "保单号"],
    ["applicationNumber", "投保单号"],
    ["status", "保单状态"],
    ["premium", "保费"],
    ["applicant", "投保人"],
    ["insured", "被保人"],
    ["effectiveDate", "生效日期", "date"],
    ["paymentFrequency", "缴费方式"],
    ["paymentYears", "缴费期间"],
    ["paymentEndDate", "缴费结束日期（不含当天）", "date"],
    ["coveragePeriod", "保障期间"],
    ["expiryDate", "保障到期日", "date"],
    ["coverage", "保额"],
    ["insuranceType", "险种类型"],
  ];
  return (
    <>
      <h3 className="text-lg font-semibold">保单详情</h3>
      <p className="text-xs text-gray-400 mt-1 mb-5">
        缴费期限与保障期限分别记录；空缺信息可按保单补充。
      </p>
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-x-6 gap-y-4">
        {fields.map(([k, label, type]) => (
          <label key={k} className="text-xs text-gray-600">
            {label}
            {k === "applicant" || k === "insured" ? (
              <select className="input mt-1.5" value={draft[k === "applicant" ? "applicantId" : "insuredId"] || ""}
                onChange={e => {
                  const c = contacts.find(c => c.id === e.target.value);
                  setSaved(false);
                  setDraft({ ...draft, [k]: c ? c.remarkName || c.nickname : draft[k], [k === "applicant" ? "applicantId" : "insuredId"]: c?.id });
                }}>
                <option value="">{draft[k] || "选择关联客户"}</option>
                {contacts.map(c => <option key={c.id} value={c.id}>{c.remarkName || c.nickname}{c.phoneNumber ? ` · 尾号${String(c.phoneNumber).slice(-4)}` : ""}</option>)}
              </select>
            ) : k === "paymentFrequency" ? (
              <select
                className="input mt-1.5"
                value={draft.paymentFrequency || ""}
                onChange={(e) => {
                  setSaved(false);
                  setDraft({ ...draft, paymentFrequency: e.target.value });
                }}
              >
                {["", "期交-年", "期交-半年", "期交-季", "期交-月", "趸交"].map(
                  (x) => (
                    <option key={x} value={x}>
                      {x || "待补充"}
                    </option>
                  ),
                )}
              </select>
            ) : (
              <input
                readOnly={[
                  "policyNumber",
                  "company",
                  "applicant",
                  "insured",
                ].includes(k) && Boolean(policy[k])}
                className="input mt-1.5 read-only:bg-gray-50"
                type={type || "text"}
                value={String(draft[k] || "")}
                placeholder={
                  k === "paymentYears"
                    ? "例如：20年"
                    : k === "coveragePeriod"
                      ? "例如：终身、至70周岁"
                      : "待补充"
                }
                onChange={(e) => {
                  setSaved(false);
                  setDraft({
                    ...draft,
                    [k]: e.target.value,
                    ...(k === "expiryDate" ? { renewed: false } : {}),
                  });
                }}
              />
            )}
          </label>
        ))}
      </div>
      <div className="mt-6 p-4 bg-gray-50 rounded-lg border border-gray-100">
        <h4 className="text-sm font-semibold">下一次缴费</h4>
        {next ? (
          <p className="mt-2">
            {next.date}　¥ {next.amount}　
            {next.estimated ? "预计（按缴费周期推算）" : "来自应缴明细"}
          </p>
        ) : (
          <p className="text-gray-500 mt-2">
            暂无待缴记录；如仍在缴费期间，请补齐缴费方式和缴费期限。
          </p>
        )}
      </div>
      <div className="flex justify-end gap-3 mt-5 items-center">
        <span className="text-xs text-gray-500">{saved ? "已保存" : ""}</span>
        <button
          disabled={busy}
          className="btn btn-primary text-sm"
          onClick={async () => {
            if (await onSave(draft)) setSaved(true);
          }}
        >
          保存保单信息
        </button>
      </div>
      <details className="mt-6 border-t border-gray-100 pt-4" open>
        <summary className="font-medium cursor-pointer">
          缴费历史（{policy.payments.length}期）
        </summary>
        <div className="overflow-auto mt-3">
          <table className="w-full text-sm">
            <thead className="bg-gray-50 text-xs text-gray-500">
              <tr>
                <th className="p-3 text-left">应缴日期</th>
                <th className="p-3 text-left">金额</th>
                <th className="p-3 text-left">缴费状态</th>
                <th className="p-3 text-right">操作</th>
              </tr>
            </thead>
            <tbody>
              {[...policy.payments]
                .sort((a, b) => b.date.localeCompare(a.date))
                .map((q) => (
                  <React.Fragment key={q.date}>
                    <tr className="border-b border-gray-100">
                      <td className="p-3">{q.date}</td>
                      <td className="p-3">¥ {q.amount}</td>
                      <td className="p-3">{q.status}</td>
                      <td className="p-3 text-right">
                        <button
                          disabled={busy}
                          className="btn btn-secondary btn-sm"
                          onClick={() => onMark(q.date)}
                        >
                          {q.status === "已缴费" ? "改为未缴费" : "标记已缴费"}
                        </button>
                      </td>
                    </tr>
                    {!!q.history?.length && (
                      <tr>
                        <td colSpan={4}>
                          <details className="p-3 text-xs text-gray-500">
                            <summary>查看状态变更</summary>
                            {q.history.map((h, i) => (
                              <p key={i}>
                                {new Date(h.at).toLocaleString()} · {h.source} ·{" "}
                                {h.from} → {h.to}
                              </p>
                            ))}
                          </details>
                        </td>
                      </tr>
                    )}
                  </React.Fragment>
                ))}
            </tbody>
          </table>
          {!policy.payments.length && (
            <p className="text-gray-400 py-4">尚未导入应缴明细</p>
          )}
        </div>
      </details>
    </>
  );
}
