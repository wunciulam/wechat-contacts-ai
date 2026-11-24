import type { Contact } from '../types';
import { transcriptLines } from './chatTranscript.ts';

export const CHAT_STAGES = ['待确认', '已接触', '了解需求', '比较方案', '等决定', '已成交', '暂缓'] as const;
export interface ChatAnalysis {
  summary: string;
  stage: (typeof CHAT_STAGES)[number];
  blocker: string;
  evidence: number[];
  nextAction: string;
  dueDate: string;
}

export function isChatDate(value: string) {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(value)) return false;
  const date = new Date(value + 'T00:00:00Z');
  return !Number.isNaN(date.getTime()) && date.toISOString().slice(0, 10) === value;
}

export function chinaDate() {
  return new Intl.DateTimeFormat('sv-SE', { timeZone: 'Asia/Shanghai' }).format(new Date());
}

function redact(text: string, names: string[]) {
  for (const name of names) if (name && name.length >= 2) text = text.replaceAll(name, '[客户]');
  return text
    .replace(/(?<!\d)(?:\+?86[ -]?)?1[3-9]\d(?:[ -]?\d){8}(?!\d)/g, '[手机号]')
    .replace(/(?<![\d-])\d{15,19}[Xx]?(?![\d-])/g, '[长号码]')
    .replace(/((?:身份证|证件号|保单号|银行卡号|账号)\s*[:：]?\s*)[\w-]{5,}/g, '$1[号码]');
}

export function prepareChatAnalysis(transcript: string, note: string, contact: Contact, date: string) {
  const names = [contact.remarkName, contact.nickname, contact.phoneNumber, contact.idCard, contact.bankAccount, contact.address]
    .map(value => String(value || '').trim()).filter(Boolean).sort((a, b) => b.length - a.length);
  const history = (contact.progressHistory || [])
    .slice().sort((a, b) => b.date.localeCompare(a.date)).slice(0, 5)
    .map(record => ({
      date: record.date,
      summary: redact(record.content.slice(0, 600), names),
      nextAction: record.chat?.nextAction && {
        text: redact(record.chat.nextAction.text.slice(0, 240), names),
        dueDate: record.chat.nextAction.dueDate,
        completed: Boolean(record.completed),
      },
    }));
  return {
    date,
    lines: transcriptLines(transcript).map(line => redact(line, names)),
    note: redact(note.trim(), names),
    history,
  };
}

export function parseChatAnalysis(value: unknown, lineCount: number): ChatAnalysis {
  if (!value || typeof value !== 'object') throw new Error('分析结果格式有误，请重试。');
  const data = value as Record<string, unknown>;
  const text = (key: string, max: number, required = false) => {
    const field = typeof data[key] === 'string' ? data[key].trim() : '';
    if ((required && !field) || field.length > max) throw new Error('分析结果格式有误，请重试。');
    return field;
  };
  const stage = CHAT_STAGES.find(item => item === data.stage);
  if (!stage) throw new Error('分析结果格式有误，请重试。');
  const evidence = Array.isArray(data.evidence) ? [...new Set(data.evidence.filter(
    (number): number is number => Number.isInteger(number) && number >= 1 && number <= lineCount,
  ))].slice(0, 5) : [];
  const dueDate = text('dueDate', 10);
  return {
    summary: text('summary', 500, true),
    stage,
    blocker: text('blocker', 300),
    evidence,
    nextAction: text('nextAction', 300),
    dueDate: isChatDate(dueDate) ? dueDate : '',
  };
}
