import * as XLSX from "xlsx";
import type { Contact, Policy } from "../types";
export interface Payment {
  date: string;
  amount: string;
  status: string;
  confirmedAt?: string;
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
export const key = (p: Partial<ManagedPolicy>) =>
  `${p.company?.trim()}|${p.policyNumber?.trim()}`;
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
    const prev = map.get(key(p));
    if (!prev) {
      map.set(key(p), structuredClone(p));
      continue;
    }
    const payments = new Map(prev.payments.map((x) => [x.date, x]));
    for (const x of p.payments) {
      const before = payments.get(x.date);
      payments.set(x.date, {
        ...before,
        ...x,
        contactedAt: before?.contactedAt,
        history: [
          ...(before?.history || []),
          ...(before && before.status !== x.status
            ? [
                {
                  at: new Date().toISOString(),
                  from: before.status,
                  to: x.status,
                  source: p.source || "导入",
                },
              ]
            : []),
        ],
      });
    }
    const nonempty = Object.fromEntries(
      Object.entries(p).filter(
        ([k, v]) =>
          v !== "" && v !== undefined && !["id", "payments"].includes(k),
      ),
    );
    map.set(key(p), {
      ...prev,
      ...nonempty,
      id: prev.id,
      ...(p.payments.length && prev.source && !prev.payments.length
        ? { status: prev.status }
        : {}),
      payments: [...payments.values()].sort((a, b) =>
        a.date.localeCompare(b.date),
      ),
    });
  }
  return [...map.values()];
}
export function latestPayment(p: ManagedPolicy) {
  return p.payments
    .filter((x) => x.status === "未缴费")
    .sort((a, b) => b.date.localeCompare(a.date))[0];
}
export function today() {
  return new Intl.DateTimeFormat("sv-SE", { timeZone: "Asia/Shanghai" }).format(
    new Date(),
  );
}
export function dueItems(policies: ManagedPolicy[], now = today()) {
  const end = new Date(`${now}T00:00:00Z`);
  end.setUTCDate(end.getUTCDate() + 30);
  const limit = end.toISOString().slice(0, 10);
  return policies
    .filter((p) => !inactive(p.status))
    .flatMap((p) => {
      const pay = latestPayment(p);
      const items: {
        policy: ManagedPolicy;
        type: "payment" | "renewal";
        date: string;
        amount: string;
      }[] = [];
      if (pay && pay.date <= limit)
        items.push({
          policy: p,
          type: "payment",
          date: pay.date,
          amount: pay.amount,
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
      all.push({ ...p, applicantId: c.id, payments: [] });
  return mergePolicies(
    [],
    all.filter((p) => p.policyNumber),
  );
}
