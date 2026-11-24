import assert from 'node:assert/strict';
import test from 'node:test';
import { formatChatLines, mergeTranscriptPages } from '../services/chatTranscript.ts';
import { isChatDate, parseChatAnalysis, prepareChatAnalysis } from '../services/chatAnalysis.ts';
import type { Contact } from '../types.ts';

test('formats source lines by bubble position without inventing a sender', () => {
  const line = (text: string, x0: number, x1: number, y0: number) => ({ text, bbox: { x0, x1, y0, y1: y0 + 15 } });
  assert.deepEqual(formatChatLines([
    line('周五给您发对比表', 235, 335, 100), line('10:30', 157, 200, 20),
    line('现 有保 障够吗？', 55, 205, 60), line('未知来源', 120, 248, 140),
  ], 390), ['10:30', '客户：现有保障够吗？', '我：周五给您发对比表', '待核对：未知来源']);
});

test('joins screenshot overlap and keeps isolated short replies', () => {
  assert.deepEqual(mergeTranscriptPages([
    ['客户：之前已经买过一份医疗保险', '我：好的', '客户：我得先问一下我太太'],
    ['我：好的', '客户：我得先问一下我太太', '我：我周五发一份对比表'],
    ['我：我周五发一份对比表', '客户：行'],
    ['客户：行', '我：收到'],
  ]), ['客户：之前已经买过一份医疗保险', '我：好的', '客户：我得先问一下我太太',
    '我：我周五发一份对比表', '客户：行', '客户：行', '我：收到']);
});

test('analysis references only available original lines and validates date', () => {
  const result = parseChatAnalysis({
    summary: '确认现有保障', stage: '了解需求', blocker: '保障范围待确认',
    nextAction: '看现有保单', dueDate: '2026-02-30', evidence: [2, 0, 2, 3, '1', 1.1],
  }, 2);
  assert.deepEqual(result.evidence, [2]);
  assert.equal(result.dueDate, '');
  assert.equal(isChatDate('2028-02-29'), true);
  assert.throws(() => parseChatAnalysis({ summary: '摘要', stage: '未知阶段' }, 5));
});

test('analysis payload keeps line mapping and excludes raw profile identifiers', () => {
  const contact = { remarkName: '示例客户', phoneNumber: '13800000000', idCard: '310000200001010000',
    progressHistory: [{ id: 'r', date: '2026-11-20', content: '示例客户确认联系时间' }] } as Contact;
  const result = prepareChatAnalysis('客户：13800000000\n\n我：我周五发方案', '保单号 P-123456', contact, '2026-11-24');
  assert.equal(result.lines.length, 2);
  assert.match(result.lines[1], /我周五发方案/);
  assert.doesNotMatch(JSON.stringify(result), /示例客户|13800000000|P-123456|310000200001010000/);
});
