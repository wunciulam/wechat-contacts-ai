import test from "node:test";
import assert from "node:assert/strict";
import { runFollowupAi } from "../server/followupAi.ts";
test("all saved history reaches customer analysis, including old chunks; no real API needed", async () => {
  const original = globalThis.fetch;
  const sent: any[] = [];
  globalThis.fetch = async (_url, init) => {
    const body = JSON.parse(String(init?.body));
    sent.push(body);
    return new Response(
      JSON.stringify({
        choices: [
          {
            finish_reason: "stop",
            message: {
              content: JSON.stringify(
                body.messages[0].content.includes("整理全部")
                  ? {
                      facts: [
                        {
                          recordId: "old",
                          fact: "客户提出问题",
                          quote: "早期问题",
                        },
                      ],
                    }
                  : {
                      stage: "需求确认",
                      blocker: "待核对",
                      nextAction: "核对",
                      evidence: [],
                    },
              ),
            },
          },
        ],
      }),
      { status: 200 },
    );
  };
  try {
    await runFollowupAi(
      {
        mode: "customer",
        contact: {
          progressHistory: [
            {
              id: "old",
              date: "2026-01-01",
              content: "早期问题" + "长".repeat(25000),
            },
            { id: "new", date: "2026-11-23", content: "新记录 13800000000" },
          ],
        },
      },
      { DEEPSEEK_API_KEY: "fixture" },
    );
    const all = JSON.stringify(sent);
    assert.ok(all.includes("早期问题"));
    assert.ok(all.includes("新记录"));
    assert.ok(!all.includes("13800000000"));
    assert.ok(sent.length >= 3);
    assert.ok(sent.every((r) => r.response_format.type === "json_object"));
  } finally {
    globalThis.fetch = original;
  }
});
test("missing key and incomplete JSON response fail without pretending successful analysis", async () => {
  await assert.rejects(
    runFollowupAi({ mode: "daily", messages: [] }, {}),
    /Key/,
  );
  const original = globalThis.fetch;
  globalThis.fetch = async () =>
    new Response(
      JSON.stringify({
        choices: [{ finish_reason: "length", message: { content: "{}" } }],
      }),
    );
  try {
    await assert.rejects(
      runFollowupAi(
        {
          mode: "daily",
          messages: [
            { date: "2026-11-23", speaker: "customer", text: "请核对" },
          ],
        },
        { DEEPSEEK_API_KEY: "fixture" },
      ),
      /完整/,
    );
  } finally {
    globalThis.fetch = original;
  }
});
