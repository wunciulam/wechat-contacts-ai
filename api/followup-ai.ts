import { runFollowupAi } from "../server/followupAi.js";
const requests = new Map<string, { at: number; count: number }>();
export default async function handler(req: any, res: any) {
  res.setHeader("Cache-Control", "no-store");
  if (req.method === "GET")
    return res
      .status(200)
      .json({ configured: Boolean(process.env.DEEPSEEK_API_KEY) });
  if (req.method !== "POST")
    return res.status(405).json({ message: "仅支持POST。" });
  if (!process.env.VITE_APP_ID || req.body?.appId !== process.env.VITE_APP_ID)
    return res.status(403).json({ message: "数据空间不匹配。" });
  const ip = String(req.headers["x-forwarded-for"] || "local").split(",")[0],
    now = Date.now();
  let row = requests.get(ip);
  if (!row || now - row.at > 60000) {
    row = { at: now, count: 0 };
    requests.set(ip, row);
  }
  if (++row.count > 10)
    return res.status(429).json({ message: "请求较多，请稍后重试。" });
  if (requests.size > 1000)
    for (const [key, value] of requests)
      if (now - value.at > 60000) requests.delete(key);
  try {
    if (JSON.stringify(req.body).length > 1100000)
      throw Error("本次材料过长。");
    return res.status(200).json(await runFollowupAi(req.body, process.env));
  } catch (e) {
    return res
      .status(502)
      .json({ message: e instanceof Error ? e.message : "分析失败，请重试。" });
  }
}
