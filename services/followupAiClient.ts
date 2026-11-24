import type { Contact, ChatMessage } from "../types";
import { validateAnalysis, revision } from "./followupDomain";
async function request(body: unknown, signal?: AbortSignal) {
  const response = await fetch("/api/followup-ai", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      appId: import.meta.env.VITE_APP_ID,
      ...(body as object),
    }),
    signal: signal
      ? AbortSignal.any([signal, AbortSignal.timeout(180000)])
      : AbortSignal.timeout(180000),
  });
  const data = await response.json().catch(() => null);
  if (!response.ok) throw Error(data?.message || "分析暂不可用，请稍后重试。");
  return data;
}
export async function summarizeDays(
  messages: ChatMessage[],
  signal?: AbortSignal,
): Promise<Record<string, string>> {
  const data = await request({ mode: "daily", messages }, signal);
  if (!data?.summaries || typeof data.summaries !== "object")
    throw Error("梗概格式有误，请重新生成。");
  const dates = new Set(messages.map((m) => m.date));
  for (const date of dates)
    if (
      typeof data.summaries[date] !== "string" ||
      !data.summaries[date].trim()
    )
      throw Error("有日期未生成梗概，请重试。");
  return Object.fromEntries(
    [...dates].map((d) => [d, data.summaries[d].slice(0, 12000)]),
  );
}
export async function analyzeCustomer(contact: Contact, signal?: AbortSignal) {
  const data = await request(
    {
      mode: "customer",
      contact: {
        id: contact.id,
        progressHistory: contact.progressHistory || [],
        followupAnalysis: contact.followupAnalysis
          ? { stage: contact.followupAnalysis.stage }
          : undefined,
      },
      revision: revision(contact),
    },
    signal,
  );
  return validateAnalysis(data, contact);
}
