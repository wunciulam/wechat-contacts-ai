async (page) => {
  const errors = [];
  page.on("pageerror", (e) => errors.push(e.message));
  const d = page.getByRole("dialog", { name: "示例客户的客户详情", exact: true });
  await d.getByRole("button", { name: "取消", exact: true }).click();
  await page.getByRole("tab", {name:"保单",exact:true}).click();
  const table = page.locator("table").first();
  await table.waitFor();
  if ((await table.locator("tbody tr").count()) !== 3)
    throw Error("terminal policy filtering regressed");
  await page.getByRole("button", { name: "详情", exact: true }).first().click();
  const detail = page.getByRole("dialog", { name: "保单详情", exact: true });
  await detail
    .getByRole("button", { name: "明亚采集详情", exact: true })
    .click();
  const raw = page.getByRole("dialog", {
    name: "测试长名称医疗保险（互联网版）与重大疾病保障计划",
    exact: true,
  });
  await raw.waitFor();
  await page.keyboard.press("Escape");
  if (!(await detail.isVisible())) throw Error("nested Escape closed parent");
  await detail.getByRole("button", { name: "编辑资料", exact: true }).click();
  const count = await detail
    .locator(".input:visible,.ui-date-control:visible")
    .count();
  if (count !== 16) throw Error("detail fields count " + count);
  await detail.getByLabel("缴费方式", { exact: true }).click();
  await page.getByRole("option", { name: "期交-年", exact: true }).click();
  await page.screenshot({timeout:30000,
    animations: "disabled",
    path: "output/ui-regression/policy-edit-desktop.png",
  });
  await detail.getByRole("button", { name: "取消", exact: true }).click();
  await page.keyboard.press("Escape");
  await page.getByRole("button", { name: "录入保单", exact: true }).click();
  const manual = page.getByRole("dialog", { name: "录入新保单", exact: true });
  await manual.getByLabel(/^产品名称/).fill("UI验证保单");
  if(await manual.getByLabel(/^投保人/).innerText()!=="示例客户"){
    await manual.getByLabel(/^投保人/).click();
    await page.getByRole("option", { name: "示例客户", exact: true }).click();
  }
  await manual.getByLabel("生效日期", { exact: true }).fill("2026-02-30");
  await manual.getByRole("button", { name: "保存保单", exact: true }).click();
  if (
    !(await manual.isVisible()) ||
    !(await manual
      .getByLabel("生效日期", { exact: true })
      .evaluate((e) => !e.checkValidity()))
  )
    throw Error("invalid date allowed");
  await manual.getByLabel("生效日期", { exact: true }).fill("2026-11-23");
  await page.setViewportSize({ width: 390, height: 844 });
  await manual
    .locator("[data-dialog-body]")
    .evaluate((e) => (e.scrollTop = e.scrollHeight));
  const save = await manual
    .getByRole("button", { name: "保存保单", exact: true })
    .boundingBox();
  if (save.y + save.height > 844) throw Error("new policy footer");
  await page.screenshot({timeout:30000,
    animations: "disabled",
    path: "output/ui-regression/new-policy-mobile.png",
  });
  await page.goto("__BASE_URL__/");
  await page.setViewportSize({ width: 1304, height: 880 });
  await page.getByRole("button", { name: /跟进工作台/ }).click();
  await page.getByRole("tab", { name: "客户分类", exact: true }).click();
  const tabs=page.locator('.followup-tabs');const tabBox=await tabs.getByRole('tab',{name:'客户分类',exact:true}).boundingBox();const manageBox=await tabs.getByRole('button',{name:'管理分类',exact:true}).boundingBox();if(Math.abs(tabBox.y-manageBox.y)>8)throw Error('category action not in tab row');
  await tabs.getByRole("button", { name: "管理分类", exact: true }).click();
  const categories = page.getByRole("dialog", {
    name: "管理分类",
    exact: true,
  });
  await categories
    .getByRole("button", { name: "新增类目", exact: true })
    .click();
  await page.screenshot({timeout:30000,
    animations: "disabled",
    path: "output/ui-regression/categories-desktop.png",
  });
  await page.keyboard.press("Escape");
  await page
    .getByRole("button", { name: "添加联系人到未分类", exact: true })
    .click();
  const search = page.getByRole("searchbox", {
    name: "搜索联系人",
    exact: true,
  });
  await search.fill("其他");
  const gap = await search.evaluate(
    (e) =>
      e.getBoundingClientRect().left -
      e.parentElement.querySelector("svg").getBoundingClientRect().right,
  );
  if (gap < 8) throw Error("category search overlaps");
  await page.screenshot({timeout:30000,
    animations: "disabled",
    path: "output/ui-regression/category-search-desktop.png",
  });
  await page
    .getByRole("button", { name: "关闭添加联系人", exact: true })
    .click();
  await page.getByRole("button", { name: /添加 \/ 导入/ }).click();
  const add = page.getByRole("dialog", { name: "添加 / 导入", exact: true });
  if (await add.getByText("选择表格", { exact: true }).count())
    throw Error("legacy import entry returned");
  await add.getByRole("button", { name: "明亚采集", exact: true }).click();
  await add.getByRole("button", { name: "导入采集文件", exact: true }).click();
  const mingya = page.getByRole("dialog", {
    name: "明亚保单导入",
    exact: true,
  });
  await mingya.waitFor();
  await page.screenshot({timeout:30000,
    animations: "disabled",
    path: "output/ui-regression/mingya-import-desktop.png",
  });
  await page.keyboard.press("Escape");
  if (errors.length) throw Error(errors.join("\n"));
  return {
    passed: true,
    policyFields: count,
    terminalPoliciesHidden: true,
    invalidDateBlocked: true,
    newPolicyMobileFooter: true,
    categorySearchGap: gap,
    mingyaOnlyEntry: true,
  };
};
