import Button from './ui/Button';
import PolicyFieldsForm, {policyFields} from './PolicyFieldsForm';
import MingyaPolicyDetailModal from './MingyaPolicyDetailModal';
import { createPortal } from 'react-dom';
import { DialogFooterContext } from './WorkspaceDialog';
import PolicyPaymentSummary, { formatMoney } from './PolicyPaymentSummary';
import { Edit2, Save } from 'lucide-react';
import type { Contact } from "../types";
import React, { useState } from "react";
import { ManagedPolicy, nextPayment } from "../services/renewal";
export default function PolicyDetail({
  policy,
  contacts,
  busy,
  onSave,
  onMark,
  onDirtyChange,
}: {
  policy: ManagedPolicy;
  contacts: Contact[];
  busy: boolean;
  onSave: (p: ManagedPolicy) => Promise<boolean>;
  onMark: (date: string) => void;
  onDirtyChange?: (dirty: boolean) => void;
}) {
  const footer = React.useContext(DialogFooterContext);
  const [sourceOpen,setSourceOpen]=useState(false);
  const [editing, setEditing] = useState(false);
  const [draft, setDraft] = useState(policy),
    [saved, setSaved] = useState(false);
  React.useEffect(() => setDraft(policy), [policy]);
  React.useEffect(() => { onDirtyChange?.(editing && JSON.stringify(draft) !== JSON.stringify(policy)); }, [draft, policy, editing, onDirtyChange]);
  const fields = policyFields;
  return (
    <>

      <div className="mb-5 flex flex-wrap items-center justify-between gap-3">
        <div><h3 className="text-sm font-semibold">{policy.productName || '保单信息'}</h3><p className="mt-1 text-xs text-gray-500">{policy.policyNumber}</p></div>
        {!editing && <Button className="" onClick={() => setEditing(true)} variant="secondary"><Edit2 size={16}/>编辑资料</Button>}
      </div>
      {policy.mingya && <Button className="mb-4" onClick={() => setSourceOpen(true)} variant="secondary">明亚采集详情</Button>}
      <MingyaPolicyDetailModal policy={sourceOpen ? policy : null} onClose={() => setSourceOpen(false)} />
      <section className="mb-5 rounded-lg border border-gray-200 bg-gray-50 p-4">
        <h4 className="mb-2 text-xs font-medium text-gray-500">下一次缴费</h4>
        <PolicyPaymentSummary policy={policy}/>
      </section>
      {!editing && <dl className="grid grid-cols-1 gap-x-6 gap-y-4 sm:grid-cols-2">
        {fields.filter(([key]) => !['productName','policyNumber'].includes(key)).map(([key,label]) => <div key={key}>
          <dt className="text-xs text-gray-500">{label}</dt>
          <dd className="mt-1 break-words text-sm">{key === 'premium' ? formatMoney(policy[key], policy.mingya?.currency) : String(policy[key] ?? '') || '待补充'}</dd>
        </div>)}
      </dl>}
      {editing && <>
      <PolicyFieldsForm value={draft} onChange={p=>{setSaved(false);setDraft(p);}} contacts={contacts} identityReadonly disabled={busy}/>
      {footer && createPortal(<div className="flex justify-end gap-3 border-t border-gray-100 bg-white px-5 py-4 items-center">
        <span className="text-xs text-gray-500">{saved ? "已保存" : ""}</span>
        <Button className="" disabled={busy} onClick={() => { setDraft(policy); setEditing(false); }} variant="secondary">取消</Button>
        <Button
          disabled={busy}
          className=""
          onClick={async () => {
            if (await onSave(draft)) { setSaved(true); setEditing(false); }
          }} variant="primary" validate
        >
          <Save size={16}/> {busy ? "正在保存…" : "保存保单信息"}
        </Button>
      </div>, footer)}
      </>}
      {saved && !editing && <p role="status" className="mt-3 text-sm text-gray-600">保单资料已保存</p>}
      <details className="mt-6 border-t border-gray-100 pt-4" open>
        <summary className="font-medium cursor-pointer">
          缴费历史（{policy.payments.length}期）
        </summary>
        <div className="overflow-auto mt-3">
          <table className="w-full min-w-[520px] text-sm">
            <thead className="bg-gray-50 text-xs text-gray-500">
              <tr>
                <th className="p-3 text-left">应缴日期</th>
                <th className="p-3 text-left">实缴日期</th>
                <th className="p-3 text-right">金额</th>
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
                      <td className="p-3 whitespace-nowrap">{q.date}</td>
                      <td className="p-3 whitespace-nowrap">{q.paidAt || '—'}</td>
                      <td className="p-3 whitespace-nowrap text-right tabular-nums">{formatMoney(q.amount, policy.mingya?.currency)}</td>
                      <td className="p-3">{q.status}</td>
                      <td className="p-3 text-right">
                        <Button
                          disabled={busy}
                          className=""
                          onClick={() => onMark(q.date)} variant="secondary" size="sm"
                        >
                          {q.status === "已缴费" ? "改为未缴费" : "标记已缴费"}
                        </Button>
                      </td>
                    </tr>
                    {!!q.history?.length && (
                      <tr>
                        <td colSpan={5}>
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
