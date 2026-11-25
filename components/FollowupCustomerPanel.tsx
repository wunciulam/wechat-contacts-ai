import React, { useState, useEffect, useRef } from "react";
import {
  Sparkles,
  ChevronDown,
  ChevronRight,
  RefreshCw,
  Check,
  CalendarDays,
} from "lucide-react";
import type { Contact, ProgressRecord } from "../types";
import {
  STAGES,
  notes,
  tasks,
  revision,
  lastEffective,
} from "../services/followupDomain";
import { chinaDate, isChatDate } from "../services/chatAnalysis";
import WorkspaceDialog from "./WorkspaceDialog";
import Button, { IconButton } from "./ui/Button";
import Input from "./ui/Input";
import Tag from "./ui/Tag";
import {isTaskOverdue,groupHistoryYears,channelLabel} from "../services/followupPresentation";
import type { BundleSave } from "./FollowupDialogs";
export function FollowupAvatar({ contact }: { contact: Contact }) {
  return (
    <span aria-hidden="true" className="followup-avatar">
      {(contact.remarkName || contact.nickname || "?").slice(0, 1)}
    </span>
  );
}
export function FollowupTaskDate({
  task,
  onDate,
  showOverdue=true,
}: {
  task: ProgressRecord;
  showOverdue?:boolean;
  onDate: (date: string) => Promise<void>;
}) {
  const [busy, setBusy] = useState(false),
    [error, setError] = useState("");
  const running = useRef(false);
  const [today,setToday]=useState(chinaDate);
  useEffect(()=>{const update=()=>setToday(chinaDate());const timer=setInterval(update,30000);window.addEventListener('focus',update);return()=>{clearInterval(timer);window.removeEventListener('focus',update);};},[]);
  const overdue = isTaskOverdue(task,today);
  async function changeDate(date: string) {
    if (running.current || !isChatDate(date) || date === task.date) return;
    running.current = true;
    setBusy(true);
    setError("");
    try {
      await onDate(date);
    } catch (e) {
      setError(e instanceof Error ? e.message : "改期未保存，请重试。");
    } finally {
      running.current = false;
      setBusy(false);
    }
  }
  return (
    <div className="followup-task-date" aria-busy={busy}>
      <div className="flex items-center justify-end gap-1">
        <time
          className={overdue ? "text-danger-600" : "text-gray-500"}
          dateTime={task.date}
        >
          {task.date || "待安排日期"}
        </time>
        <Input
          type="date"
          appearance="date-icon"
          aria-label={"改期：" + task.content}
          className="followup-date-icon"
          value={task.date}
          disabled={busy}
          onChange={(e) => {
            void changeDate(e.target.value);
          }}
        />
      </div>
      {overdue && showOverdue && (
        <span className="text-danger-600">
          逾期{" "}
          {Math.floor(
            (Date.parse(chinaDate()) - Date.parse(task.date)) / 86400000,
          )}{" "}
          天
        </span>
      )}
      {error && (
        <span role="alert" className="text-danger-600">
          {error}
        </span>
      )}
    </div>
  );
}

export default function FollowupCustomerPanel({
  contact,
  onClose,
  onEdit,
  onImport,
  onWrite,
  onResult,
  onSchedule,
  onAnalyze,
  onSave,
  analyzing,
  evidenceRecordId,
  activeTab = "followup",
  onTabChange,
  profileContent,
  policyContent,
  feedback,
  followupStatusControl,
  closeDisabled,
  onOpenAiSettings,
}: {
  onOpenAiSettings?:()=>void;
  followupStatusControl?:React.ReactNode;
  closeDisabled?:boolean;
  contact: Contact;
  onClose: () => void;
  onEdit: () => void;
  onImport: () => void;
  onWrite: () => void;
  onResult: (task: ProgressRecord) => void;
  onSchedule: (text: string, source?: string) => void;
  onAnalyze: () => Promise<void>;
  onSave: BundleSave;
  analyzing: boolean;
  evidenceRecordId?: string;
  activeTab?: "followup" | "profile" | "policies";
  onTabChange?: (tab: "followup" | "profile" | "policies") => void;
  profileContent?: React.ReactNode;
  policyContent?: React.ReactNode;
  feedback?: React.ReactNode;
}) {
  const [info, setInfo] = useState(false),
    [basis, setBasis] = useState(false),
    [all, setAll] = useState(Boolean(evidenceRecordId)),
    [error, setError] = useState("");
  const stageScroll = useRef<HTMLDivElement>(null);
  const a = contact.followupAnalysis,
    stale = !a || a.revision !== revision(contact),
    history = notes(contact),
    pending = tasks(contact),
    stageIndex = STAGES.findIndex((s) => s === a?.stage),
    existingAction = pending.find(
      (t) =>
        t.content === a?.nextAction ||
        Boolean(
          t.sourceRecordId &&
          a?.evidence.some((e) => e.recordId === t.sourceRecordId),
        ),
    );
  useEffect(() => {
    if (!evidenceRecordId) return;
    setAll(true);
    const timer = setTimeout(
      () =>
        document
          .getElementById("history-" + evidenceRecordId)
          ?.scrollIntoView({ block: "center" }),
      0,
    );
    return () => clearTimeout(timer);
  }, [evidenceRecordId, contact.id]);
  useEffect(() => {
    const host = stageScroll.current;
    const current = host?.querySelector<HTMLElement>('[aria-current="step"]');
    if (host && current && host.scrollWidth > host.clientWidth) {
      host.scrollLeft =
        current.offsetLeft -
        host.offsetLeft -
        (host.clientWidth - current.offsetWidth) / 2;
    }
  }, [stageIndex, activeTab]);
  return (
    <WorkspaceDialog
      title={contact.remarkName || contact.nickname}
      accessibleTitle={
        (contact.remarkName || contact.nickname) +
        (onTabChange ? "的客户详情" : "的跟进面板")
      }
      headerContent={
        onTabChange ? (
          <div className="flex items-center gap-3">
            <FollowupAvatar contact={contact} />
            <h2 className="text-base font-semibold">
              {contact.remarkName || contact.nickname}
            </h2>
          </div>
        ) : (
          <div className="followup-customer-basics">
            <div className="flex items-center gap-3">
              <FollowupAvatar contact={contact} />
              <div className="min-w-0">
                <h2 className="text-base font-semibold mb-1">
                  {contact.remarkName || contact.nickname}
                </h2>
                <div className="followup-basic-fields">
                  <span>
                    <small>电话</small>
                    <strong>{String(contact.phoneNumber || "待补充")}</strong>
                  </span>
                  <span>
                    <small>生日</small>
                    <strong>{contact.birthday || "待补充"}</strong>
                  </span>
                  <span>
                    <small>上次沟通</small>
                    <strong>{lastEffective(contact) || "暂无记录"}</strong>
                  </span>
                </div>
              </div>
            </div>
            <div className="flex gap-2">
              <Button
                variant="plain"
                className="flex items-center gap-1 whitespace-nowrap text-xs"
                onClick={() => setInfo(!info)}
              >
                {info ? "收起资料" : "更多资料"}
                {info ? <ChevronDown size={14} /> : <ChevronRight size={14} />}
              </Button>
              <Button size="sm" onClick={onEdit}>
                编辑资料
              </Button>
            </div>
          </div>
        )
      }
      size="followup"
      className="followup-detail-dialog"
      bodyClassName="min-h-0 overflow-y-auto p-0"
      onClose={onClose}
      closeDisabled={closeDisabled}
    >
      {onTabChange && (
        <div
          className="customer-detail-tabs"
          role="tablist"
          aria-label="客户详情视图"
        >
          {[
            ["followup", "跟进"],
            ["profile", "资料"],
            ["policies", "保单"],
          ].map(([key, label]) => (
            <Button
              key={key}
              role="tab"
              variant="plain"
              aria-selected={activeTab === key}
              onClick={() =>
                onTabChange(key as "followup" | "profile" | "policies")
              }
            >
              {label}
            </Button>
          ))}
          {activeTab==='followup'&&followupStatusControl}

        </div>
      )}
      {activeTab === "profile" ? (
        profileContent
      ) : activeTab === "policies" ? (
        <div className="customer-policy-view">{policyContent}</div>
      ) : (
        <>
          {feedback}
          {info && (
            <div className="followup-expanded-info">
              <div>
                <small>微信备注</small>
                <p>{contact.remarkInfo || "待补充"}</p>
              </div>
              <div>
                <small>标签</small>
                <div className="flex flex-wrap gap-1">
                  {contact.tags.map((tag) => (
                    <Tag key={tag}>{tag}</Tag>
                  ))}
                </div>
              </div>
              <div>
                <small>关联保单</small>
                <p>{contact.policies?.length || 0} 份</p>
                <Button variant="plain" onClick={onEdit}>
                  查看客户资料与保单
                </Button>
              </div>
            </div>
          )}
          <div className="followup-stage-track">
            <div
              ref={stageScroll}
              className="followup-stage-scroll"
              tabIndex={0}
            >
              <ol className="followup-stage-sequence" aria-label="客户跟进阶段">
                {STAGES.map((stage, i) => (
                  <React.Fragment key={stage}>
                    <li
                      className="followup-stage-node"
                      data-active={i === stageIndex}
                      data-passed={stageIndex >= 0 && i < stageIndex}
                      aria-current={i === stageIndex ? "step" : undefined}
                    >
                      <span
                        className="followup-stage-marker"
                        aria-hidden="true"
                      />
                      <span>{stage}</span>
                    </li>
                    {i < STAGES.length - 1 && (
                      <li
                        className="followup-stage-connector"
                        aria-hidden="true"
                      />
                    )}
                  </React.Fragment>
                ))}
              </ol>
            </div>
            <small>
              {stageIndex >= 0
                ? "第 " + (stageIndex + 1) + " / 5 阶段"
                : a?.stage || "阶段待确认"}
            </small>
          </div>
          <div className="followup-detail-grid">
            <aside className="followup-judgment">
              <section className="followup-ai-card">
                <div className="followup-ai-glow" aria-hidden="true">
                  <span className="followup-ai-glow-cyan" />
                  <span className="followup-ai-glow-orange" />
                  <span className="followup-ai-glow-purple" />
                </div>
                <div className="followup-ai-heading">
                  <span>
                    <Sparkles size={14} />
                    AI 分析
                  </span>
                  <div className="flex items-center gap-2">
                    <small>
                      {a
                        ? stale
                          ? "有新记录，待更新"
                          : new Date(a.generatedAt).toLocaleTimeString(
                              "zh-CN",
                              {
                                hour: "2-digit",
                                minute: "2-digit",
                              },
                            )
                        : "尚未分析"}
                    </small>
                    <Button
                      size="sm"
                      variant={stale ? "primary" : "secondary"}
                      disabled={analyzing || !history.length}
                      onClick={async () => {
                        setError("");
                        try {
                          await onAnalyze();
                        } catch (e) {
                          setError(e instanceof Error ? e.message : "分析失败");
                        }
                      }}
                    >
                      {analyzing ? "更新中…" : a ? "更新分析" : "生成分析"}
                    </Button>
                  </div>
                </div>
                <div className="followup-ai-judgment">
                  <small>当前判断</small>
                  <h3>{a?.blocker || "记录沟通后分析当前卡点"}</h3>
                  {a?.explanation && <p>{a.explanation}</p>}
                </div>
                <div className="followup-ai-action">
                  <small>建议行动</small>
                  <p>{a?.nextAction || "先导入聊天或记录沟通。"}</p>
                  {a?.script && (
                    <div className="followup-script">
                      <small>参考话术</small>
                      <p>{a.script}</p>
                    </div>
                  )}
                  {a?.nextAction && (
                    <Button
                      variant="primary"
                      disabled={stale && !existingAction}
                      onClick={() => {
                        const task = existingAction;
                        if (task)
                          document
                            .getElementById("pending-" + task.id)
                            ?.scrollIntoView({
                              block: "center",
                              behavior: "smooth",
                            });
                        else onSchedule(a.nextAction, a.evidence[0]?.recordId);
                      }}
                    >
                      {existingAction ? "查看已安排" : "安排跟进"}
                    </Button>
                  )}
                </div>
                {a?.evidence.length > 0 && (
                  <div className="followup-ai-evidence">
                    <Button
                      variant="text"
                      onClick={() => setBasis(!basis)}
                      aria-expanded={basis}
                    >
                      判断依据
                      <ChevronDown size={14} />
                    </Button>
                    {basis &&
                      a.evidence.map((e, i) => (
                        <div key={i}>
                          <blockquote>{e.quote}</blockquote>
                          <Button
                            variant="text"
                            onClick={() => {
                              setAll(true);
                              setTimeout(
                                () =>
                                  document
                                    .getElementById("history-" + e.recordId)
                                    ?.scrollIntoView({
                                      block: "center",
                                      behavior: "smooth",
                                    }),
                                0,
                              );
                            }}
                          >
                            查看对应跟进记录
                          </Button>
                        </div>
                      ))}
                  </div>
                )}
              </section>
              {error && (
                <p role="alert" className="text-sm text-danger-600">
                  {error}
                </p>
              )}
              {pending.length > 0 && (
                <section className="followup-customer-tasks">
                  <h3>已有待办</h3>
                  {pending.map((task) => (
                    <div
                      id={"pending-" + task.id}
                      key={task.id}
                      className="followup-customer-task"
                    >
                      <label>
                        <input
                          type="checkbox"
                          checked={false}
                          onChange={() => onResult(task)}
                          aria-label={"完成待办：" + task.content}
                        />
                        <span>{task.content}</span>
                      </label>
                      <FollowupTaskDate
                        task={task}
                    showOverdue={false}
                        onDate={(date) =>
                          onSave(contact.id, {
                            writes: [
                              { record: { ...task, date }, expected: task },
                            ],
                          }).then(() => {})
                        }
                      />
                    </div>
                  ))}
                </section>
              )}
            </aside>
            <section className="followup-history">
              <div className="followup-history-heading">
                <h3>跟进记录</h3>
                <div className="flex gap-2">
                  <Button size="sm" onClick={onImport}>
                    导入聊天
                  </Button>
                  <Button size="sm" onClick={onWrite}>
                    写跟进
                  </Button>
                </div>
              </div>
              {!history.length && (
                <p className="text-sm text-gray-500 py-6">暂无跟进记录</p>
              )}
              {groupHistoryYears(all ? history : history.slice(0,8)).map(group=><section className="followup-history-year" key={group.year}><h4>{group.year}</h4>{group.records.map((record) => (
                <article
                  id={"history-" + record.id}
                  key={record.id}
                  className="followup-history-row"
                  data-highlight={record.id === evidenceRecordId}
                  data-latest={record.id===history[0]?.id}
                >
                  <time dateTime={record.date}>{record.date.slice(5).replace("-","月")}日</time>
                  <span className="followup-history-mark" aria-hidden="true" />
                  <div>
                    <p>{record.content}</p>
                    {channelLabel(record)&&<div className="followup-history-channel"><Tag>{channelLabel(record)}</Tag></div>}
                    {record.chat?.transcript && (
                      <details open={record.id === evidenceRecordId}>
                        <summary>查看原话</summary>
                        <div className="followup-original-messages">
                          {record.chat.messages?.length ? (
                            record.chat.messages.map((m, i) => (
                              <div key={m.id + "-" + i}>
                                <header>
                                  <strong>
                                    {m.speaker === "self"
                                      ? "我"
                                      : m.speaker === "customer"
                                        ? "客户"
                                        : "待核对"}
                                  </strong>
                                  <time>{m.time}</time>
                                </header>
                                <p>{m.text}</p>
                              </div>
                            ))
                          ) : (
                            <p className="whitespace-pre-wrap">
                              {record.chat.transcript}
                            </p>
                          )}
                        </div>
                      </details>
                    )}
                  </div>
                </article>
              ))}</section>)}
              {history.length > 8 && !all && (
                <Button variant="text" onClick={() => setAll(true)}>
                  查看全部 {history.length} 条记录
                </Button>
              )}
            </section>
          </div>
        </>
      )}
    </WorkspaceDialog>
  );
}
