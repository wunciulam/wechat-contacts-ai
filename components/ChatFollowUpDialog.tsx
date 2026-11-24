import React, { useEffect, useRef, useState } from 'react';
import { ArrowDown, ArrowUp, ImagePlus, X } from 'lucide-react';
import type { Contact, ProgressRecord } from '../types';
import { chinaDate, isChatDate, parseChatAnalysis, prepareChatAnalysis, type ChatAnalysis } from '../services/chatAnalysis';
import { MAX_TRANSCRIPT_LENGTH, transcriptLines } from '../services/chatTranscript';
import { recognizeChatScreenshots } from '../services/chatOcr';
import WorkspaceDialog, { WorkspaceDialogFooter } from './WorkspaceDialog';
import Button, { IconButton } from './ui/Button';
import Input, { Textarea } from './ui/Input';
import Field from './ui/Field';
import Select from './ui/Select';

function ScreenshotPreview({ file, full = false }: { file: File; full?: boolean }) {
  const [source, setSource] = useState('');
  useEffect(() => {
    const url = URL.createObjectURL(file);
    setSource(url);
    return () => URL.revokeObjectURL(url);
  }, [file]);
  return source ? <img src={source} alt={full ? file.name : ""} className={full ? "mx-auto h-auto max-w-full" : "h-12 w-12 shrink-0 rounded-md bg-gray-50 object-cover object-top"} /> : null;
}

export default function ChatFollowUpDialog({ contacts, initialContactId, onSave, onClose }: {
  contacts: Contact[];
  initialContactId?: string;
  onSave: (contactId: string, record: ProgressRecord) => Promise<void>;
  onClose: () => void;
}) {
  const [contactId, setContactId] = useState(initialContactId ?? '');
  const contact = contacts.find(item => item.id === contactId);
  const [date, setDate] = useState(chinaDate);
  const [files, setFiles] = useState<File[]>([]);
  const [preview, setPreview] = useState<File>();
  const [transcript, setTranscript] = useState('');
  const [note, setNote] = useState('');
  const [summary, setSummary] = useState('');
  const [analysis, setAnalysis] = useState<ChatAnalysis | null>(null);
  const [nextAction, setNextAction] = useState('');
  const [dueDate, setDueDate] = useState('');
  const [busy, setBusy] = useState<'ocr' | 'analysis' | 'save' | null>(null);
  const [status, setStatus] = useState('');
  const [error, setError] = useState('');
  const [reviewNeeded, setReviewNeeded] = useState(false);
  const [ocrCurrent, setOcrCurrent] = useState(false);
  const [confirmClose, setConfirmClose] = useState(false);
  const operation = useRef<AbortController | null>(null);
  const request = useRef({ value: '', id: '' });
  const upload = useRef<HTMLInputElement>(null);
  const hasText = Boolean(transcript.trim() || note.trim());
  const hasDraft = Boolean(files.length || hasText || summary.trim() || nextAction.trim());
  const pendingFiles = files.length > 0 && !ocrCurrent;
  const duplicateTranscript = transcript.trim() && contact?.progressHistory?.some(record =>
    record.chat?.transcript === transcript.trim(),
  );
  const canSave = Boolean(contact && isChatDate(date) && hasText && !pendingFiles &&
    transcript.length <= MAX_TRANSCRIPT_LENGTH && (!dueDate || (nextAction.trim() && isChatDate(dueDate))));

  useEffect(() => () => operation.current?.abort(), []);

  function invalidateAnalysis() {
    if (!analysis) return;
    setAnalysis(null);
    setSummary('');
    setNextAction('');
    setDueDate('');
  }

  function close() {
    if (busy === 'save') return;
    if (hasDraft) setConfirmClose(true);
    else onClose();
  }

  function addFiles(incoming: File[]) {
    const accepted = incoming.filter(file => /^(image\/(png|jpeg|webp|bmp|gif)|)$/i.test(file.type) &&
      /\.(png|jpe?g|webp|bmp|gif)$/i.test(file.name) && file.size <= 30 * 1024 * 1024);
    const combined = [...files, ...accepted].filter((file, index, list) => list.findIndex(
      other => other.name === file.name && other.size === file.size && other.lastModified === file.lastModified,
    ) === index);
    setError(accepted.length < incoming.length ? '请选择 30 MB 以内的 PNG、JPG、WebP、BMP 或 GIF。'
      : combined.length > 12 ? '一次最多选 12 张截图。' : '');
    const next = combined.slice(0, 12);
    if (next.length !== files.length) setOcrCurrent(false);
    setFiles(next);
    setStatus('');
    if (next.length && !files.length && !transcript.trim()) void recognize(next);
  }

  function reorder(index: number, offset: number) {
    const reordered = files.slice();
    [reordered[index], reordered[index + offset]] = [reordered[index + offset], reordered[index]];
    setFiles(reordered);
    setOcrCurrent(false);
  }

  async function recognize(selected: File[]) {
    const controller = new AbortController();
    operation.current = controller;
    setBusy('ocr');
    setError('');
    setStatus('正在加载文字识别…');
    const timeout = window.setTimeout(() => {
      controller.abort();
      if (operation.current === controller) {
        operation.current = null;
        setBusy(null);
        setStatus('');
        setError('识别超时。可以少选几张，或直接粘贴文字。');
      }
    }, 120000);
    try {
      const result = await recognizeChatScreenshots(selected, setStatus, controller.signal);
      if (controller.signal.aborted) return;
      if (!result.text) throw new Error('没有读到文字，请换一张清晰截图，或直接粘贴对话。');
      invalidateAnalysis();
      setTranscript(result.text);
      setOcrCurrent(true);
      setReviewNeeded(result.unreadable > 0);
      setStatus(result.unreadable ? `有 ${result.unreadable} 张截图未读到文字，请核对后补充。` : '');
    } catch (reason) {
      if (!controller.signal.aborted) {
        setError(reason instanceof Error && /[\u3400-\u9fff]/.test(reason.message)
          ? reason.message : '识别失败，请重试，或直接粘贴对话。');
        setStatus('');
      }
    } finally {
      window.clearTimeout(timeout);
      if (operation.current === controller) {
        operation.current = null;
        setBusy(null);
      }
    }
  }

  async function analyze() {
    if (!contact || !canSave) return;
    const controller = new AbortController();
    operation.current = controller;
    setBusy('analysis');
    setError('');
    setStatus('');
    try {
      const response = await fetch('/api/chat-followup', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(prepareChatAnalysis(transcript, note, contact, date)),
        signal: AbortSignal.any([controller.signal, AbortSignal.timeout(35000)]),
      });
      const data = await response.json().catch(() => null);
      if (!response.ok) throw new Error(data?.message || '暂时无法分析，可以先保存对话。');
      const result = parseChatAnalysis(data, transcriptLines(transcript).length);
      if (!controller.signal.aborted) {
        setAnalysis(result);
        setSummary(result.summary);
        setNextAction(result.nextAction);
        setDueDate(result.dueDate);
      }
    } catch (reason) {
      if (!controller.signal.aborted) setError(reason instanceof Error && /[\u3400-\u9fff]/.test(reason.message)
        ? reason.message : '分析未完成，可以重试或先保存记录。');
    } finally {
      if (operation.current === controller) {
        operation.current = null;
        setBusy(null);
      }
    }
  }

  async function save() {
    if (!contact || !canSave || busy) return;
    const lines = transcriptLines(transcript);
    const text = nextAction.trim();
    const record = {
      date,
      content: summary.trim() || (note.trim() || lines.slice(0, 2).join('；')).slice(0, 160),
      completed: !text,
      chat: {
        transcript: transcript.trim(),
        ...(note.trim() && { note: note.trim() }),
        ...(analysis && { analysis: { stage: analysis.stage, blocker: analysis.blocker, evidence: analysis.evidence } }),
        ...(text && { nextAction: { text, ...(dueDate && { dueDate }) } }),
      },
    };
    const value = JSON.stringify([contact.id, record]);
    if (request.current.value !== value) request.current = { value, id: crypto.randomUUID() };
    setBusy('save');
    setError('');
    try {
      await onSave(contact.id, { ...record, id: request.current.id });
    } catch (reason) {
      setError(reason instanceof Error ? reason.message : '保存失败，请重试。');
      setBusy(null);
    }
  }

  const lines = transcriptLines(transcript);
  const evidence = analysis?.evidence.map(number => lines[number - 1]).filter(Boolean) || [];

  return (
    <WorkspaceDialog title="导入聊天记录" size="import" onClose={close} closeDisabled={busy === 'save'}>
      <fieldset disabled={Boolean(busy) || confirmClose} className="min-w-0 space-y-4">
        <div className="grid gap-4 sm:grid-cols-2">
          <Field label="客户">
            <Select searchable placeholder="选择客户" value={contactId} onValueChange={id => { setContactId(id); invalidateAnalysis(); }}>
              {contacts.map(item => <option key={item.id} value={item.id}>{item.remarkName || item.nickname}</option>)}
            </Select>
          </Field>
          <Field label="沟通日期">
            <Input type="date" value={date} onChange={e => { setDate(e.target.value); invalidateAnalysis(); }} />
          </Field>
        </div>

        <div className="space-y-2 rounded-lg border border-gray-200 p-3"
          onDragOver={event => event.preventDefault()}
          onDrop={event => { event.preventDefault(); if (!busy && !confirmClose) addFiles(Array.from(event.dataTransfer.files)); }}>
          <div className="flex flex-wrap items-center gap-2">
            <input ref={upload} aria-label="聊天截图文件" type="file" className="hidden" accept="image/png,image/jpeg,image/webp,image/bmp,image/gif" multiple
              onChange={event => { addFiles(Array.from(event.currentTarget.files || [])); event.currentTarget.value = ''; }} />
            <Button variant="secondary" onClick={() => upload.current?.click()}><ImagePlus size={16} aria-hidden="true" />选截图</Button>
            {files.length > 0 && <Button variant="secondary" onClick={() => recognize(files)}>
              {ocrCurrent ? '重新识别' : '识别文字'}
            </Button>}
          </div>
          {pendingFiles && transcript.trim() && <p className="text-xs text-gray-600">截图已调整，请重新识别，或核对后直接编辑原文。</p>}
          {files.length === 0 ? <p className="text-xs text-gray-500">可拖入多张截图或一张长截图。图片在本机识别。</p> :
            <ol className="space-y-2">
              {files.map((file, index) => <li key={`${file.name}-${file.size}-${file.lastModified}`} className="flex items-center gap-2">
                <ScreenshotPreview file={file} />
                <Button variant="plain" aria-expanded={preview === file} aria-label={`查看第 ${index + 1} 张截图`}
                  className="min-w-0 flex-1 text-left text-xs text-gray-600" onClick={() => setPreview(preview === file ? undefined : file)}>
                  <span className="truncate">{index + 1}. {file.name}</span>
                </Button>
                <IconButton aria-label={`上移第 ${index + 1} 张截图`} disabled={index === 0} onClick={() => reorder(index, -1)}><ArrowUp size={16} /></IconButton>
                <IconButton aria-label={`下移第 ${index + 1} 张截图`} disabled={index === files.length - 1} onClick={() => reorder(index, 1)}><ArrowDown size={16} /></IconButton>
                <IconButton aria-label={`移除第 ${index + 1} 张截图`} onClick={() => { setFiles(files.filter((_, i) => i !== index)); if (preview === file) setPreview(undefined); setOcrCurrent(false); }}><X size={16} /></IconButton>
              </li>)}
            </ol>}
          {preview && <div className="max-h-[42dvh] overflow-auto rounded-md border border-gray-200"><ScreenshotPreview file={preview} full /></div>}
        </div>

        <Field label="对话原文">
          <Textarea rows={Math.min(8, Math.max(3, lines.length + 1))} value={transcript}
            placeholder="识别结果会显示在这里，也可以粘贴对话"
            aria-invalid={transcript.length > MAX_TRANSCRIPT_LENGTH || undefined}
            onChange={e => { setTranscript(e.target.value); setOcrCurrent(true); invalidateAnalysis(); }} />
        </Field>
        {duplicateTranscript && <p className="text-xs text-gray-600">这段原文已在此客户的跟进历史里。</p>}
        {transcript.length > MAX_TRANSCRIPT_LENGTH && <p role="alert" className="text-sm text-danger-600">对话超过 18,000 字，请分批保存。</p>}
        {(lines.some(line => line.startsWith('待核对：')) || reviewNeeded) &&
          <p className="text-xs text-gray-600">请按截图核对说话人和缺漏，再保存原文。</p>}

        <Field label="线下补充">
          <Textarea rows={2} maxLength={4000} value={note} onChange={e => { setNote(e.target.value); invalidateAnalysis(); }} />
        </Field>
        {hasText && <Button variant="secondary" disabled={!canSave} onClick={analyze}>分析下一步</Button>}

        {analysis && <div className="space-y-2 rounded-lg border border-gray-200 px-3 py-2 text-sm">
          <p><span className="font-medium">阶段</span> {analysis.stage}</p>
          {analysis.blocker && <p className="break-words"><span className="font-medium">卡点</span> {analysis.blocker}</p>}
          {evidence.length > 0 && <details>
            <summary className="cursor-pointer text-gray-600">查看依据</summary>
            <ul className="mt-2 space-y-1 break-words">{evidence.map((line, i) => <li key={i}>{line}</li>)}</ul>
          </details>}
        </div>}

        {hasText && <>
          <Field label="跟进摘要">
            <Textarea rows={2} maxLength={500} value={summary} onChange={event => setSummary(event.target.value)} placeholder="可留空，归档时取沟通要点或对话开头" />
          </Field>
          <div className="grid gap-4 sm:grid-cols-[1fr_11rem]">
            <Field label="下一步">
              <Input value={nextAction} maxLength={300} onChange={event => {
                setNextAction(event.target.value);
                if (!event.target.value.trim()) setDueDate('');
              }} />
            </Field>
            {nextAction.trim() && <Field label="待办日期">
              <Input type="date" value={dueDate} onChange={event => setDueDate(event.target.value)} />
            </Field>}
          </div>
        </>}
      </fieldset>
      <WorkspaceDialogFooter>
        <div className="w-full">
        {error && <p role="alert" className="mb-2 text-sm text-danger-600">{error}</p>}
        {!confirmClose && (busy === 'analysis' || status) && <p role="status" className="mb-2 text-sm text-gray-600">{busy === 'analysis' ? '正在分析…' : status}</p>}
        {confirmClose ? <div className="flex flex-wrap items-center justify-end gap-2">
          <p className="mr-auto text-sm">要放弃这次导入吗？</p>
          <Button variant="secondary" onClick={() => setConfirmClose(false)}>继续编辑</Button>
          <Button variant="primary" onClick={onClose}>放弃</Button>
        </div> : <div className="flex justify-end gap-2">
          <Button variant="secondary" disabled={busy === 'save'} onClick={close}>取消</Button>
          <Button variant="primary" disabled={!canSave || Boolean(busy)} onClick={save}>
            {busy === 'save' ? '正在保存…' : nextAction.trim() ? '保存记录与待办' : '保存记录'}
          </Button>
        </div>}
        </div>
      </WorkspaceDialogFooter>
    </WorkspaceDialog>
  );
}
