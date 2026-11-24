import React, { useState, useRef } from "react";
import type { Contact, ProgressRecord, FollowupRules } from "../types";
import type { FollowupBundle } from "../services/followupMutation";
import { chinaDate, isChatDate } from "../services/chatAnalysis";
import { tasks } from "../services/followupDomain";
import WorkspaceDialog, { WorkspaceDialogFooter } from "./WorkspaceDialog";
import Button from "./ui/Button";
import Input, { Textarea } from "./ui/Input";
import Select from "./ui/Select";
import Field from "./ui/Field";
export type BundleSave = (
  id: string,
  bundle: FollowupBundle,
) => Promise<Contact>;
export function FollowupResultDialog({
  contact,
  task,
  onSave,
  onClose,
  onSaved,
}: {
  contact: Contact;
  task?: ProgressRecord;
  onSave: BundleSave;
  onClose: () => void;
  onSaved: (saved: Contact, taskId?: string) => void;
}) {
  const [date, setDate] = useState(chinaDate),
    [content, setContent] = useState(""),
    [channel, setChannel] = useState<ProgressRecord["channel"]>("wechat"),
    [complete, setComplete] = useState(Boolean(task)),
    [busy, setBusy] = useState(false),
    [error, setError] = useState(""),
    [confirm, setConfirm] = useState(false);
  const recordId = useRef(crypto.randomUUID()),
    running = useRef(false),
    completionStamp = useRef(new Date().toISOString());
  function close() {
    if (busy) return;
    if (content.trim()) setConfirm(true);
    else onClose();
  }
  async function save() {
    if (running.current) return;
    if (!content.trim() || !isChatDate(date)) {
      setError("请填写实际日期与沟通结果。");
      return;
    }
    running.current = true;
    setBusy(true);
    setError("");
    try {
      const record: ProgressRecord = {
        id: recordId.current,
        kind: "communication",
        date,
        content: content.trim(),
        channel,
        completed: true,
        ...(task && { taskId: task.id }),
      };
      const writes = [{ record, expected: null as ProgressRecord | null }];
      if (task && complete)
        writes.push({
          record: {
            ...task,
            completed: true,
            completedAt: completionStamp.current,
          },
          expected: task,
        });
      const saved = await onSave(contact.id, { writes });
      onSaved(saved, complete ? task?.id : undefined);
    } catch (e) {
      setError(e instanceof Error ? e.message : "保存失败，请重试。");
    } finally {
      running.current = false;
      setBusy(false);
    }
  }
  return (
    <WorkspaceDialog
      title={contact.remarkName || contact.nickname}
      subtitle={task ? "完成跟进" : "写跟进"}
      accessibleTitle={task ? "记录跟进结果" : "写跟进"}
      compact
      onClose={close}
      closeDisabled={busy}
    >
      <fieldset disabled={busy || confirm} className="space-y-5 min-w-0">
        {task && <p className="text-sm font-semibold">{task.content}</p>}
        <Field label="实际沟通日期">
          <Input
            type="date"
            value={date}
            onChange={(e) => setDate(e.target.value)}
          />
        </Field>
        <Field label="沟通方式">
          <Select
            value={channel}
            onValueChange={(v) => {
              setChannel(v as ProgressRecord["channel"]);
              if (v === "attempt") setComplete(false);
            }}
          >
            <option value="wechat">微信</option>
            <option value="phone">电话</option>
            <option value="meeting">线下见面</option>
            <option value="attempt">联系未接通</option>
            <option value="internal">内部准备</option>
          </Select>
        </Field>
        <Field label={channel === "internal" ? "工作结果" : "沟通结果"}>
          <Textarea
            rows={4}
            value={content}
            maxLength={12000}
            onChange={(e) => setContent(e.target.value)}
          />
        </Field>
        {task && (
          <label className="flex gap-2 items-center text-sm">
            <input
              type="checkbox"
              checked={complete}
              onChange={(e) => setComplete(e.target.checked)}
            />
            同时完成这条待办
          </label>
        )}
      </fieldset>
      <WorkspaceDialogFooter>
        {error && (
          <p role="alert" className="w-full text-sm text-danger-600">
            {error}
          </p>
        )}
        {confirm ? (
          <>
            <p className="mr-auto text-sm">要放弃未保存的结果吗？</p>
            <Button onClick={() => setConfirm(false)}>继续编辑</Button>
            <Button variant="primary" onClick={onClose}>
              放弃
            </Button>
          </>
        ) : (
          <>
            <Button disabled={busy} onClick={close}>
              取消
            </Button>
            <Button
              variant="primary"
              disabled={busy || !content.trim()}
              onClick={save}
            >
              {busy
                ? "正在保存…"
                : task && complete
                  ? "保存结果并完成"
                  : "保存结果"}
            </Button>
          </>
        )}
      </WorkspaceDialogFooter>
    </WorkspaceDialog>
  );
}
export function FollowupScheduleDialog({
  contact,
  text,
  sourceRecordId,
  onSave,
  onClose,
}: {
  contact: Contact;
  text: string;
  sourceRecordId?: string;
  onSave: BundleSave;
  onClose: () => void;
}) {
  const [action, setAction] = useState(text),
    [date, setDate] = useState(chinaDate),
    [busy, setBusy] = useState(false),
    [error, setError] = useState("");
  const id = useRef(crypto.randomUUID()),
    running = useRef(false);
  async function save() {
    if (running.current) return;
    if (!action.trim() || !isChatDate(date)) {
      setError("请填写跟进动作和计划日期。");
      return;
    }
    if (tasks(contact).some((t) => t.content.trim() === action.trim())) {
      setError("已有相同待办，可在客户面板调整计划。");
      return;
    }
    running.current = true;
    setBusy(true);
    try {
      await onSave(contact.id, {
        writes: [
          {
            record: {
              id: id.current,
              kind: "task",
              date,
              content: action.trim(),
              completed: false,
              ...(sourceRecordId && { sourceRecordId }),
            },
            expected: null,
          },
        ],
      });
      onClose();
    } catch (e) {
      setError(e instanceof Error ? e.message : "保存失败，请重试。");
    } finally {
      running.current = false;
      setBusy(false);
    }
  }
  return (
    <WorkspaceDialog
      title={contact.remarkName || contact.nickname}
      subtitle="安排跟进"
      accessibleTitle="安排跟进"
      compact
      onClose={() => {
        if (
          !busy &&
          (!action.trim() ||
            action === text ||
            window.confirm("要放弃当前安排吗？"))
        )
          onClose();
      }}
      closeDisabled={busy}
    >
      <fieldset disabled={busy} className="space-y-5">
        <Field label="跟进动作">
          <Textarea
            rows={3}
            maxLength={500}
            value={action}
            onChange={(e) => setAction(e.target.value)}
          />
        </Field>
        <Field label="计划日期">
          <Input
            type="date"
            value={date}
            onChange={(e) => setDate(e.target.value)}
          />
        </Field>
      </fieldset>
      <WorkspaceDialogFooter>
        {error && (
          <p role="alert" className="w-full text-sm text-danger-600">
            {error}
          </p>
        )}
        <Button disabled={busy} onClick={onClose}>
          取消
        </Button>
        <Button
          variant="primary"
          disabled={busy || !action.trim()}
          onClick={save}
        >
          {busy ? "正在保存…" : "保存待办"}
        </Button>
      </WorkspaceDialogFooter>
    </WorkspaceDialog>
  );
}
export function FollowupRulesDialog({
  rules,
  onSave,
  onClose,
}: {
  rules: FollowupRules;
  onSave: (rules: FollowupRules) => Promise<void>;
  onClose: () => void;
}) {
  const [draft, setDraft] = useState(rules),
    [busy, setBusy] = useState(false),
    [error, setError] = useState("");
  const rows = [
    ["unanswered", "问题未见后续记录"],
    ["following", "跟进中未有效沟通"],
    ["paused", "暂缓客户未有效沟通"],
  ] as const;
  return (
    <WorkspaceDialog
      title="提醒规则"
      subtitle="可调整的初始参数"
      compact
      onClose={() => {
        if (!busy) onClose();
      }}
      closeDisabled={busy}
    >
      <div className="space-y-5">
        <div>
          <h3 className="text-sm font-medium">客户约定优先</h3>
          <p className="mt-2 text-sm text-gray-600">
            有约定日期按约定提醒；已有对应待办追踪原任务。
          </p>
        </div>
        {rows.map(([key, label]) => (
          <div key={key} className="flex gap-6 items-center">
            <label htmlFor={key} className="flex-1 text-sm">
              {label}
            </label>
            <div className="w-24">
              <Input
                id={key}
                type="number"
                min={1}
                max={365}
                value={draft[key]}
                disabled={busy}
                onChange={(e) =>
                  setDraft((v) => ({ ...v, [key]: Number(e.target.value) }))
                }
              />
            </div>
            <span className="text-xs text-gray-500">天</span>
          </div>
        ))}
        <p className="text-sm text-gray-600">
          达到间隔仅进入检查；激活还需要回访约定、暂停原因或新切入点。
        </p>
        <p className="text-xs text-gray-500">
          明确拒绝联系或尚在约定等待期时，不推荐联系。
        </p>
      </div>
      <WorkspaceDialogFooter>
        {error && (
          <p role="alert" className="w-full text-sm text-danger-600">
            {error}
          </p>
        )}
        <Button disabled={busy} onClick={onClose}>
          取消
        </Button>
        <Button
          variant="primary"
          disabled={busy}
          onClick={async () => {
            if (
              rows.some(
                ([k]) =>
                  !Number.isInteger(draft[k]) || draft[k] < 1 || draft[k] > 365,
              )
            ) {
              setError("提醒间隔须为1至365的整数。");
              return;
            }
            setBusy(true);
            try {
              await onSave(draft);
              onClose();
            } catch (e) {
              setError(e instanceof Error ? e.message : "规则未保存，请重试。");
            } finally {
              setBusy(false);
            }
          }}
        >
          {busy ? "正在保存…" : "保存规则"}
        </Button>
      </WorkspaceDialogFooter>
    </WorkspaceDialog>
  );
}
