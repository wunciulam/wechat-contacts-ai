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
import ImportModal from "./ImportModal";
import Select from "./ui/Select";
import FollowupRecordDialog,{type MutateHistory} from "./FollowupRecordDialog";
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
  onSaveProfile,
  onOpenAiSettings,
  renderPolicies,
  onMutateHistory,
}: {
  onMutateHistory:MutateHistory;
  key?: string;
  contact: Contact;
  initialTab: CustomerTab;
  evidenceId?: string;
  categories: Category[];
  onClose: () => void;
  onEdit: () => void;
  onImport: () => void;
  onSave: BundleSave;
  onSaveProfile: (input: Contact, expected: Contact) => Promise<Contact>;
  onOpenAiSettings: () => void;
  renderPolicies: () => React.ReactNode;
}) {
  const [historyAction,setHistoryAction]=useState<{record:ProgressRecord;mode:"edit"|"delete"}|null>(null);
  const [tab, setTab] = useState(initialTab),
    [analyzing, setAnalyzing] = useState(false),
    [result, setResult] = useState<{ task?: ProgressRecord } | null>(null),
    [schedule, setSchedule] = useState<{
      text: string;
      source?: string;
    } | null>(null),
    [notice, setNotice] = useState(""),
    [undoId, setUndoId] = useState<string | null>(null);
  const [profileSnapshot, setProfileSnapshot] = useState(contact),
    [profileVersion, setProfileVersion] = useState(0),
    [profileNotice,setProfileNotice]=useState(""),
    [statusBusy, setStatusBusy] = useState(false),
    [statusError, setStatusError] = useState("");
  const canLeaveProfile = useRef<(() => boolean) | null>(null),
    profileSaved = useRef<Contact | null>(null);
  const registerCanLeave = React.useCallback((fn: (() => boolean) | null) => {
    canLeaveProfile.current = fn;
  }, []);
  const guard = () =>
    !statusBusy &&
    (tab !== "profile" ||
      !canLeaveProfile.current ||
      canLeaveProfile.current());
  const switchTab = (next: CustomerTab) => {
    if (next === tab || !guard()) return;
    if (next === "profile") setProfileSnapshot(live.current);
    setTab(next);
  };
  useEffect(()=>{if(!profileNotice)return;const timer=setTimeout(()=>setProfileNotice(""),4000);return()=>clearTimeout(timer);},[profileNotice]);
  const resetProfile = () => {
    setProfileNotice(profileSaved.current?"已保存":"");
    setProfileSnapshot(profileSaved.current || live.current);
    profileSaved.current = null;
    setProfileVersion((v) => v + 1);
  };
  async function changeStatus(value: string) {
    if (statusBusy || value === contact.followUpStatus) return;
    setStatusBusy(true);
    setStatusError("");
    try {
      await onSaveProfile(
        { ...live.current, followUpStatus: value as "idle" | "following" },
        live.current,
      );
    } catch (e) {
      setStatusError(e instanceof Error ? e.message : "状态未保存，请重试。");
    } finally {
      setStatusBusy(false);
    }
  }
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
  const profile = (
    <ImportModal
      key={profileVersion}
      embedded
      saveFeedback={profileNotice}
      profileOnly
      isOpen
      initialData={profileSnapshot}
      categories={categories}
      allTags={contact.tags}
      registerCanLeave={registerCanLeave}
      onClose={resetProfile}
      onSave={async (rows) => {
        const saved = await onSaveProfile(
          { ...profileSnapshot, ...rows[0] },
          profileSnapshot,
        );
        profileSaved.current = saved;
      }}
    />
  );
  return (
    <>
      <FollowupCustomerPanel
        contact={contact}
        onDeleteTask={(_id,task)=>onMutateHistory("delete",task,task)}
        activeTab={tab}
        onTabChange={switchTab}
        profileContent={profile}
        policyContent={tab === "policies" ? renderPolicies() : null}
        onClose={() => {
          if (guard()) onClose();
        }}
        onEdit={onEdit}
        onImport={onImport}
        onHistoryEdit={record=>setHistoryAction({record,mode:"edit"})}
        onHistoryDelete={record=>setHistoryAction({record,mode:"delete"})}
        onWrite={() => setResult({})}
        onResult={(task) => setResult({ task })}
        onSchedule={arranged}
        onAnalyze={analyze}
        onSave={onSave}
        analyzing={analyzing}
        evidenceRecordId={evidenceId}
        closeDisabled={statusBusy}
        onOpenAiSettings={onOpenAiSettings}
        followupStatusControl={
          <div className="customer-followup-status">
            <Select
              aria-label="跟进状态"
              value={contact.followUpStatus || "idle"}
              disabled={statusBusy}
              onValueChange={changeStatus}
            >
              <option value="following">跟进中</option>
              <option value="idle">暂未跟进</option>
            </Select>
            {statusError && (
              <span role="alert" className="text-xs text-danger-600">
                {statusError}
              </span>
            )}
          </div>
        }
        feedback={
          notice ? (
            <div className="followup-success">
              <span role="status">{notice}</span>
              {undoId && (
                <Button variant="text" disabled={undoBusy} onClick={undo}>
                  {undoBusy ? "撤销中…" : "撤销完成"}
                </Button>
              )}
              {undoError && <span role="alert">{undoError}</span>}
            </div>
          ) : null
        }
      />
      {historyAction&&<FollowupRecordDialog record={historyAction.record} mode={historyAction.mode} onMutate={onMutateHistory} onClose={()=>setHistoryAction(null)} onSaved={()=>{setNotice(historyAction.mode==="delete"?"记录已删除":"记录已更新");setUndoId(null);setHistoryAction(null);}}/>}
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
