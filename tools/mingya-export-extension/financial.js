/* Generated from services/mingyaFinancial.ts; do not edit by hand. */
(function(root){const exports={};
"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.money = money;
exports.financialDate = financialDate;
exports.financialFromDetail = financialFromDetail;
const text = (v) => v == null ? '' : String(v).trim();
function money(v) {
    const value = text(v).replace(/[,，]/g, '');
    if (!/^\d+(\.\d+)?$/.test(value) || !Number.isFinite(Number(value)))
        return '';
    return String(Number(value));
}
function financialDate(v) {
    const s = text(v), match = /^(\d{4})[-/.](\d{1,2})[-/.](\d{1,2})/.exec(s);
    if (!match)
        return '';
    const date = `${match[1]}-${match[2].padStart(2, '0')}-${match[3].padStart(2, '0')}`;
    const parsed = new Date(date + 'T00:00:00Z');
    return Number.isFinite(parsed.getTime()) && parsed.toISOString().slice(0, 10) === date ? date : '';
}
function sum(values) { return String(values.reduce((n, v) => n + Math.round(Number(v) * 10000), 0) / 10000); }
function financialFromDetail(detail) {
    const p = detail || {}, risks = (Array.isArray(p.riskList) ? p.riskList : []).filter(r => r && typeof r === 'object');
    const active = risks.filter(r => r.state === '01');
    const relevant = active.length ? active : risks;
    const fee = money(p.fee);
    const riskAmounts = relevant.map(r => money(r.prem));
    const fallback = fee === '' && riskAmounts.length > 0 && riskAmounts.every(v => v !== '') ? sum(riskAmounts) : '';
    const frequencies = [...new Set(relevant.map(r => text(r.payType)).filter(Boolean))];
    const frequency = frequencies.length === 1 ? { Y: '期交-年', M: '期交-月' }[frequencies[0]] || '' : '';
    const ends = [...new Set(relevant.map(r => financialDate(r.payEndDate)).filter(Boolean))];
    // A policy-level paid fact is valid only when all positive-premium risks agree.
    const payable = relevant.filter(r => Number(money(r.prem)) > 0);
    const paidDates = payable.map(r => financialDate(r.lastPayDate));
    const paidAmounts = payable.map(r => money(r.lastPrem));
    const paid = payable.length > 0 && paidDates.every(d => d && d === paidDates[0]) && paidAmounts.every(a => a !== '');
    const note = text(p.nextContent);
    return { mappingVersion: 2, periodicPremium: fee !== '' ? fee : fallback, termTotalPremium: money(p.totalFee),
        premiumBasis: fee !== '' ? 'detail.fee' : fallback !== '' ? 'detail.riskList.prem' : 'missing',
        nextPayDate: financialDate(p.nextPayDate), nextPremium: money(p.nextPrem), nextPremiumIsReference: !!note,
        nextPaymentNote: note, lastPaidDate: paid ? paidDates[0] : '', lastPaidPremium: paid ? sum(paidAmounts) : '',
        paymentFrequency: frequency, paymentEndDate: ends.length === 1 ? ends[0] : '' };
}

root.MingyaFinancial=exports;})(globalThis);
