import {notify} from '../services/notifications';
import React, { useRef, useState } from "react";
import type { Contact, ProgressRecord } from "../types";
import WorkspaceDialog, { WorkspaceDialogFooter } from "./WorkspaceDialog";
import Button from "./ui/Button";
import Input, { Textarea } from "./ui/Input";
import Select from "./ui/Select";
import Field from "./ui/Field";
import { isChatDate } from "../services/chatAnalysis";
export type MutateHistory = (
  kind: "edit" | "delete",
  record: ProgressRecord,
  expected: ProgressRecord,
) => Promise<Contact>;
export default function FollowupRecordDialog({
  record,
  mode,
  onMutate,
  onClose,
  onSaved,
}: {
  record: ProgressRecord;
  mode: "edit" | "delete";
  onMutate: MutateHistory;
  onClose: () => void;
  onSaved: () => void;
}) {
  const deletingTask=mode==="delete"&&record.kind==="task";
  const [date, setDate] = useState(record.date),
    [content, setContent] = useState(record.content),
    [channel, setChannel] = useState(record.channel || ""),
    [busy, setBusy] = useState(false),
    [error, setError] = useState("");
  const running = useRef(false);
  const dirty =
    date !== record.date ||
    content !== record.content ||
    channel !== (record.channel || "");
  function close() {
    if (running.current) return;
    if (
      mode === "edit" &&
      dirty &&
      !window.confirm("跟进修改尚未保存，确认放弃？")
    )
      return;
    onClose();
  }
  async function save() {
    if (running.current) return;
    if (mode === "edit" && (!isChatDate(date) || !content.trim())) {
      setError("请填写有效日期与跟进内容。");
      return;
    }
    running.current = true;
    setBusy(true);
    setError("");
    try {
      const edited: ProgressRecord = {
        ...record,
        date,
        content: content.trim(),
        channel: (channel || undefined) as ProgressRecord["channel"],
      };
      if (record.chat && date !== record.date)
        edited.chat = {
          ...record.chat,
          messages: record.chat.messages?.map((m) =>
            m.date === record.date ? { ...m, date } : m,
          ),
        };
      await onMutate(mode, mode === "delete" ? record : edited, record);
      if(deletingTask)notify("待办已删除");
      onSaved();
    } catch (e) {
      setError(e instanceof Error ? e.message : "保存失败，请重试。");
    } finally {
      running.current = false;
      setBusy(false);
    }
  }
  return (
    <WorkspaceDialog
      title={deletingTask?"删除待办":mode === "edit" ? "编辑跟进记录" : "删除跟进记录"}
      compact
      onClose={close}
      closeDisabled={busy}
    >
      {mode === "delete" ? (
        <div className="space-y-3">
          <blockquote className="rounded-md bg-gray-50 p-3 text-sm">
            <time className="text-xs text-gray-500">{record.date}</time>
            <p className="mt-1 whitespace-pre-wrap">{record.content}</p>
          </blockquote>
          <p className="text-sm text-gray-600">
            {deletingTask?"删除这项待办？已有沟通历史保留。":record.chat
              ? "删除这条跟进概要及其聊天原话？"
              : "删除这条跟进记录？"}
            {record.taskId ? "关联待办的完成状态保持不变。" : ""}
          </p>
        </div>
      ) : (
        <fieldset disabled={busy} className="space-y-4 min-w-0">
          <Field label="沟通日期">
            <Input
              type="date"
              value={date}
              onChange={(e) => setDate(e.target.value)}
            />
          </Field>
          <Field label="沟通渠道">
            <Select value={channel} onValueChange={setChannel}>
              <option value="">渠道未记录</option>
              <option value="wechat">微信</option>
              <option value="phone">电话</option>
              <option value="meeting">线下见面</option>
              <option value="attempt">联系未接通</option>
              <option value="internal">内部工作</option>
            </Select>
          </Field>
          <Field label={record.chat ? "每日梗概" : "跟进内容"}>
            <Textarea
              rows={5}
              maxLength={12000}
              value={content}
              onChange={(e) => setContent(e.target.value)}
            />
          </Field>
          {record.chat && (
            <p className="text-xs text-gray-500">
              原话文字保留；修改日期时整条记录按新日期归档。
            </p>
          )}
        </fieldset>
      )}
      <WorkspaceDialogFooter>
        {error && (
          <p role="alert" className="w-full text-sm text-danger-600">
            {error}
          </p>
        )}
        <Button onClick={close} disabled={busy}>
          取消
        </Button>
        <Button
          variant={mode === "delete" ? "danger" : "primary"}
          disabled={busy || (mode === "edit" && !dirty)}
          onClick={save}
        >
          {busy
            ? mode === "delete"
              ? "正在删除…"
              : "正在保存…"
            : mode === "delete"
              ? "删除"
              : "保存修改"}
        </Button>
      </WorkspaceDialogFooter>
    </WorkspaceDialog>
  );
}
