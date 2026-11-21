import { detailNextPayment, reconcileMingyaPayments } from './mingyaPayments.ts';
import * as XLSX from "xlsx";
import type { Contact, Policy } from "../types";
export interface Payment {
  date: string;
  amount: string;
  status: string;
  confirmedAt?: string;
  estimated?: boolean;
  paidAt?: string;
  amountReference?: boolean;
  source?: string;
  sourceCapturedAt?: string;
  contactedAt?: string;
  history?: { at: string; from: string; to: string; source: string }[];
}
export interface ManagedPolicy extends Policy {
  applicantId?: string;
  insuredId?: string;
  phone?: string;
  document?: string;
  payments: Payment[];
  expiryDate?: string;
  renewed?: boolean;
  source?: string;
  importedAt?: string;
  applicationNumber?: string;
}
export interface RenewalData {
  policies: ManagedPolicy[];
  settings: { email: string; time: string; enabled: boolean };
  imports: { at: string; files: string[]; count: number }[];
}
export const emptyData: RenewalData = {
  policies: [],
  settings: { email: "lamwunciu@qq.com", time: "09:00", enabled: false },
  imports: [],
};
export const inactive = (s: string) => /撤单|退保|拒保|终止|失效/.test(s || "");
export const normalizedPolicyNumber = (value: unknown) => {
  const clean = String(value ?? "").trim().replace(/[^0-9A-Za-z]/g, "").toUpperCase();
  return clean.replace(/^0+(?=[0-9A-Z])/, "");
};
const legacyKey = (p: Partial<ManagedPolicy>) =>
  normalizedPolicyNumber(p.policyNumber)
    ? `${p.company?.trim()}|${normalizedPolicyNumber(p.policyNumber)}`
    : `manual:${p.id}`;
export const key = (p: Partial<ManagedPolicy>) => p.mingya?.key ? `mingya:${p.mingya.key}` : legacyKey(p);
const text = (v: unknown) => String(v ?? "").trim();
export function date(v: unknown) {
  if (typeof v === "number") {
    const d = XLSX.SSF.parse_date_code(v);
    return d
      ? `${d.y}-${String(d.m).padStart(2, "0")}-${String(d.d).padStart(2, "0")}`
      : "";
  }
  const s = text(v).replace(/\//g, "-");
  if (!/^\d{4}-\d{2}-\d{2}/.test(s)) return "";
  const d = s.slice(0, 10);
  const parsed = new Date(d + "T00:00:00Z");
  return !isNaN(parsed.getTime()) && parsed.toISOString().slice(0, 10) === d
    ? d
    : "";
}
export function parseWorkbook(
  buffer: ArrayBuffer,
  source: string,
): ManagedPolicy[] {
  const w = XLSX.read(buffer, { type: "array" });
  const output: ManagedPolicy[] = [];
  for (const sheet of w.SheetNames) {
    const rows = XLSX.utils.sheet_to_json<any[]>(w.Sheets[sheet], {
      header: 1,
      defval: "",
    });
    const hi = rows.findIndex((r) => r.some((x) => text(x) === "保单号"));
    if (hi < 0) continue;
    const headers = rows[hi].map(text);
    for (const row of rows.slice(hi + 1)) {
      const get = (...names: string[]) => {
        for (const n of names) {
          const indexes = headers.flatMap((h, i) => (h === n ? [i] : []));
          for (const i of indexes.reverse()) if (text(row[i])) return row[i];
        }
        return "";
      };
      const num = text(get("保单号"));
      if (!num) {
        if (text(get("保单状态")) === "撤单") continue;
        if (row.some((v) => text(v)))
          throw new Error(`${source}：存在缺少保单号的非撤单记录，请先补齐`);
        continue;
      }
      const due = date(get("应缴费时间"));
      output.push({
        id: crypto.randomUUID(),
        policyNumber: num,
        company: text(get("保险公司")),
        productName: text(get("产品名称")),
        premium: text(get("保费", "应缴保费")),
        effectiveDate: date(get("生效日期", "承保日期")),
        status: text(get("保单状态")),
        applicant: text(get("投保人姓名", "投保人")),
        insured: text(get("被保人")),
        phone: text(get("手机号", "投保人手机")),
        document: text(get("投保人证件号码", "投保人证件号")),
        paymentYears: text(get("缴费期间", "缴费年限")),
        paymentFrequency: text(get("缴费方式")),
        coveragePeriod: text(get("保障期间", "保险期间", "保障期限")),
        expiryDate: date(get("保障到期日", "保险止期")),
        payments: due
          ? [
              {
                date: due,
                amount: text(get("应缴保费")),
                status: text(get("缴费状态")),
                confirmedAt: date(get("确认时间")),
              },
            ]
          : [],
        source,
        applicationNumber: text(get("投保单号")),
        importedAt: new Date().toISOString(),
      });
    }
  }
  if (!output.length) throw new Error(`${source}：未找到含保单号的有效记录`);
  return output;
}
const suffix = (s?: string) => text(s).replace(/\s/g, "").slice(-4);
export function candidates(
  name: string,
  phone: string | undefined,
  document: string | undefined,
  contacts: Contact[],
) {
  return contacts
    .filter((c) => c.remarkName === name || c.nickname === name)
    .map((c) => {
      const ph =
        phone && c.phoneNumber ? suffix(phone) === suffix(c.phoneNumber) : null;
      const id =
        document && c.idCard ? suffix(document) === suffix(c.idCard) : null;
      return {
        contact: c,
        strong: (ph === true || id === true) && ph !== false && id !== false,
        conflict: ph === false || id === false,
      };
    });
}
export function mergePolicies(old: ManagedPolicy[], incoming: ManagedPolicy[]) {
  const map = new Map(old.map((p) => [key(p), structuredClone(p)]));
  for (const p of incoming) {
    let prev = map.get(key(p)) || [...map.values()].find(old => old.id === p.id);
    if (!prev && !p.mingya) {
      const related=[...map.values()].filter(old=>old.mingya && legacyKey(old)===legacyKey(p));
      prev=related.find(old=>date(old.effectiveDate)===date(p.effectiveDate)) || (related.length===1?related[0]:undefined);
    }
    const targetKey=prev?.mingya && !p.mingya ? key(prev) : key(p);
    if (prev && key(prev)!==targetKey) map.delete(key(prev));
    if (!prev) {
      map.set(key(p), structuredClone(p));
      continue;
    }
    const payments = new Map((prev.payments||[]).map((x) => [x.date, x]));
    for (const x of p.payments) {
      const before=payments.get(x.date);
      const histories=[...(before?.history||[]),...(x.history||[])];
      if(before&&before.status!==x.status&&!histories.some(h=>h.from===before.status&&h.to===x.status)) {
        histories.push({at:x.sourceCapturedAt||p.mingya?.capturedAt||new Date().toISOString(),from:before.status,to:x.status,source:x.source||p.source||'导入'});
      }
      const history=[...new Map(histories.map(h=>[`${h.at}|${h.from}|${h.to}|${h.source}`,h])).values()];
      payments.set(x.date,{...before,...x,contactedAt:before?.contactedAt,history});
    }
    const nonempty = Object.fromEntries(
      Object.entries(p).filter(
        ([k, v]) =>
          v !== "" && v !== undefined && !["id", "payments"].includes(k),
      ),
    );
    map.set(targetKey, {
      ...prev,
      ...nonempty,
      id: prev.id,
      ...(p.payments.length && !p.mingya
        ? {
            status: prev.status || p.status,
            premium: prev.premium || p.premium,
            effectiveDate: prev.effectiveDate || p.effectiveDate,
          }
        : {}),
      payments: reconcileMingyaPayments([...payments.values()].sort((a,b)=>a.date.localeCompare(b.date)), {...prev,...nonempty} as ManagedPolicy),
    });
  }
  return [...map.values()];
}
export function latestPayment(p: ManagedPolicy) {
  const latest = [...p.payments].sort((a, b) =>
    b.date.localeCompare(a.date),
  )[0];
  return latest?.status === "未缴费" ? latest : undefined;
}
const shanghaiDateFormatter = new Intl.DateTimeFormat("sv-SE", { timeZone: "Asia/Shanghai" });
export function today() {
  return shanghaiDateFormatter.format(new Date());
}
export function dueItems(policies: ManagedPolicy[], now = today()) {
  const end = new Date(`${now}T00:00:00Z`);
  end.setUTCDate(end.getUTCDate() + 30);
  const limit = end.toISOString().slice(0, 10);
  return policies
    .filter((p) => !inactive(p.status) && !p.status.includes('明亚状态'))
    .flatMap((p) => {
      const pay = nextPayment(p);
      const items: {
        policy: ManagedPolicy;
        type: "payment" | "renewal";
        date: string;
        amount: string;
        estimated?: boolean;
      }[] = [];
      if (pay && pay.date <= limit)
        items.push({
          policy: p,
          type: "payment",
          date: pay.date,
          amount: pay.amount,
          estimated: pay.estimated,
        });
      if (p.expiryDate && !p.renewed && p.expiryDate <= limit)
        items.push({
          policy: p,
          type: "renewal",
          date: p.expiryDate,
          amount: "",
        });
      return items;
    })
    .sort((a, b) => a.date.localeCompare(b.date));
}
export function migrate(contacts: Contact[]) {
  const all: ManagedPolicy[] = [];
  for (const c of contacts)
    for (const p of c.policies || [])
      all.push({
        ...p,
        applicantId: c.id,
        payments: (p as ManagedPolicy).payments || [],
      });
  return mergePolicies([], all);
}

// Calculate on the original anniversary to avoid month-end/leap-year drift.
export function addMonths(anchor: string, months: number): string {
  const [y, m, d] = anchor.split("-").map(Number);
  const target = new Date(Date.UTC(y, m - 1 + months, 1));
  const last = new Date(
    Date.UTC(target.getUTCFullYear(), target.getUTCMonth() + 1, 0),
  ).getUTCDate();
  target.setUTCDate(Math.min(d, last));
  return target.toISOString().slice(0, 10);
}
export function nextPayment(p: ManagedPolicy): Payment | undefined {
  if (inactive(p.status) || p.status.includes('明亚状态')) return;
  const detail=detailNextPayment(p,p.payments||[]);if(detail)return detail;
  const latest = [...reconcileMingyaPayments(p.payments||[],p)].sort((a, b) =>
    b.date.localeCompare(a.date),
  )[0];
  if (latest?.status === "未缴费") return latest;
  if (latest && latest.status !== "已缴费") return;
  const frequency = p.paymentFrequency || "";
  if (/趸|一次/.test(frequency) || /趸/.test(p.paymentYears || "")) return;
  const months = /半年/.test(frequency)
    ? 6
    : /季/.test(frequency)
      ? 3
      : /月/.test(frequency)
        ? 1
        : /年/.test(frequency)
          ? 12
          : 0;
  const years = /^(\d+)年$/.exec(p.paymentYears || "");
  if (!months || !date(p.effectiveDate) || (!p.paymentEndDate && !years))
    return;
  const end =
    p.paymentEndDate || addMonths(p.effectiveDate, Number(years![1]) * 12);
  let candidate = p.effectiveDate;
  if (latest) {
    let n = Math.max(
      1,
      (Number(latest.date.slice(0, 4)) - Number(p.effectiveDate.slice(0, 4))) *
        12 +
        Number(latest.date.slice(5, 7)) -
        Number(p.effectiveDate.slice(5, 7)),
    );
    n = Math.floor(n / months);
    candidate = addMonths(p.effectiveDate, n * months);
    // Payment.date is the imported installment DUE date, never the actual
    // payment/confirmation timestamp. A conflicting due date needs reconciliation;
    // do not silently assign it to another contractual installment.
    if (candidate !== latest.date) return;
    candidate = addMonths(p.effectiveDate, (n + 1) * months);
  }
  if (candidate >= end) return;
  return {
    date: candidate,
    amount: latest?.amount || p.premium,
    status: "未缴费",
    estimated: true,
  };
}
export function projectContacts(
  contacts: Contact[],
  policies: ManagedPolicy[],
  bothRoles = false,
): Contact[] {
  const known = new Set(policies.map(key));
  const knownIds = new Set(policies.map(p => p.id));
  return contacts.map((c) => {
    const associated = policies.filter(
      (p) => p.applicantId === c.id || (bothRoles && p.insuredId === c.id),
    );
    return {
      ...c,
      policies: [
        ...(c.policies || []).filter((p) => !known.has(key(p)) && !knownIds.has(p.id)),
        ...associated,
      ],
    };
  });
}

// Remaining contractual installments, including the next unpaid installment.
export function remainingInstallments(p: ManagedPolicy): number | undefined {
  const frequency = p.paymentFrequency || '';
  const months = /半年/.test(frequency) ? 6 : /季/.test(frequency) ? 3 : /月/.test(frequency) ? 1 : /年/.test(frequency) ? 12 : 0;
  const years = /^(\d+)年$/.exec(p.paymentYears || '');
  if (!months || !date(p.effectiveDate) || (!date(p.paymentEndDate) && !years)) return;
  const end = date(p.paymentEndDate) || addMonths(p.effectiveDate, Number(years![1]) * 12);
  const next = nextPayment(p);
  if (!next) {
    const last = [...p.payments].sort((a,b)=>b.date.localeCompare(a.date))[0];
    return last?.status === '已缴费' && addMonths(last.date, months) >= end ? 0 : undefined;
  }
  let count = 1;
  let index = Math.floor(((Number(next.date.slice(0,4))-Number(p.effectiveDate.slice(0,4)))*12 + Number(next.date.slice(5,7))-Number(p.effectiveDate.slice(5,7))) / months) + 1;
  if (next.date >= end) return undefined;
  for (let i = Math.max(1,index); i < 2400; i++) {
    const candidate = addMonths(p.effectiveDate, i * months);
    if (candidate >= end) return count;
    if (candidate > next.date) count++;
  }
  return undefined;
}
