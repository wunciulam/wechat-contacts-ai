import React, { useState, useEffect, useRef } from "react";
import { ImagePlus, ArrowUp, ArrowDown, X, Pencil } from "lucide-react";
import type { Contact, ChatMessage } from "../types";
import {
  parseMessages,
  groupMessages,
  mergeMessages,
  dailyDraft,
  importRecords,
  notes,
  revision,
} from "../services/followupDomain";
import { summarizeDays } from "../services/followupAiClient";
import type { FollowupWrite } from "../services/followupMutation";
import { recognizeChatScreenshots } from "../services/chatOcr";
import { isChatDate } from "../services/chatAnalysis";
import WorkspaceDialog, { WorkspaceDialogFooter } from "./WorkspaceDialog";
import Button, { IconButton } from "./ui/Button";
import Input, { Textarea } from "./ui/Input";
import Select from "./ui/Select";
import Field from "./ui/Field";
function Screenshot({ file }: { file: File }) {
  const [url, setUrl] = useState("");
  useEffect(() => {
    const u = URL.createObjectURL(file);
    setUrl(u);
    return () => URL.revokeObjectURL(u);
  }, [file]);
  return url ? <img src={url} alt={file.name} /> : null;
}
export default function ChatFollowUpDialog({
  contacts,
  initialContactId,
  onSave,
  onClose,
}: {
  contacts: Contact[];
  initialContactId?: string;
  onSave: (id: string, writes: FollowupWrite[]) => Promise<void>;
  onClose: () => void;
}) {
  const [contactId, setContactId] = useState(initialContactId || ""),
    contact = contacts.find((c) => c.id === contactId);
  const [files, setFiles] = useState<File[]>([]),
    [messages, setMessages] = useState<ChatMessage[]>([]),
    [selected, setSelected] = useState<Set<string>>(new Set()),
    [step, setStep] = useState<"review" | "summary">("review");
  const [summaries, setSummaries] = useState<Record<string, string>>({}),
    [paste, setPaste] = useState(""),
    [showPaste, setShowPaste] = useState(false),
    [editing, setEditing] = useState<string | null>(null),
    [activeFile, setActiveFile] = useState(0);
  const [busy, setBusy] = useState(""),
    [error, setError] = useState(""),
    [progress, setProgress] = useState(""),
    [confirmClose, setConfirmClose] = useState(false),
    [manualOption, setManualOption] = useState(false);
  const upload = useRef<HTMLInputElement>(null),
    operation = useRef<AbortController | null>(null),
    busyRef = useRef(false),
    summaryRevision = useRef("");
  useEffect(() => () => operation.current?.abort(), []);
  const picked = messages.filter((m) => selected.has(m.id)),
    invalid = picked.some(
      (m) => !isChatDate(m.date) || m.speaker === "unknown" || !m.text.trim(),
    );
  const grouped = groupMessages(messages),
    days = groupMessages(picked),
    dirty = files.length > 0 || messages.length > 0 || Boolean(paste.trim());
  const allMerged = days.flatMap(([date, rows]) =>
    mergeMessages(
      notes(contact || ({ progressHistory: [] } as Contact)).find(
        (r) => r.date === date && r.chat?.messages,
      )?.chat?.messages || [],
      rows,
    ),
  );
  function close() {
    if (busy === "save") return;
    if (dirty) setConfirmClose(true);
    else onClose();
  }
  function patch(id: string, change: Partial<ChatMessage>) {
    setMessages((rows) =>
      rows.map((m) => (m.id === id ? { ...m, ...change } : m)),
    );
    setSummaries({});
  }
  function toggle(id: string) {
    setSelected((v) => {
      const n = new Set(v);
      n.has(id) ? n.delete(id) : n.add(id);
      return n;
    });
    setSummaries({});
  }
  function setTranscript(text: string) {
    const rows = parseMessages(text);
    setMessages(rows);
    setSelected(new Set(rows.map((m) => m.id)));
    setSummaries({});
    setManualOption(false);
  }
  async function recognize(incoming: File[]) {
    if (busyRef.current) return;
    busyRef.current = true;
    setBusy("ocr");
    setError("");
    const ctl = new AbortController();
    operation.current = ctl;
    try {
      const result = await recognizeChatScreenshots(
        incoming,
        setProgress,
        ctl.signal,
      );
      if (!result.text) throw Error("没有读到文字，请换清晰截图或粘贴聊天。");
      setTranscript(result.text);
      if (result.unreadable)
        setError(`${result.unreadable}张截图未读到文字，请核对。`);
    } catch (e) {
      if (!ctl.signal.aborted)
        setError(e instanceof Error ? e.message : "识别失败，请重试。");
    } finally {
      busyRef.current = false;
      setBusy("");
      setProgress("");
    }
  }
  function addFiles(list: File[]) {
    const valid = list.filter(
      (f) =>
        /^image\/(png|jpeg|webp|bmp|gif)$/.test(f.type) &&
        f.size <= 30 * 1024 * 1024,
    );
    if (valid.length !== list.length) setError("请选择30MB以内的图片。");
    const next = [...files, ...valid].slice(0, 12);
    setFiles(next);
    if (next.length) void recognize(next);
  }
  function manual() {
    summaryRevision.current = contact ? revision(contact) : "";
    setSummaries(
      Object.fromEntries(
        groupMessages(allMerged).map(([d, rows]) => [d, dailyDraft(rows)]),
      ),
    );
    setStep("summary");
    setError("");
  }
  async function generate() {
    if (!contact || invalid || !picked.length || busyRef.current) return;
    if (Object.keys(summaries).length) {
      setStep("summary");
      return;
    }
    busyRef.current = true;
    setBusy("summary");
    setError("");
    const ctl = new AbortController();
    operation.current = ctl;
    summaryRevision.current = revision(contact);
    try {
      setSummaries(await summarizeDays(allMerged, ctl.signal));
      setStep("summary");
    } catch (e) {
      setError(e instanceof Error ? e.message : "生成失败，请重试。");
      setManualOption(true);
    } finally {
      busyRef.current = false;
      setBusy("");
    }
  }
  async function save() {
    if (!contact || busyRef.current) return;
    try {
      if (summaryRevision.current !== revision(contact))
        throw Error("梗概生成后记录有变化，请返回重新生成。");
      const writes = importRecords(contact, picked, summaries);
      if (!writes.length) {
        setError("这些消息已归档，没有新增内容。");
        return;
      }
      if (writes.some((w) => !w.record.content.trim()))
        throw Error("请填写每日梗概。");
      busyRef.current = true;
      setBusy("save");
      setError("");
      await onSave(contact.id, writes);
    } catch (e) {
      setError(e instanceof Error ? e.message : "保存失败，草稿已保留。");
    } finally {
      busyRef.current = false;
      setBusy("");
    }
  }
  const reviewMessage = (m: ChatMessage) => (
    <div
      key={m.id}
      className={
        "chat-message " + (m.speaker === "self" ? "chat-message-self" : "")
      }
    >
      <input
        type="checkbox"
        aria-label={"保留消息：" + m.text}
        checked={selected.has(m.id)}
        onChange={() => toggle(m.id)}
        disabled={!!busy}
      />
      <div className="chat-message-content">
        <div
          className={
            "chat-bubble " + (!selected.has(m.id) ? "chat-unselected" : "")
          }
        >
          {editing === m.id ? (
            <div className="space-y-2">
              <Select
                aria-label="说话人"
                value={m.speaker}
                onValueChange={(v) =>
                  patch(m.id, { speaker: v as ChatMessage["speaker"] })
                }
              >
                <option value="customer">客户</option>
                <option value="self">我</option>
                <option value="unknown">待核对</option>
              </Select>
              <Input
                type="date"
                aria-label="消息日期"
                value={m.date}
                onChange={(e) => patch(m.id, { date: e.target.value })}
              />
              <Input
                aria-label="消息时间"
                value={m.time}
                placeholder="HH:mm"
                onChange={(e) => patch(m.id, { time: e.target.value })}
              />
              <Textarea
                aria-label="消息原文"
                rows={2}
                value={m.text}
                onChange={(e) => patch(m.id, { text: e.target.value })}
              />
              <Button size="sm" onClick={() => setEditing(null)}>
                完成核对
              </Button>
            </div>
          ) : (
            <Button
              variant="plain"
              className="text-left whitespace-pre-wrap"
              aria-label={"编辑消息：" + m.text}
              onClick={() => setEditing(m.id)}
            >
              {m.text}
            </Button>
          )}
        </div>
        <div className="chat-message-meta">
          <span>
            {m.speaker === "self"
              ? "我"
              : m.speaker === "customer"
                ? "客户"
                : "说话人待核对"}
          </span>
          <time>{m.time || "时间未知"}</time>
          {m.speaker === "unknown" && <Pencil size={12} />}
        </div>
      </div>
    </div>
  );
  return (
    <WorkspaceDialog
      title={contact?.remarkName || contact?.nickname || "选择客户"}
      subtitle={step === "review" ? "导入聊天" : "每日梗概"}
      accessibleTitle="导入聊天记录"
      size="chat"
      className="chat-import-dialog"
      bodyClassName="min-h-0 overflow-y-auto p-0"
      onClose={close}
      closeDisabled={busy === "save"}
    >
      <fieldset disabled={!!busy || confirmClose} className="min-w-0">
        {!initialContactId && (
          <div className="px-5 pt-4">
            <Field label="客户">
              <Select
                searchable
                placeholder="选择客户"
                value={contactId}
                onValueChange={(id) => {
                  setContactId(id);
                  setSummaries({});
                }}
              >
                {contacts.map((c) => (
                  <option key={c.id} value={c.id}>
                    {c.remarkName || c.nickname}
                  </option>
                ))}
              </Select>
            </Field>
          </div>
        )}
        <div
          className={
            "chat-import-grid " +
            (step === "summary" ? "chat-summary-grid" : "")
          }
        >
          <aside className="chat-sources">
            {step === "review" ? (
              <>
                <div className="flex justify-between text-xs text-gray-500">
                  <span>原始截图</span>
                  <span>{files.length} 张</span>
                </div>
                <input
                  ref={upload}
                  type="file"
                  multiple
                  accept="image/*"
                  aria-label="聊天截图文件"
                  className="hidden"
                  onChange={(e) => {
                    addFiles(Array.from(e.target.files || []));
                    e.target.value = "";
                  }}
                />
                {files.map((file, i) => (
                  <div key={file.name + i} className="chat-source-file">
                    <Button
                      variant="plain"
                      aria-label={"查看截图 " + file.name}
                      onClick={() => setActiveFile(i)}
                      className={activeFile === i ? "chat-source-active" : ""}
                    >
                      <Screenshot file={file} />
                      <span className="block truncate text-xs">
                        {file.name}
                      </span>
                    </Button>
                    <div className="flex gap-1">
                      <IconButton
                        aria-label={"上移第" + (i + 1) + "张"}
                        disabled={!i}
                        onClick={() => {
                          const next = [...files];
                          [next[i - 1], next[i]] = [next[i], next[i - 1]];
                          setFiles(next);
                          void recognize(next);
                        }}
                      >
                        <ArrowUp size={14} />
                      </IconButton>
                      <IconButton
                        aria-label={"下移第" + (i + 1) + "张"}
                        disabled={i === files.length - 1}
                        onClick={() => {
                          const next = [...files];
                          [next[i + 1], next[i]] = [next[i], next[i + 1]];
                          setFiles(next);
                          void recognize(next);
                        }}
                      >
                        <ArrowDown size={14} />
                      </IconButton>
                      <IconButton
                        aria-label={"移除第" + (i + 1) + "张"}
                        onClick={() => {
                          const remaining = files.filter((_, x) => x !== i);
                          setFiles(remaining);
                          setActiveFile(0);
                          setTranscript("");
                          if (remaining.length) void recognize(remaining);
                          else setTranscript("");
                        }}
                      >
                        <X size={14} />
                      </IconButton>
                    </div>
                  </div>
                ))}
                <Button onClick={() => upload.current?.click()}>
                  <ImagePlus size={16} />
                  添加截图
                </Button>
                {files.length > 0 && (
                  <Button onClick={() => recognize(files)}>重新识别</Button>
                )}
                <Button
                  variant="plain"
                  onClick={() => setShowPaste(!showPaste)}
                >
                  粘贴聊天文字
                </Button>
              </>
            ) : (
              <>
                <h3 className="text-sm font-semibold">所选原话</h3>
                {groupMessages(allMerged).map(([d, rows]) => (
                  <section key={d} className="space-y-3">
                    <h4 className="text-xs text-gray-500">{d}</h4>
                    {rows.map((m, i) => (
                      <div key={m.id + "-" + i} className="chat-source-quote">
                        <div className="flex items-center gap-2">
                          <strong>
                            {m.speaker === "self" ? "我" : "客户"}
                          </strong>
                          <time>{m.time}</time>
                        </div>
                        <p>{m.text}</p>
                      </div>
                    ))}
                  </section>
                ))}
              </>
            )}
          </aside>
          <section className="chat-review">
            {step === "review" ? (
              <>
                {showPaste && (
                  <div className="space-y-2">
                    <Field label="聊天文字">
                      <Textarea
                        rows={4}
                        value={paste}
                        onChange={(e) => setPaste(e.target.value)}
                        placeholder="2026-11-23 09:12&#10;客户：孩子有团险，再买会重复吗？&#10;我：发我保障表，我先核对范围。"
                      />
                    </Field>
                    <Button
                      onClick={() => {
                        setTranscript(paste);
                        setShowPaste(false);
                      }}
                    >
                      识别文字结构
                    </Button>
                  </div>
                )}
                <div className="flex items-center justify-between">
                  <label className="flex items-center gap-2 text-sm">
                    <input
                      type="checkbox"
                      checked={
                        messages.length > 0 && selected.size === messages.length
                      }
                      onChange={(e) => {
                        setSelected(
                          new Set(
                            e.target.checked ? messages.map((m) => m.id) : [],
                          ),
                        );
                        setSummaries({});
                      }}
                    />
                    识别结果
                  </label>
                </div>
                {!messages.length && (
                  <div className="chat-empty">
                    添加截图，或粘贴带日期的聊天文字。
                  </div>
                )}
                {grouped.map(([d, rows]) => (
                  <section
                    key={d || "unknown"}
                    className={!d ? "chat-date-unknown" : "chat-day"}
                  >
                    <div className="chat-day-heading">
                      <span>{d || "日期待确认"}</span>
                      {!d && (
                        <div className="w-44">
                          <Input
                            type="date"
                            aria-label="补充消息日期"
                            value=""
                            onChange={(e) => {
                              if (isChatDate(e.target.value)) {
                                const ids = new Set(rows.map((m) => m.id));
                                setMessages((v) =>
                                  v.map((m) =>
                                    ids.has(m.id)
                                      ? { ...m, date: e.target.value }
                                      : m,
                                  ),
                                );
                                setSummaries({});
                              }
                            }}
                          />
                        </div>
                      )}
                    </div>
                    {rows.map(reviewMessage)}
                  </section>
                ))}
              </>
            ) : (
              <>
                <div className="flex justify-between items-center">
                  <h3 className="text-sm font-semibold">每日梗概</h3>
                  <Button
                    size="sm"
                    onClick={() => {
                      if (
                        window.confirm(
                          "重新生成将替换当前编辑的梗概，是否继续？",
                        )
                      ) {
                        setSummaries({});
                        setStep("review");
                      }
                    }}
                  >
                    重新生成
                  </Button>
                </div>
                {days.map(([d]) => (
                  <div key={d} className="space-y-2">
                    <div className="flex justify-between">
                      <label
                        htmlFor={"summary-" + d}
                        className="text-sm font-medium"
                      >
                        {d}
                      </label>
                      <span className="text-xs text-gray-500">
                        {allMerged.filter((m) => m.date === d).length} 条聊天
                      </span>
                    </div>
                    <Textarea
                      id={"summary-" + d}
                      aria-label={d + "每日梗概"}
                      rows={4}
                      value={summaries[d] || ""}
                      onChange={(e) =>
                        setSummaries((v) => ({ ...v, [d]: e.target.value }))
                      }
                    />
                  </div>
                ))}
              </>
            )}
          </section>
        </div>
      </fieldset>
      <WorkspaceDialogFooter>
        <div className="w-full">
          {error && (
            <p role="alert" className="mb-2 text-sm text-danger-600">
              {error}
            </p>
          )}
          {busy && (
            <p role="status" className="mb-2 text-sm text-gray-500">
              {busy === "ocr"
                ? progress || "正在识别…"
                : busy === "summary"
                  ? "正在按原文生成每日梗概…"
                  : "正在保存…"}
            </p>
          )}
          {confirmClose ? (
            <div className="flex items-center justify-end gap-2">
              <p className="mr-auto text-sm">要放弃这次导入吗？</p>
              <Button onClick={() => setConfirmClose(false)}>继续编辑</Button>
              <Button
                variant="primary"
                onClick={() => {
                  operation.current?.abort();
                  onClose();
                }}
              >
                放弃
              </Button>
            </div>
          ) : (
            <div className="flex flex-wrap items-center justify-between gap-3">
              <div className="text-xs text-gray-500">
                已选 {picked.length} 条
                {days.filter(([d]) => d).length > 0
                  ? "，覆盖 " + days.filter(([d]) => d).length + " 天"
                  : ""}
                {invalid && (
                  <span className="block text-amber-700">
                    请先核对日期和说话人
                  </span>
                )}
              </div>
              <div className="flex gap-2">
                {step === "summary" ? (
                  <>
                    <Button disabled={!!busy} onClick={() => setStep("review")}>
                      返回
                    </Button>
                    <Button
                      variant="primary"
                      disabled={!!busy || !days.length}
                      onClick={save}
                    >
                      保存 {days.length} 天梗概
                    </Button>
                  </>
                ) : (
                  <>
                    <Button disabled={!!busy} onClick={close}>
                      取消
                    </Button>
                    {manualOption && (
                      <Button
                        disabled={
                          invalid || !picked.length || !contact || !!busy
                        }
                        onClick={manual}
                      >
                        按原文整理
                      </Button>
                    )}
                    <Button
                      variant="primary"
                      disabled={!contact || !picked.length || invalid || !!busy}
                      onClick={generate}
                    >
                      生成每日梗概
                    </Button>
                  </>
                )}
              </div>
            </div>
          )}
        </div>
      </WorkspaceDialogFooter>
    </WorkspaceDialog>
  );
}
