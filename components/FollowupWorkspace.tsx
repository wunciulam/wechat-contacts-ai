import React, { useEffect, useRef, useState } from "react";
import {
  CalendarDays,
  CalendarRange,
  Check,
  ChevronDown,
  ChevronRight,
  CircleAlert,
  ListTodo,
  MessageSquare,
  RotateCcw,
  Settings2,
  Sparkles,
  UserRoundSearch,
} from "lucide-react";
import type { Contact, ProgressRecord, FollowupRules } from "../types";
import {
  DEFAULT_RULES,
  taskBuckets,
  leadGroups,
  notes,
  tasks,
  revision,
  addDays,
  lastEffective,
} from "../services/followupDomain";
import { chinaDate, isChatDate } from "../services/chatAnalysis";
import { analyzeCustomer } from "../services/followupAiClient";
import { loadFromCloud, saveToCloud } from "../services/supabaseService";
import Button from "./ui/Button";
import Input from "./ui/Input";
import WorkspaceDialog, { WorkspaceDialogFooter } from "./WorkspaceDialog";
import { PageHeader } from "./PageHeader";
import {
  FollowupResultDialog,
  FollowupScheduleDialog,
  FollowupRulesDialog,
  type BundleSave,
} from "./FollowupDialogs";
import FollowupCustomerPanel, {
  FollowupAvatar,
  FollowupTaskDate,
} from "./FollowupCustomerPanel";
type TaskEntry = { contactId: string; task: ProgressRecord };
export default function FollowupWorkspace({
  contacts,
  onSave,
  onImport,
  onEdit,
  renderCategories,
}: {
  contacts: Contact[];
  onSave: BundleSave;
  onImport: (id?: string) => void;
  onEdit: (c: Contact) => void;
  renderCategories: (open: (c: Contact) => void) => React.ReactNode;
}) {
  const [tab, setTab] = useState<"leads" | "categories">("leads"),
    [filter, setFilter] = useState("all"),
    [future, setFuture] = useState(false),
    [later, setLater] = useState(false),
    [rules, setRules] = useState<FollowupRules>(DEFAULT_RULES),
    [showRules, setShowRules] = useState(false);
  const [customerId, setCustomerId] = useState<string | null>(null),
    [evidenceId, setEvidenceId] = useState<string | undefined>(),
    [result, setResult] = useState<TaskEntry | null>(null),
    [manual, setManual] = useState<string | null>(null),
    [schedule, setSchedule] = useState<{
      contactId: string;
      text: string;
      source?: string;
    } | null>(null),
    [evidence, setEvidence] = useState<Contact | null>(null),
    [snooze, setSnooze] = useState<Contact | null>(null),
    [snoozeDate, setSnoozeDate] = useState(() => addDays(chinaDate(), 7)),
    [snoozeBusy, setSnoozeBusy] = useState(false),
    [snoozeError, setSnoozeError] = useState("");
  const [analyzing, setAnalyzing] = useState<string | null>(null),
    [busy, setBusy] = useState(false),
    [error, setError] = useState(""),
    [message, setMessage] = useState(""),
    [undo, setUndo] = useState<{ contactId: string; taskId: string } | null>(
      null,
    ),
    [today, setToday] = useState(chinaDate),
    [lastUpdate, setLastUpdate] = useState("");
  const live = useRef(contacts);
  live.current = contacts;
  const busyRef = useRef(false),
    noticeTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const buckets = taskBuckets(contacts, today),
    leads = leadGroups(contacts, rules, today),
    overdue = buckets.now.filter((x) => x.task.date < today),
    todayTasks = buckets.now.filter((x) => x.task.date === today),
    futureSoon = buckets.future.filter((x) => x.task.date <= addDays(today, 7)),
    futureLater = buckets.future.filter((x) => x.task.date > addDays(today, 7));
  const selected = contacts.find((c) => c.id === customerId),
    newData = contacts.some(
      (c) =>
        notes(c).length &&
        (!c.followupAnalysis || c.followupAnalysis.revision !== revision(c)),
    );
  useEffect(() => {
    const timer = setInterval(() => setToday(chinaDate()), 30000);
    loadFromCloud("followup_rules_v1")
      .then((v) => {
        if (
          v &&
          ["unanswered", "following", "paused"].every(
            (k) => Number.isInteger(v[k]) && v[k] > 0 && v[k] <= 365,
          )
        )
          setRules(v);
      })
      .catch(() => {});
    return () => {
      clearInterval(timer);
      if (noticeTimer.current) clearTimeout(noticeTimer.current);
    };
  }, []);
  async function refreshOne(c: Contact, signal?: AbortSignal) {
    setAnalyzing(c.id);
    try {
      const snapshot = structuredClone(c);
      const analysis = await analyzeCustomer(snapshot, signal);
      if (signal?.aborted) return;
      if (
        !live.current.find((x) => x.id === c.id) ||
        revision(live.current.find((x) => x.id === c.id)!) !==
          revision(snapshot)
      )
        throw Error("分析期间有新记录，请重新更新。");
      await onSave(c.id, {
        writes: [],
        analysis,
        sourceHistory: snapshot.progressHistory || [],
      });
    } finally {
      setAnalyzing(null);
    }
  }
  async function refresh() {
    if (busyRef.current) return;
    busyRef.current = true;
    setBusy(true);
    setError("");
    try {
      const list = live.current.filter(
        (c) =>
          notes(c).length &&
          (!c.followupAnalysis || c.followupAnalysis.revision !== revision(c)),
      );
      if (!list.length) {
        setMessage("当前线索已是最新。");
        return;
      }
      for (const c of list) await refreshOne(c);
      setLastUpdate(
        new Date().toLocaleTimeString("zh-CN", {
          hour: "2-digit",
          minute: "2-digit",
        }),
      );
    } catch (e) {
      setError(e instanceof Error ? e.message : "线索未更新，请重试。");
    } finally {
      busyRef.current = false;
      setBusy(false);
    }
  }
  useEffect(() => {
    let cancelled = false,
      owns = false;
    const ctl = new AbortController();
    const key = "followup-daily:" + import.meta.env.VITE_APP_ID;
    void (async () => {
      try {
        if (localStorage.getItem(key) === today) return;
        const status = await fetch("/api/followup-ai").then((r) => r.json());
        if (!status.configured || cancelled || busyRef.current) return;
        busyRef.current = true;
        owns = true;
        setBusy(true);
        let failed = false;
        for (const c of live.current) {
          if (cancelled) break;
          if (!notes(c).length || c.followupAnalysis?.revision === revision(c))
            continue;
          try {
            await refreshOne(c, ctl.signal);
          } catch {
            failed = true;
            break;
          }
        }
        if (!cancelled && !failed) localStorage.setItem(key, today);
      } catch {
      } finally {
        if (owns) {
          busyRef.current = false;
          if (!cancelled) setBusy(false);
        }
      }
    })();
    return () => {
      cancelled = true;
      ctl.abort();
    };
  }, [today]);
  function open(c: Contact, id?: string) {
    setEvidenceId(id);
    setCustomerId(c.id);
  }
  function scheduleFor(c: Contact, text?: string, source?: string) {
    const action = text || c.followupAnalysis?.nextAction || "";
    const old = tasks(c).find(
      (t) => t.content === action || (source && t.sourceRecordId === source),
    );
    if (old) {
      open(c);
      return;
    }
    setSchedule({
      contactId: c.id,
      text: action,
      source: source || c.followupAnalysis?.evidence[0]?.recordId,
    });
  }
  function saved(c: Contact, taskId?: string) {
    setResult(null);
    setManual(null);
    setMessage(taskId ? "结果已保存，待办已完成" : "结果已保存到跟进历史");
    setUndo(taskId ? { contactId: c.id, taskId } : null);
    if (noticeTimer.current) clearTimeout(noticeTimer.current);
    noticeTimer.current = setTimeout(() => {
      setMessage("");
      setUndo(null);
    }, 12000);
  }
  async function undoTask() {
    if (!undo) return;
    const c = live.current.find((c) => c.id === undo.contactId),
      task = c?.progressHistory?.find((r) => r.id === undo.taskId);
    if (!c || !task) return;
    try {
      await onSave(c.id, {
        writes: [
          {
            record: { ...task, completed: false, completedAt: undefined },
            expected: task,
          },
        ],
      });
      setUndo(null);
      setMessage("已恢复待办，沟通历史保留。");
    } catch (e) {
      setError(e instanceof Error ? e.message : "恢复失败，请重试。");
    }
  }
  const taskRow = ({
    contact,
    task,
  }: {
    contact: Contact;
    task: ProgressRecord;
  }) => (
    <div key={task.id} className="followup-task-row">
      <label className="followup-task-check">
        <input
          type="checkbox"
          checked={false}
          aria-label={"完成待办：" + task.content}
          onChange={() => setResult({ contactId: contact.id, task })}
        />
      </label>
      <Button
        variant="plain"
        className="followup-task-customer"
        onClick={() => open(contact)}
      >
        <FollowupAvatar contact={contact} />
        <strong>{contact.remarkName || contact.nickname}</strong>
      </Button>
      <div className="followup-task-copy">
        <h3>{task.content}</h3>
        <p>{notes(contact)[0]?.content || "尚无沟通记录"}</p>
      </div>
      <FollowupTaskDate
        task={task}
        onDate={(date) =>
          onSave(contact.id, {
            writes: [{ record: { ...task, date }, expected: task }],
          }).then(() => {})
        }
      />
    </div>
  );
  const leadCard = (c: Contact, type: "follow" | "reactivate" | "check") => (
    <article key={c.id} className="followup-lead">
      <Button
        variant="plain"
        className="followup-lead-name"
        onClick={() => open(c)}
      >
        <FollowupAvatar contact={c} />
        <strong>{c.remarkName || c.nickname}</strong>
      </Button>
      {type === "check" ? (
        <p>{lastEffective(c, today)}后未记录有效沟通，先核对需求与联系约定。</p>
      ) : (
        <>
          <h3>{c.followupAnalysis?.nextAction}</h3>
          <p>{c.followupAnalysis?.opportunity?.reason}</p>
          <Button
            variant="plain"
            className="followup-text-action"
            onClick={() => setEvidence(c)}
          >
            查看依据
          </Button>
        </>
      )}
      <div className="followup-lead-action">
        <Button
          size="sm"
          className="w-full"
          onClick={() =>
            type === "check"
              ? open(c)
              : scheduleFor(
                  c,
                  c.followupAnalysis?.nextAction,
                  c.followupAnalysis?.evidence[0]?.recordId,
                )
          }
        >
          {type === "check" ? "查看待检查客户" : "安排跟进"}
        </Button>
      </div>
    </article>
  );
  const countCards = [
    {
      key: "overdue",
      count: overdue.length,
      unit: "项",
      label: "逾期待办",
      Icon: CircleAlert,
    },
    {
      key: "today",
      count: todayTasks.length,
      unit: "项",
      label: "今日待办",
      Icon: CalendarDays,
    },
    {
      key: "follow",
      count: leads.follow.length,
      unit: "人",
      label: "值得跟进",
      Icon: MessageSquare,
    },
    {
      key: "reactivate",
      count: leads.activate.length,
      unit: "人",
      label: "可以激活",
      Icon: RotateCcw,
    },
  ];
  return (
    <div className="followup-workspace">
      <div className="followup-workspace-header">
        <PageHeader
          workbench
          title="跟进工作台"
          className="followup-page-header"
          actionButton={
            <>
              <Button size="sm" onClick={() => onImport()}>
                导入聊天
              </Button>
              <Button
                size="sm"
                variant={newData ? "primary" : "secondary"}
                disabled={busy || !!analyzing}
                onClick={refresh}
              >
                {busy ? "更新中…" : "更新线索"}
              </Button>
              <Button
                variant="plain"
                className="followup-rules-action"
                onClick={() => setShowRules(true)}
              >
                <Settings2 size={16} />
                提醒规则
              </Button>
            </>
          }
        />
      </div>
      <div className="followup-tabs">
        <div role="tablist" aria-label="工作台视图">
          <Button
            variant="plain"
            role="tab"
            aria-selected={tab === "leads"}
            onClick={() => setTab("leads")}
          >
            跟进线索
          </Button>
          <Button
            variant="plain"
            role="tab"
            aria-selected={tab === "categories"}
            onClick={() => setTab("categories")}
          >
            客户分类
          </Button>
        </div>
        <small>
          截至{today}
          {lastUpdate ? "　" + lastUpdate + "更新" : ""}
        </small>
      </div>
      {tab === "categories" ? (
        <div className="followup-category-view">
          {renderCategories((c) => open(c))}
        </div>
      ) : (
        <div className="followup-home-content">
          {error && (
            <p role="alert" className="text-sm text-danger-600">
              {error}
            </p>
          )}
          <div className="followup-stats">
            {countCards.map(({ key, count, unit, label, Icon }) => (
              <Button
                key={key}
                variant="plain"
                className="followup-stat"
                aria-pressed={filter === key}
                onClick={() => setFilter(filter === key ? "all" : key)}
              >
                <div>
                  <strong
                    className={
                      key === "overdue" && count ? "text-danger-600" : ""
                    }
                  >
                    {count}
                  </strong>
                  <span>{unit}</span>
                  <Icon size={18} />
                </div>
                <small>{label}</small>
              </Button>
            ))}
          </div>
          {message && (
            <div role="status" className="followup-success">
              <Check size={16} />
              <span>{message}</span>
              {undo && (
                <Button variant="plain" onClick={undoTask}>
                  撤销完成
                </Button>
              )}
            </div>
          )}
          {filter !== "all" && (
            <div className="flex items-center justify-between text-xs">
              <span>仅看{countCards.find((c) => c.key === filter)?.label}</span>
              <Button variant="plain" onClick={() => setFilter("all")}>
                返回全部
              </Button>
            </div>
          )}
          {["all", "today", "overdue"].includes(filter) && (
            <section className="followup-panel">
              <div className="followup-module-heading">
                <ListTodo size={16} />
                <h3>现在要处理</h3>
              </div>
              {(filter === "overdue"
                ? overdue
                : filter === "today"
                  ? todayTasks
                  : buckets.now
              ).map(taskRow)}
              {!(
                filter === "overdue"
                  ? overdue
                  : filter === "today"
                    ? todayTasks
                    : buckets.now
              ).length && <p className="followup-empty">暂无需要处理的任务</p>}
            </section>
          )}
          {filter === "all" && buckets.future.length > 0 && (
            <section className="followup-panel followup-future">
              <Button
                variant="plain"
                className="followup-future-toggle"
                aria-expanded={future}
                onClick={() => setFuture(!future)}
              >
                <CalendarRange size={16} />
                <span>之后有安排</span>
                <small>
                  {buckets.future.length} 项，最近
                  {buckets.future[0].task.date === addDays(today, 1)
                    ? "明天"
                    : buckets.future[0].task.date}
                </small>
                {future ? (
                  <ChevronDown size={16} />
                ) : (
                  <ChevronRight size={16} />
                )}
              </Button>
              {future && (
                <div>
                  <h4 className="text-xs text-gray-500 py-3">未来7天</h4>
                  {futureSoon.map(taskRow)}
                  {!futureSoon.length && (
                    <p className="followup-empty">未来7天暂无安排</p>
                  )}
                  {futureLater.length > 0 && (
                    <details>
                      <summary className="text-xs text-gray-500 py-3 cursor-pointer">
                        更晚 {futureLater.length} 项
                      </summary>
                      {futureLater.map(taskRow)}
                    </details>
                  )}
                </div>
              )}
            </section>
          )}
          {filter === "all" && buckets.undated.length > 0 && (
            <details className="followup-panel">
              <summary className="text-xs text-gray-500 cursor-pointer">
                待安排日期 {buckets.undated.length} 项
              </summary>
              {buckets.undated.map(taskRow)}
            </details>
          )}
          {["all", "follow", "reactivate"].includes(filter) && (
            <div className="followup-lead-columns">
              {(filter === "all" || filter === "follow") && (
                <section className="followup-panel">
                  <div className="followup-module-heading">
                    <Sparkles size={16} />
                    <h3>值得跟进</h3>
                    <span>{leads.follow.length} 人</span>
                  </div>
                  {leads.follow.map((c) => leadCard(c, "follow"))}
                  {!leads.follow.length && (
                    <p className="followup-empty">暂无有依据的跟进线索</p>
                  )}
                </section>
              )}
              {(filter === "all" || filter === "reactivate") && (
                <section className="followup-panel">
                  <div className="followup-module-heading">
                    <RotateCcw size={16} />
                    <h3>可以激活</h3>
                    <span>{leads.activate.length} 人</span>
                  </div>
                  {leads.activate.map((c) => leadCard(c, "reactivate"))}
                  {!leads.activate.length && (
                    <p className="followup-empty">暂无符合条件的激活线索</p>
                  )}
                </section>
              )}
              {filter === "all" && (
                <section className="followup-panel">
                  <div className="followup-module-heading">
                    <UserRoundSearch size={16} />
                    <h3>长期未联系，待检查</h3>
                    <span>{leads.check.length} 人</span>
                  </div>
                  {leads.check.map((c) => leadCard(c, "check"))}
                  {!leads.check.length && (
                    <p className="followup-empty">暂无待检查客户</p>
                  )}
                </section>
              )}
            </div>
          )}
        </div>
      )}
      {selected && (
        <FollowupCustomerPanel
          contact={selected}
          onClose={() => setCustomerId(null)}
          onEdit={() => {
            setCustomerId(null);
            onEdit(selected);
          }}
          onImport={() => onImport(selected.id)}
          onWrite={() => setManual(selected.id)}
          onResult={(task) => setResult({ contactId: selected.id, task })}
          onSchedule={(text, source) => scheduleFor(selected, text, source)}
          onAnalyze={() => refreshOne(selected)}
          onSave={onSave}
          analyzing={analyzing === selected.id}
          evidenceRecordId={evidenceId}
        />
      )}
      {result && contacts.find((c) => c.id === result.contactId) && (
        <FollowupResultDialog
          contact={contacts.find((c) => c.id === result.contactId)!}
          task={result.task}
          onSave={onSave}
          onClose={() => setResult(null)}
          onSaved={saved}
        />
      )}
      {manual && contacts.find((c) => c.id === manual) && (
        <FollowupResultDialog
          contact={contacts.find((c) => c.id === manual)!}
          onSave={onSave}
          onClose={() => setManual(null)}
          onSaved={saved}
        />
      )}
      {schedule && contacts.find((c) => c.id === schedule.contactId) && (
        <FollowupScheduleDialog
          contact={contacts.find((c) => c.id === schedule.contactId)!}
          text={schedule.text}
          sourceRecordId={schedule.source}
          onSave={onSave}
          onClose={() => setSchedule(null)}
        />
      )}
      {showRules && (
        <FollowupRulesDialog
          rules={rules}
          onSave={async (value) => {
            if (!(await saveToCloud("followup_rules_v1", value)))
              throw Error("规则未保存，请重试。");
            setRules(value);
          }}
          onClose={() => setShowRules(false)}
        />
      )}
      {evidence && (
        <WorkspaceDialog
          title={evidence.remarkName || evidence.nickname}
          subtitle="线索依据"
          compact
          onClose={() => setEvidence(null)}
        >
          <div className="space-y-5">
            <h3 className="text-base font-semibold">
              {evidence.followupAnalysis?.opportunity?.reason}
            </h3>
            {evidence.followupAnalysis?.evidence.map((e, i) => (
              <div key={i} className="followup-evidence-quote">
                <small>
                  {notes(evidence).find((r) => r.id === e.recordId)?.date}
                </small>
                <blockquote>{e.quote}</blockquote>
                <Button
                  variant="plain"
                  onClick={() => {
                    open(evidence, e.recordId);
                    setEvidence(null);
                  }}
                >
                  查看这次跟进记录
                </Button>
              </div>
            ))}
            <div>
              <small className="text-xs text-gray-500">建议行动</small>
              <p className="mt-2 text-sm font-medium">
                {evidence.followupAnalysis?.nextAction}
              </p>
            </div>
          </div>
          <WorkspaceDialogFooter>
            <Button
              onClick={() => {
                setSnooze(evidence);
                setEvidence(null);
              }}
            >
              稍后提醒
            </Button>
            <Button
              variant="primary"
              onClick={() => {
                scheduleFor(evidence);
                setEvidence(null);
              }}
            >
              安排跟进
            </Button>
          </WorkspaceDialogFooter>
        </WorkspaceDialog>
      )}
      {snooze && (
        <WorkspaceDialog
          title={snooze.remarkName || snooze.nickname}
          subtitle="稍后提醒"
          compact
          onClose={() => {
            if (!snoozeBusy) setSnooze(null);
          }}
          closeDisabled={snoozeBusy}
        >
          <label className="block text-xs text-gray-500 mb-2">
            再次提醒日期
          </label>
          <Input
            type="date"
            value={snoozeDate}
            onChange={(e) => setSnoozeDate(e.target.value)}
          />
          <WorkspaceDialogFooter>
            {snoozeError && (
              <p role="alert" className="w-full text-sm text-danger-600">
                {snoozeError}
              </p>
            )}
            <Button disabled={snoozeBusy} onClick={() => setSnooze(null)}>
              取消
            </Button>
            <Button
              variant="primary"
              disabled={
                snoozeBusy || !isChatDate(snoozeDate) || snoozeDate <= today
              }
              onClick={async () => {
                setSnoozeBusy(true);
                setSnoozeError("");
                try {
                  await onSave(snooze.id, {
                    writes: [],
                    snoozedUntil: snoozeDate,
                  });
                  setSnooze(null);
                } catch (e) {
                  setSnoozeError(e instanceof Error ? e.message : "未保存");
                } finally {
                  setSnoozeBusy(false);
                }
              }}
            >
              保存提醒
            </Button>
          </WorkspaceDialogFooter>
        </WorkspaceDialog>
      )}
    </div>
  );
}
