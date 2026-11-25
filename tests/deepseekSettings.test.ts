import test from "node:test";
import assert from "node:assert/strict";
import { mkdtempSync, readFileSync, rmSync, statSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import {
  createDeepseekSettings,
  testDeepseekConnection,
} from "../server/deepseekSettings.ts";
const ok = () =>
  new Response(
    JSON.stringify({
      choices: [
        { finish_reason: "stop", message: { content: '{"connected":true}' } },
      ],
    }),
  );
test("settings test before save, durable private file, runtime reload and no key in public status", async () => {
  const dir = mkdtempSync(join(tmpdir(), "insurance-ai-")),
    file = join(dir, "settings.local"),
    sent: any[] = [];
  const key = "fixture-not-a-real-secret";
  try {
    const settings = createDeepseekSettings({}, file, async (url, init) => {
      sent.push({ url, init });
      return ok();
    });
    assert.equal(settings.status().configured, false);
    await assert.rejects(
      settings.update({ action: "save", apiKey: key, model: "deepseek-flash" }),
      /先测试/,
    );
    await settings.update({
      action: "test",
      apiKey: key,
      model: "deepseek-flash",
    });
    assert.equal(settings.status().configured, false);
    await assert.rejects(
      settings.update({
        action: "save",
        apiKey: key + "-changed",
        model: "deepseek-flash",
      }),
      /先测试/,
    );
    await settings.update({
      action: "save",
      apiKey: key,
      model: "deepseek-flash",
    });
    assert.equal(settings.effective().DEEPSEEK_API_KEY, key);
    assert.equal(settings.status().configured, true);
    assert.ok(!JSON.stringify(settings.status()).includes(key));
    assert.equal(statSync(file).mode & 0o777, 0o600);
    const loaded = createDeepseekSettings({}, file, async () => ok());
    assert.equal(loaded.effective().DEEPSEEK_API_KEY, key);
    assert.equal(sent[0].url, "https://api.deepseek.com/chat/completions");
    const body = JSON.parse(String(sent[0].init.body));
    assert.equal(body.model, "deepseek-flash");
    assert.equal(body.thinking.type, "disabled");
    assert.equal(body.response_format.type, "json_object");
    await loaded.update({
      action: "test",
      apiKey: "",
      model: "deepseek-flash",
    });
    await loaded.update({
      action: "save",
      apiKey: "",
      model: "deepseek-flash",
    });
    assert.equal(JSON.parse(readFileSync(file, "utf8")).key, key);
  } finally {
    rmSync(dir, { recursive: true, force: true });
  }
});
test("bad key, network and provider errors do not expose credentials or count as a successful test", async () => {
  await assert.rejects(
    testDeepseekConnection("short", "deepseek-flash", async () => ok()),
    /有效/,
  );
  for (const [code, msg] of [
    [401, "无效"],
    [402, "余额不足"],
    [429, "较多"],
    [500, "暂不可用"],
  ] as const)
    await assert.rejects(
      testDeepseekConnection(
        "fixture-sensitive-value",
        "deepseek-flash",
        async () =>
          new Response("provider leaked raw credentials", { status: code }),
      ),
      new RegExp(msg),
    );
  await assert.rejects(
    testDeepseekConnection(
      "fixture-sensitive-value",
      "deepseek-flash",
      async () => {
        throw Error("raw secret");
      },
    ),
    /网络不可用/,
  );
  await assert.rejects(
    testDeepseekConnection(
      "fixture-sensitive-value",
      "deepseek-flash",
      async () => new Response("{}"),
    ),
    /格式/,
  );
});
test("unsaved failing replacement preserves prior credential; save disk failure is reported", async () => {
  const dir = mkdtempSync(join(tmpdir(), "insurance-ai-")),
    file = join(dir, "config.local");
  let failing = false;
  try {
    const s = createDeepseekSettings(
      { DEEPSEEK_API_KEY: "existing-fixture-value" },
      file,
      async () => {
        if (failing) return new Response("", { status: 401 });
        return ok();
      },
    );
    await s.update({
      action: "test",
      apiKey: "replacement-fixture",
      model: "deepseek-flash",
    });
    failing = true;
    await assert.rejects(
      s.update({
        action: "test",
        apiKey: "other-fixture-value",
        model: "deepseek-flash",
      }),
    );
    assert.equal(s.effective().DEEPSEEK_API_KEY, "existing-fixture-value");
    await assert.rejects(
      s.update({
        action: "save",
        apiKey: "other-fixture-value",
        model: "deepseek-flash",
      }),
    );
    failing = false;
    await s.update({
      action: "test",
      apiKey: "replacement-fixture",
      model: "deepseek-flash",
    });
    rmSync(dir, { recursive: true });
    await assert.rejects(
      s.update({
        action: "save",
        apiKey: "replacement-fixture",
        model: "deepseek-flash",
      }),
      /未能保存/,
    );
    assert.equal(s.effective().DEEPSEEK_API_KEY, "existing-fixture-value");
  } finally {
    rmSync(dir, { recursive: true, force: true });
  }
});
