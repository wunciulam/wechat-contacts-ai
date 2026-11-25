import React, { useEffect, useRef, useState } from "react";
import type { Category, Contact, ProgressRecord } from "../types";
import FollowupCustomerPanel from "./FollowupCustomerPanel";
import {
  FollowupResultDialog,
  FollowupScheduleDialog,
  type BundleSave,
} from "./FollowupDialogs";
import { analyzeCustomer } from "../services/followupAiClient";
import { revision, tasks } from "../services/followupDomain";
import { categoryIds } from "../services/contactIdentity";
import Tag from "./ui/Tag";
import Button from "./ui/Button";
export type CustomerTab = "followup" | "profile" | "policies";
export type CustomerRequest = {
  id: string;
  tab: CustomerTab;
  evidenceId?: string;
};
export default function CustomerDetailDialog({
  contact,
  initialTab,
  evidenceId,
  categories,
  onClose,
  onEdit,
  onImport,
  onSave,
  renderPolicies,
}: {
  key?: string;
  contact: Contact;
  initialTab: CustomerTab;
  evidenceId?: string;
  categories: Category[];
  onClose: () => void;
  onEdit: () => void;
  onImport: () => void;
  onSave: BundleSave;
  renderPolicies: () => React.ReactNode;
}) {
  const [tab, setTab] = useState(initialTab),
    [analyzing, setAnalyzing] = useState(false),
    [result, setResult] = useState<{ task?: ProgressRecord } | null>(null),
    [schedule, setSchedule] = useState<{
      text: string;
      source?: string;
    } | null>(null),
    [notice, setNotice] = useState(""),
    [undoId, setUndoId] = useState<string | null>(null);
  const live = useRef(contact),
    analysisRunning = useRef(false),
    undoRunning = useRef(false);
  live.current = contact;
  const [undoBusy, setUndoBusy] = useState(false),
    [undoError, setUndoError] = useState("");
  useEffect(() => {
    if (!notice || undoBusy || undoError) return;
    const timer = setTimeout(() => {
      setNotice("");
      setUndoId(null);
    }, 12000);
    return () => clearTimeout(timer);
  }, [notice, undoBusy, undoError]);
  async function undo() {
    if (undoRunning.current || !undoId) return;
    const task = live.current.progressHistory?.find((r) => r.id === undoId);
    if (!task) return;
    undoRunning.current = true;
    setUndoBusy(true);
    setUndoError("");
    try {
      await onSave(contact.id, {
        writes: [
          {
            record: { ...task, completed: false, completedAt: undefined },
            expected: task,
          },
        ],
      });
      setNotice("");
      setUndoId(null);
    } catch (e) {
      setUndoError(e instanceof Error ? e.message : "撤销失败，请重试。");
    } finally {
      undoRunning.current = false;
      setUndoBusy(false);
    }
  }
  async function analyze() {
    if (analysisRunning.current) return;
    analysisRunning.current = true;
    setAnalyzing(true);
    try {
      const snapshot = structuredClone(live.current);
      const analysis = await analyzeCustomer(snapshot);
      if (revision(live.current) !== revision(snapshot))
        throw Error("分析期间记录已变化，请重新更新。");
      await onSave(contact.id, {
        writes: [],
        analysis,
        sourceHistory: snapshot.progressHistory || [],
      });
    } finally {
      analysisRunning.current = false;
      setAnalyzing(false);
    }
  }
  function arranged(text: string, source?: string) {
    const old = tasks(live.current).find(
      (t) =>
        t.content === text || Boolean(source && t.sourceRecordId === source),
    );
    if (old) {
      document
        .getElementById("pending-" + old.id)
        ?.scrollIntoView({ block: "center" });
      return;
    }
    setSchedule({ text, source });
  }
  const data = [
    ["昵称", contact.nickname],
    ["微信号", contact.wxid],
    ["手机号", contact.phoneNumber],
    ["生日", contact.birthday],
    ["证件号", contact.idCard],
    ["地址", contact.address],
  ];
  const profile = (
    <div className="customer-profile-view">
      <div className="customer-profile-grid">
        {data.map(([label, value]) => (
          <div key={String(label)}>
            <small>{label}</small>
            <p>{String(value || "待补充")}</p>
          </div>
        ))}
      </div>
      <div className="customer-profile-grid customer-profile-groups">
        <div>
          <small>标签</small>
          <div className="customer-profile-tags">
            {contact.tags.length ? (
              contact.tags.map((tag) => <Tag key={tag}>{tag}</Tag>)
            ) : (
              <span>暂无标签</span>
            )}
          </div>
        </div>
        <div>
          <small>客户分类</small>
          <div className="customer-profile-tags">
            {categoryIds(contact).length ? (
              categoryIds(contact).map((id) => (
                <Tag key={id}>
                  {categories.find((c) => c.id === id)?.name || "未分类"}
                </Tag>
              ))
            ) : (
              <Tag>未分类</Tag>
            )}
          </div>
        </div>
        <div>
          <small>意向产品</small>
          <div className="customer-profile-tags">
            {contact.intentProducts?.length ? (
              contact.intentProducts.map((p) => <Tag key={p}>{p}</Tag>)
            ) : (
              <span>待补充</span>
            )}
          </div>
        </div>
        <div>
          <small>跟进状态</small>
          <p>
            {contact.followUpStatus === "following" ? "跟进中" : "暂未跟进"}
          </p>
        </div>
      </div>
      <div>
        <small>详细备注</small>
        <p className="whitespace-pre-wrap">{contact.remarkInfo || "待补充"}</p>
      </div>
    </div>
  );
  return (
    <>
      <FollowupCustomerPanel
        contact={contact}
        activeTab={tab}
        onTabChange={setTab}
        profileContent={profile}
        policyContent={tab === "policies" ? renderPolicies() : null}
        onClose={onClose}
        onEdit={onEdit}
        onImport={onImport}
        onWrite={() => setResult({})}
        onResult={(task) => setResult({ task })}
        onSchedule={arranged}
        onAnalyze={analyze}
        onSave={onSave}
        analyzing={analyzing}
        evidenceRecordId={evidenceId}
        feedback={
          notice ? (
            <div className="followup-success">
              <span role="status">{notice}</span>
              {undoId && (
                <Button variant="plain" disabled={undoBusy} onClick={undo}>
                  {undoBusy ? "撤销中…" : "撤销完成"}
                </Button>
              )}
              {undoError && <span role="alert">{undoError}</span>}
            </div>
          ) : null
        }
      />
      {result && (
        <FollowupResultDialog
          contact={contact}
          task={result.task}
          onSave={onSave}
          onClose={() => setResult(null)}
          onSaved={(_c, id) => {
            setResult(null);
            setNotice(id ? "结果已保存，待办已完成" : "结果已保存");
            setUndoId(id || null);
          }}
        />
      )}
      {schedule && (
        <FollowupScheduleDialog
          contact={contact}
          text={schedule.text}
          sourceRecordId={schedule.source}
          onSave={onSave}
          onClose={() => setSchedule(null)}
        />
      )}
    </>
  );
}
