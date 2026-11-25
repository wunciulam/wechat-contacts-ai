import type {
  Contact,
  ProgressRecord,
  ChatMessage,
  FollowupAnalysis,
  FollowupRules,
} from "../types.ts";
import { isChatDate, chinaDate } from "./chatAnalysis.ts";
export const STAGES = [
  "建立联系",
  "需求确认",
  "方案比较",
  "方案确认",
  "承保",
] as const;
export const DEFAULT_RULES: FollowupRules = {
  unanswered: 3,
  following: 14,
  paused: 30,
};
export const notes = (c: Contact) =>
  (c.progressHistory || [])
    .filter((r) => r.kind !== "task")
    .slice()
    .sort((a, b) => b.date.localeCompare(a.date) || b.id.localeCompare(a.id));
export const tasks = (c: Contact) =>
  (c.progressHistory || []).filter((r) => r.kind === "task" && !r.completed);
export function addDays(date: string, n: number) {
  const d = new Date(date + "T00:00:00Z");
  d.setUTCDate(d.getUTCDate() + n);
  return d.toISOString().slice(0, 10);
}
export const daysBetween = (a: string, b: string) =>
  Math.floor(
    (Date.parse(b + "T00:00:00Z") - Date.parse(a + "T00:00:00Z")) / 86400000,
  );
export function lastEffective(c: Contact, today = chinaDate()) {
  return (
    notes(c).find(
      (r) =>
        r.date <= today && r.channel !== "attempt" && r.channel !== "internal",
    )?.date ||
    ((c as Contact&{progressDeletedIds?:string[]}).progressDeletedIds?.length?"":isChatDate(c.lastDate || "") && c.lastDate! <= today ? c.lastDate : "")
  );
}
export function revision(c: Contact) {
  const v = JSON.stringify(
    (c.progressHistory || [])
      .map((r) => [
        r.id,
        r.date,
        r.content,
        r.kind,
        r.channel,
        r.completed,
        r.updatedAt,
        r.chat?.messages || r.chat?.transcript,
      ])
      .sort((a, b) => String(a[0]).localeCompare(String(b[0]))),
  );
  let a = 2166136261,
    b = 5381;
  for (let i = 0; i < v.length; i++) {
    a = Math.imul(a ^ v.charCodeAt(i), 16777619);
    b = Math.imul(b, 33) ^ v.charCodeAt(i);
  }
  return (a >>> 0).toString(16) + (b >>> 0).toString(16);
}
export function taskBuckets(contacts: Contact[], today = chinaDate()) {
  const all = contacts
    .flatMap((contact) => tasks(contact).map((task) => ({ contact, task })))
    .sort(
      (a, b) =>
        (a.task.date || "9999").localeCompare(b.task.date || "9999") ||
        a.task.id.localeCompare(b.task.id),
    );
  return {
    now: all.filter((x) => isChatDate(x.task.date) && x.task.date <= today),
    future: all.filter((x) => isChatDate(x.task.date) && x.task.date > today),
    undated: all.filter((x) => !isChatDate(x.task.date)),
  };
}
export function validEvidence(
  c: Contact,
  e: { recordId: string; quote: string },
) {
  const r = notes(c).find((r) => r.id === e.recordId);
  return Boolean(
    r &&
      e.quote.trim() &&
      (r.content.includes(e.quote) ||
        r.chat?.transcript?.includes(e.quote) ||
        r.chat?.messages?.some((m) => m.text.includes(e.quote))),
  );
}
export function leadGroups(
  contacts: Contact[],
  rules = DEFAULT_RULES,
  today = chinaDate(),
) {
  const follow: Contact[] = [],
    activate: Contact[] = [],
    check: Contact[] = [];
  for (const c of contacts) {
    const analysis = c.followupAnalysis,
      last = lastEffective(c, today);
    if (
      c.doNotContact ||
      analysis?.doNotContact ||
      (c.followupSnoozedUntil && c.followupSnoozedUntil > today)
    )
      continue;
    const opportunity = analysis?.opportunity,
      fresh = analysis?.revision === revision(c),
      hasTask = tasks(c).some(
        (t) =>
          t.content === analysis?.nextAction ||
          Boolean(
            t.sourceRecordId &&
              opportunity?.evidenceIds.includes(t.sourceRecordId),
          ),
      );
    if (fresh && opportunity?.date && opportunity.date > today) continue;
    const proved =
      opportunity &&
      analysis?.evidence.some(
        (e) =>
          opportunity.evidenceIds.includes(e.recordId) && validEvidence(c, e),
      );
    const reference =
      opportunity &&
      notes(c)
        .filter((r) => opportunity.evidenceIds.includes(r.id))
        .map((r) => r.date)
        .sort()
        .at(-1);
    const ready =
      opportunity?.trigger !== "question" ||
      Boolean(reference && daysBetween(reference, today) >= rules.unanswered) ||
      Boolean(opportunity?.date && opportunity.date <= today);
    if (
      !hasTask &&
      fresh &&
      proved &&
      ready &&
      (!opportunity.date || opportunity.date <= today)
    ) {
      (opportunity.type === "reactivate" ? activate : follow).push(c);
      continue;
    }
    if (
      !hasTask &&
      last &&
      daysBetween(last, today) >=
        (analysis?.stage === "暂缓" ? rules.paused : rules.following)
    )
      check.push(c);
  }
  return { follow, activate, check };
}
export function parseMessages(text: string, reference = ""): ChatMessage[] {
  let date = "",
    time = "";
  const year = reference.slice(0, 4);
  let index = 0;
  return text.split(/\r?\n/).flatMap((raw) => {
    let v = raw.trim();
    if (!v) return [];
    const full = v.match(
        /^(\d{4})[年\-/.](\d{1,2})[月\-/.](\d{1,2})日?\s*(.*)$/,
      ),
      short = !full && v.match(/^(\d{1,2})月(\d{1,2})日\s*(.*)$/);
    if (full) {
      date = [full[1], full[2].padStart(2, "0"), full[3].padStart(2, "0")].join(
        "-",
      );
      v = full[4];
      time = "";
    } else if (short) {
      date = year
        ? year +
          "-" +
          short[1].padStart(2, "0") +
          "-" +
          short[2].padStart(2, "0")
        : "";
      v = short[3];
      time = "";
    } else if (/^(今天|昨天)/.test(v)) {
      date = reference
        ? v.startsWith("昨天")
          ? addDays(reference, -1)
          : reference
        : "";
      v = v.replace(/^(今天|昨天)\s*/, "");
      time = "";
    } else if (/^(星期|周)[一二三四五六日天]/.test(v)) {
      date = "";
      time = "";
      v = v.replace(/^(星期|周)[一二三四五六日天]\s*/, "");
    }
    const clock = v.match(
      /^(?:(上午|下午|晚上|凌晨|中午)\s*)?(\d{1,2})[:：](\d{2})\s*(.*)$/,
    );
    if (clock) {
      let h = Number(clock[2]);
      if (["下午", "晚上"].includes(clock[1]) && h < 12) h += 12;
      time = String(h).padStart(2, "0") + ":" + clock[3];
      v = clock[4];
    }
    if (!v) return [];
    const role = v.match(/^(客户|对方|我|自己|待核对)[:：]\s*(.*)$/);
    const speaker = role
      ? ["我", "自己"].includes(role[1])
        ? "self"
        : ["客户", "对方"].includes(role[1])
          ? "customer"
          : "unknown"
      : "unknown";
    return [
      {
        id: "message-" + index++,
        date: isChatDate(date) ? date : "",
        time,
        speaker,
        text: role ? role[2] : v,
      },
    ];
  });
}
export function mergeMessages(
  existing: ChatMessage[],
  incoming: ChatMessage[],
) {
  // Only remove exact known-time identities. Repeated short/time-unknown replies remain intact.
  const result = [...existing];
  const known = new Set(
    existing.filter((m) => m.date && m.time).map(messageKey),
  );
  for (const m of incoming) {
    const key = messageKey(m);
    if (m.date && m.time && known.has(key)) continue;
    result.push(m);
    if (m.date && m.time) known.add(key);
  }
  return result.sort(
    (a, b) =>
      a.date.localeCompare(b.date) ||
      (a.time && b.time ? a.time.localeCompare(b.time) : 0),
  );
}
export function messageKey(m: ChatMessage) {
  return JSON.stringify([
    m.date,
    m.time,
    m.speaker,
    m.text.normalize("NFKC").trim(),
  ]);
}
export function groupMessages(messages: ChatMessage[]) {
  const groups = new Map<string, ChatMessage[]>();
  for (const m of messages) {
    const rows = groups.get(m.date) || [];
    rows.push(m);
    groups.set(m.date, rows);
  }
  return [...groups].sort(([a], [b]) => b.localeCompare(a));
}
export function dailyDraft(messages: ChatMessage[]) {
  return messages
    .filter((m) => m.text.trim())
    .map(
      (m) =>
        (m.speaker === "customer"
          ? "客户"
          : m.speaker === "self"
            ? "我"
            : "待核对") +
        "：" +
        m.text,
    )
    .join("；");
}
export function importRecords(
  c: Contact,
  messages: ChatMessage[],
  summaries: Record<string, string>,
) {
  return groupMessages(messages)
    .map(([date, rows]) => {
      if (!isChatDate(date)) throw Error("请先确认所选消息的日期。");
      const old = notes(c).find((r) => r.chat?.messages && r.date === date);
      const merged = mergeMessages(old?.chat?.messages || [], rows);
      if (
        old &&
        merged.length === old.chat!.messages!.length &&
        merged.every(
          (m, i) => messageKey(m) === messageKey(old.chat!.messages![i]),
        )
      )
        return null;
      return {
        record: {
          id: old?.id || "chat-day:" + c.id + ":" + date,
          date,
          kind: "communication",
          channel: "wechat",
          content: summaries[date]?.trim() || dailyDraft(merged),
          completed: true,
          chat: {
            messages: merged,
            transcript: merged
              .map(
                (m) =>
                  (m.speaker === "self" ? "我" : "客户") +
                  " " +
                  m.time +
                  "：" +
                  m.text,
              )
              .join("\n"),
          },
        } as ProgressRecord,
        expected: old || null,
      };
    })
    .filter(
      (v): v is { record: ProgressRecord; expected: ProgressRecord | null } =>
        Boolean(v),
    );
}
export function validateAnalysis(input: unknown, c: Contact): FollowupAnalysis {
  const d = input as FollowupAnalysis;
  if (
    !d ||
    ![...STAGES, "待确认", "暂缓"].includes(d.stage) ||
    typeof d.blocker !== "string" ||
    typeof d.nextAction !== "string" ||
    !Array.isArray(d.evidence)
  )
    throw Error("分析结果格式有误，请重试。");
  const evidence = d.evidence
    .filter(
      (e) =>
        e &&
        typeof e.recordId === "string" &&
        typeof e.quote === "string" &&
        validEvidence(c, e),
    )
    .slice(0, 12);
  if (d.evidence.length && !evidence.length)
    throw Error("分析依据无法在原记录中核对，请重新生成。");
  const opportunity =
    d.opportunity &&
    ["follow", "reactivate"].includes(d.opportunity.type) &&
    typeof d.opportunity.reason === "string" &&
    ["question", "material", "appointment", "activation"].includes(
      d.opportunity.trigger || "",
    ) &&
    (d.opportunity.type !== "reactivate" ||
      ["activation", "appointment"].includes(d.opportunity.trigger || "")) &&
    (!d.opportunity.date || isChatDate(d.opportunity.date)) &&
    Array.isArray(d.opportunity.evidenceIds)
      ? {
          ...d.opportunity,
          evidenceIds: d.opportunity.evidenceIds.filter((id) =>
            evidence.some((e) => e.recordId === id),
          ),
          date: isChatDate(d.opportunity.date || "")
            ? d.opportunity.date
            : undefined,
        }
      : undefined;
  return {
    stage: d.stage,
    blocker: d.blocker.slice(0, 300),
    explanation: String(d.explanation || "").slice(0, 500),
    nextAction: d.nextAction.slice(0, 300),
    script: String(d.script || "").slice(0, 500),
    evidence,
    opportunity: opportunity?.evidenceIds.length ? opportunity : undefined,
    doNotContact: d.doNotContact === true,
    revision: revision(c),
    generatedAt: new Date().toISOString(),
  };
}
