import {
  readFileSync,
  writeFileSync,
  renameSync,
  chmodSync,
  unlinkSync,
} from "node:fs";
import { createHash, randomUUID } from "node:crypto";
export const DEEPSEEK_DEFAULT_MODEL = "deepseek-flash";
const MODELS = new Set([DEEPSEEK_DEFAULT_MODEL, "deepseek-v4-pro"]);
export async function testDeepseekConnection(
  key: string,
  model: string,
  fetcher: typeof fetch = fetch,
) {
  if (!key || key.length < 12 || key.length > 512 || /\s/.test(key))
    throw Error("请填写有效的 DeepSeek API Key。");
  let response: Response;
  try {
    response = await fetcher("https://api.deepseek.com/chat/completions", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${key}`,
      },
      body: JSON.stringify({
        model,
        messages: [
          { role: "user", content: '请返回 JSON：{"connected":true}' },
        ],
        response_format: { type: "json_object" },
        thinking: { type: "disabled" },
        max_tokens: 64,
      }),
      signal: AbortSignal.timeout(20000),
    });
  } catch {
    throw Error("连接超时或网络不可用，请重试。");
  }
  if (!response.ok)
    throw Error(
      response.status === 401
        ? "API Key 无效，请检查后重试。"
        : response.status === 402
          ? "DeepSeek 余额不足，请充值后重试。"
          : response.status === 429
            ? "DeepSeek 请求较多，请稍后重试。"
            : "DeepSeek 暂不可用，请检查模型权限或稍后重试。",
    );
  try {
    const choice = (await response.json()).choices?.[0];
    if (
      choice?.finish_reason !== "stop" ||
      JSON.parse(choice?.message?.content)?.connected !== true
    )
      throw Error();
  } catch {
    throw Error("连接返回格式不完整，请重新测试。");
  }
}
export function createDeepseekSettings(
  env: Record<string, string>,
  file = ".deepseek-settings.local",
  fetcher: typeof fetch = fetch,
) {
  let settings: { key: string; model: string } | undefined;
  try {
    const stored = JSON.parse(readFileSync(file, "utf8"));
    if (typeof stored.key !== "string" || !MODELS.has(stored.model))
      throw Error();
    settings = stored;
    chmodSync(file, 0o600);
  } catch (e) {
    if ((e as NodeJS.ErrnoException).code !== "ENOENT")
      throw Error("本地 AI 配置无法读取，请检查配置文件。");
  }
  let verified = { digest: "", at: 0 };
  let calls: number[] = [];
  const effective = () => ({
    ...env,
    DEEPSEEK_API_KEY: settings?.key || env.DEEPSEEK_API_KEY || "",
    DEEPSEEK_MODEL:
      settings?.model || env.DEEPSEEK_MODEL || DEEPSEEK_DEFAULT_MODEL,
  });
  const status = () => ({
    configured: Boolean(effective().DEEPSEEK_API_KEY),
    model: effective().DEEPSEEK_MODEL,
    editable: true,
  });
  async function update(input: any) {
    if (
      !input ||
      !["test", "save"].includes(input.action) ||
      typeof input.apiKey !== "string" ||
      input.apiKey.length > 512 ||
      typeof input.model !== "string" ||
      !MODELS.has(input.model)
    )
      throw Error("配置格式有误，请重新填写。");
    const key = input.apiKey.trim() || effective().DEEPSEEK_API_KEY,
      model = input.model;
    const digest = createHash("sha256")
      .update(key + "\0" + model)
      .digest("hex");
    if (input.action === "test") {
      verified = { digest: "", at: 0 };
      calls = calls.filter((t) => Date.now() - t < 60000);
      if (calls.length >= 10) throw Error("测试较频繁，请稍后重试。");
      calls.push(Date.now());
      await testDeepseekConnection(key, model, fetcher);
      verified = { digest, at: Date.now() };
      return { tested: true };
    }
    if (verified.digest !== digest || Date.now() - verified.at > 300000)
      throw Error("请先测试当前配置，再保存。");
    const tmp = file + "." + randomUUID() + ".tmp";
    try {
      writeFileSync(tmp, JSON.stringify({ key, model }), {
        mode: 0o600,
        flag: "wx",
      });
      renameSync(tmp, file);
    } catch {
      try {
        unlinkSync(tmp);
      } catch {}
      throw Error("配置未能保存，请重试。");
    }
    settings = { key, model };
    verified = { digest: "", at: 0 };
    return status();
  }
  return { effective, status, update };
}
