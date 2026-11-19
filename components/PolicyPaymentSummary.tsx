import React from 'react';
import { inactive, nextPayment, remainingInstallments, today, type ManagedPolicy } from '../services/renewal';

export function formatMoney(value: unknown) {
  if (value === null || value === undefined || String(value).trim() === '') return '待补充';
  const amount = Number(String(value).replace(/[,，]/g, ''));
  return Number.isFinite(amount)
    ? '¥ ' + amount.toLocaleString('zh-CN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })
    : '待补充';
}

export function paymentStatus(policy: ManagedPolicy) {
  if (inactive(policy.status)) return '已退出续期提醒';
  if (remainingInstallments(policy) === 0) return '缴费期已完成';
  if (/趸|一次/.test(policy.paymentFrequency || '') || /趸/.test(policy.paymentYears || '')) return '一次性缴费';
  return '下次缴费待确认';
}

export function PaymentDate({ date, estimated }: { date: string; estimated?: boolean }) {
  const days = Math.round((Date.parse(date + 'T00:00:00+08:00') - Date.parse(today() + 'T00:00:00+08:00')) / 86400000);
  const label = days < 0 ? `逾期 ${-days} 天` : days === 0 ? '今天缴费' : `剩余 ${days} 天`;
  return <div className="flex flex-wrap items-center gap-2 text-sm">
    <span className="whitespace-nowrap tabular-nums">{date}</span>
    {estimated && <span className="text-xs text-gray-500">预计</span>}
    {Number.isFinite(days) && <span className={`tag ${days <= 7 ? 'tag-urgent' : ''}`}>{label}</span>}
  </div>;
}

export default function PolicyPaymentSummary({ policy, amount = true }: { policy: ManagedPolicy; amount?: boolean }) {
  const next = nextPayment(policy);
  if (!next) return <span className="text-sm text-gray-500">{paymentStatus(policy)}</span>;
  return <div className="space-y-2">
    <PaymentDate date={next.date} estimated={next.estimated} />
    {amount && <div className="flex items-baseline gap-2 text-sm tabular-nums"><span className="text-xs text-gray-500">本期应缴</span>{formatMoney(next.amount)}</div>}
  </div>;
}
