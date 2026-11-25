async (page) => {
  await page.keyboard.press("Escape");
  await page.getByRole("button", { name: /跟进工作台/ }).click();
  const cfg = { configured: false, model: "deepseek-flash", editable: true };
  let providerFail = true,
    saveFail = false,
    tested = false;
  const modes = [];
  await page.route("**/api/ai-settings", async (route) => {
    if (route.request().method() === "GET") return route.fulfill({ json: cfg });
    const body = route.request().postDataJSON();
    if (body.action === "test") {
      if (providerFail)
        return route.fulfill({
          status: 400,
          json: { message: "API Key 无效，请检查后重试。" },
        });
      tested = true;
      return route.fulfill({ json: { tested: true } });
    }
    if (saveFail)
      return route.fulfill({
        status: 500,
        json: { message: "配置未能保存，请重试。" },
      });
    if (!tested)
      return route.fulfill({ status: 400, json: { message: "请先测试" } });
    cfg.configured = true;
    cfg.model = body.model;
    return route.fulfill({ json: cfg });
  });
  await page.route("**/api/followup-ai", async (route) => {
    if (route.request().method() === "GET")
      return route.fulfill({ json: { configured: cfg.configured } });
    if (!cfg.configured)
      return route.fulfill({
        status: 503,
        json: { message: "尚未配置 DeepSeek Key。" },
      });
    const body = route.request().postDataJSON();
    modes.push(body.mode);
    if (body.mode === "daily")
      return route.fulfill({
        json: {
          summaries: {
            "2026-11-20": "客户询问保障是否足够，我请他发保障表核对。",
          },
        },
      });
    return route.fulfill({
      json: {
        stage: "需求确认",
        blocker: "现有保障待核对",
        explanation: "依据已保存记录，待核对保障。",
        nextAction: "核对客户现有保障",
        script: "方便发我保障表吗？",
        evidence: [],
        opportunity: null,
        doNotContact: false,
      },
    });
  });
  const settings = page.getByRole("dialog", { name: "AI 设置", exact: true });
  await page.getByRole("button", { name: "AI 设置", exact: true }).click();
  await settings.getByText("未配置", { exact: true }).waitFor();
  const key = settings.getByLabel("API Key", { exact: true });
  await key.fill("fixture-only-no-real-key");
  await settings.getByRole("button", { name: "测试连接", exact: true }).click();
  await settings
    .getByRole("alert")
    .filter({ hasText: "API Key 无效" })
    .waitFor();
  if ((await key.inputValue()) !== "fixture-only-no-real-key")
    throw Error("test failure lost key");
  if (
    !(await settings
      .getByRole("button", { name: "保存并启用", exact: true })
      .isDisabled())
  )
    throw Error("unverified key allowed");
  await page.screenshot({
    timeout: 30000,
    path: "output/ui-regression/ai-settings-error-desktop.png",
  });
  providerFail = false;
  await settings.getByRole("button", { name: "测试连接", exact: true }).click();
  await settings
    .getByText("连接成功，可以生成梗概和客户分析。", { exact: true })
    .waitFor();
  await settings.getByRole("combobox", { name: "模型", exact: true }).click();
  await page.getByRole("option", { name: "DeepSeek Pro", exact: true }).click();
  if (
    !(await settings
      .getByRole("button", { name: "保存并启用", exact: true })
      .isDisabled())
  )
    throw Error("model change kept verification");
  await settings.getByRole("button", { name: "测试连接", exact: true }).click();
  await settings
    .getByText("连接成功，可以生成梗概和客户分析。", { exact: true })
    .waitFor();
  await page.setViewportSize({ width: 390, height: 844 });
  const footer = await settings
    .getByRole("button", { name: "保存并启用", exact: true })
    .boundingBox();
  if (!footer || footer.y + footer.height > 844)
    throw Error("AI save footer clipped");
  saveFail = true;
  await settings
    .getByRole("button", { name: "保存并启用", exact: true })
    .click();
  await settings.getByRole("alert").filter({ hasText: "未能保存" }).waitFor();
  if ((await key.inputValue()) !== "fixture-only-no-real-key")
    throw Error("save failure lost key");
  await page.screenshot({
    timeout: 30000,
    path: "output/ui-regression/ai-settings-error-mobile.png",
  });
  saveFail = false;
  await settings
    .getByRole("button", { name: "保存并启用", exact: true })
    .click();
  await settings.getByText("已保存并启用", { exact: true }).waitFor();
  if ((await key.inputValue()) !== "")
    throw Error("saved key remained in field");
  await page.screenshot({
    timeout: 30000,
    path: "output/ui-regression/ai-settings-enabled-mobile.png",
  });
  await page.keyboard.press("Escape");
  await settings.waitFor({ state: "hidden" });
  await page.setViewportSize({ width: 1304, height: 880 });
  await page.getByRole("button", { name: "AI 设置", exact: true }).click();
  await settings.getByText("已配置", { exact: true }).waitFor();
  if ((await key.inputValue()) !== "")
    throw Error("server credential was echoed");
  await page.screenshot({
    timeout: 30000,
    path: "output/ui-regression/ai-settings-configured-desktop.png",
  });
  await page.keyboard.press("Escape");
  await page.getByRole("button", { name: "更新线索", exact: true }).click();
  await page.getByRole("button", { name: "更新线索", exact: true }).waitFor();
  await page.waitForFunction(
    () => !!document.querySelector(".followup-workspace"),
  );
  await page.waitForTimeout(250);
  if (!modes.includes("customer") || !page._follow.contacts[0].followupAnalysis)
    throw Error("configured customer analysis did not persist");
  await page.getByRole("tab", { name: "客户分类", exact: true }).click();
  await page.getByRole("heading", { name: "示例客户", exact: true }).click();
  const customer = page.getByRole("dialog", {
    name: "示例客户的客户详情",
    exact: true,
  });
  await customer.getByText("现有保障待核对", { exact: true }).waitFor();
  await customer.getByRole("button", { name: "导入聊天", exact: true }).click();
  const chat = page.getByRole("dialog", { name: "导入聊天记录", exact: true });
  await chat.getByRole("button", { name: "粘贴聊天文字", exact: true }).click();
  await chat
    .getByLabel("聊天文字", { exact: true })
    .fill("2026-11-20 10:00\n客户：保障够吗\n我：发保障表，我帮您核对");
  await chat.getByRole("button", { name: "识别文字结构", exact: true }).click();
  await chat.getByRole("button", { name: "生成每日梗概", exact: true }).click();
  await chat.getByLabel("2026-11-20每日梗概").waitFor();
  if (!modes.includes("daily")) throw Error("daily analysis not connected");
  await page.screenshot({
    timeout: 30000,
    path: "output/ui-regression/ai-configured-daily-summary.png",
  });
  return {
    passed: true,
    invalidKeyRetained: true,
    testBeforeSave: true,
    modelChangeRevalidates: true,
    failedSaveRetained: true,
    keyNotEchoed: true,
    desktopMobile: true,
    customerAndDailyConnected: modes,
  };
};
