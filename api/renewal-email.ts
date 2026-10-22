import nodemailer from "nodemailer";
import { createClient } from "@supabase/supabase-js";
import { dueItems, today } from "../services/renewal.js";
const ready = () =>
  Boolean(
    process.env.SMTP_USER &&
    process.env.SMTP_PASSWORD &&
    process.env.CRON_SECRET &&
    process.env.RENEWAL_SCHEDULER_READY === "true",
  );
export default async function handler(req: any, res: any) {
  if (req.method === "GET") {
    res.setHeader("Cache-Control", "no-store");
    return res.status(200).json({ configured: ready() });
  }
  if (req.method !== "POST") return res.status(405).end();
  if (
    !process.env.CRON_SECRET ||
    req.headers.authorization !== `Bearer ${process.env.CRON_SECRET}`
  )
    return res.status(401).end();
  if (!ready()) return res.status(503).json({ error: "发信服务尚未配置完成" });
  const db = createClient(
    process.env.VITE_SUPABASE_URL!,
    process.env.VITE_SUPABASE_ANON_KEY!,
  );
  const app = process.env.VITE_APP_ID!;
  const { data: row, error } = await db
    .from("app_data")
    .select("data")
    .eq("app_id", app)
    .eq("data_type", "renewal_v1")
    .maybeSingle();
  if (error) return res.status(500).json({ error: "数据读取失败" });
  const data = row?.data;
  if (!data?.settings?.enabled)
    return res.status(200).json({ skipped: "disabled" });
  const clock = new Intl.DateTimeFormat("en-GB", {
    timeZone: "Asia/Shanghai",
    hour: "2-digit",
    minute: "2-digit",
    hour12: false,
  }).format(new Date());
  if (clock < data.settings.time)
    return res.status(200).json({ skipped: "not due" });
  if (!/^\S+@\S+\.\S+$/.test(data.settings.email))
    return res.status(400).json({ error: "收件邮箱无效" });
  const stamp = `renewal_mail_${today()}`;
  // A unique daily claim prevents concurrent invocations from sending duplicates.
  const claim = await db
    .from("app_data")
    .insert({
      app_id: app,
      data_type: stamp,
      data: { status: "sending", at: new Date().toISOString() },
    });
  if (claim.error) {
    if (claim.error.code === "23505")
      return res.status(200).json({ skipped: "already claimed" });
    return res.status(500).json({ error: "无法保存发送记录" });
  }
  const tasks = dueItems(data.policies);
  const text = [
    `保险跟单仔每日提醒 · ${today()}`,
    `待处理 ${tasks.length} 项`,
    ...tasks.map(
      (t) =>
        `${t.type === "payment" ? "本期应缴" : "到期续保"} | ${t.policy.applicant} / ${t.policy.insured} | ${t.policy.productName} | 保单尾号 ${t.policy.policyNumber.slice(-6)} | ${t.date}${t.amount ? " | ¥" + t.amount : ""}`,
    ),
    "打开系统：https://insurance-rose-seven.vercel.app/",
  ].join("\n\n");
  try {
    const smtp = nodemailer.createTransport({
      host: "smtp.qq.com",
      port: 465,
      secure: true,
      auth: { user: process.env.SMTP_USER, pass: process.env.SMTP_PASSWORD },
      connectionTimeout: 10000,
      socketTimeout: 15000,
      disableFileAccess: true,
      disableUrlAccess: true,
    });
    await smtp.sendMail({
      from: process.env.SMTP_USER,
      to: data.settings.email,
      subject: `保单续费提醒 · ${today()} · ${tasks.length}项`,
      text,
    });
    await db
      .from("app_data")
      .update({
        data: {
          status: "sent",
          at: new Date().toISOString(),
          count: tasks.length,
        },
      })
      .eq("app_id", app)
      .eq("data_type", stamp);
    return res.status(200).json({ sent: true, count: tasks.length });
  } catch {
    await db
      .from("app_data")
      .update({ data: { status: "failed", at: new Date().toISOString() } })
      .eq("app_id", app)
      .eq("data_type", stamp);
    return res
      .status(502)
      .json({
        error:
          "邮件发送失败，请检查发信配置；发送记录已保留，避免不确定状态下重复发信",
      });
  }
}
