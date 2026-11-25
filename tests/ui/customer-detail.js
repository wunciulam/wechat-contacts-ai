async (page) => {
  const errors = [];
  page.on("pageerror", (e) => errors.push(e.message));
  await page
    .getByRole("dialog", { name: "编辑联系人资料", exact: true })
    .getByRole("button", { name: "取消", exact: true })
    .click();
  page._follow.contacts[0].progressHistory.push({id:'unified-task',kind:'task',date:'2026-11-22',content:'统一详情待办',completed:false});
  await page.reload();await page.getByRole('heading',{name:'示例客户',exact:true}).click();
  const detail = page.getByRole("dialog", {
    name: "示例客户的客户详情",
    exact: true,
  });
  if (
    (await detail
      .getByRole("tab", { name: "资料", exact: true })
      .getAttribute("aria-selected")) !== "true"
  )
    throw Error("contacts did not open profile");
  if (
    (await detail.getByText("原有记录", { exact: true }).count()) ||
    (await detail.locator("table").count())
  )
    throw Error("profile duplicated history/policies");
  const tag = detail.getByText("成交客户", { exact: true });
  if (
    !((await tag.getAttribute("class")) || "").includes("rounded px-2 py-0.5")
  )
    throw Error("profile did not reuse Tag");
  await page.screenshot({
    animations: "disabled",
    path: "output/ui-regression/customer-profile-desktop.png",
  });
  await detail.getByRole("tab", { name: "保单", exact: true }).click();
  const table = detail.locator("table");
  await table.waitFor();
  const headers = await table.locator("thead th").allTextContents();
  for (const name of [
    "险种名称",
    "保单号",
    "保费",
    "缴费方式 / 期间",
    "下次缴费 / 应缴金额",
    "投保人/被保人",
    "生效日期",
    "状态",
    "操作",
  ])
    if (!headers.some((h) => h.trim() === name))
      throw Error("missing full policy column " + name);
  if ((await table.locator("tbody tr").count()) !== 3)
    throw Error("customer policy scope/status filter");
  await page.screenshot({
    animations: "disabled",
    path: "output/ui-regression/customer-policies-desktop.png",
  });
  await detail.getByRole('button',{name:'录入保单',exact:true}).click();const manual=page.getByRole('dialog',{name:'录入新保单',exact:true});if(await manual.getByLabel(/^投保人/).innerText()!=='示例客户')throw Error('customer policy entry did not preselect applicant');await page.keyboard.press('Escape');await manual.waitFor({state:'hidden'});
  await page.setViewportSize({ width: 390, height: 844 });
  const scrolling = table.locator("..");
  await scrolling.evaluate((e) => (e.scrollLeft = e.scrollWidth));
  const metrics = await scrolling.evaluate((e) => ({
    width: e.clientWidth,
    total: e.scrollWidth,
    scroll: e.scrollLeft,
  }));
  if (metrics.total <= metrics.width || metrics.scroll === 0)
    throw Error("mobile policy cannot scroll");
  const action = await table
    .getByRole("button", { name: "详情", exact: true })
    .first()
    .boundingBox();
  if (!action || action.x < 0 || action.x + action.width > 390)
    throw Error("policy fixed actions not accessible");
  await page.screenshot({
    animations: "disabled",
    path: "output/ui-regression/customer-policies-mobile.png",
  });
  await detail.getByRole("tab", { name: "资料", exact: true }).click();
  await detail
    .locator(".customer-profile-view")
    .getByText("保留备注", { exact: true })
    .scrollIntoViewIfNeeded();
  await page.screenshot({
    animations: "disabled",
    path: "output/ui-regression/customer-profile-mobile-scroll.png",
  });
  await detail.getByRole("tab", { name: "跟进", exact: true }).click();
  await detail.getByText("原有记录", { exact: true }).waitFor();
  await page.screenshot({
    animations: "disabled",
    path: "output/ui-regression/customer-followup-mobile.png",
  });
  const task=detail.getByRole('checkbox',{name:'完成待办：统一详情待办',exact:true});await task.click();
  const result=page.getByRole('dialog',{name:'记录跟进结果',exact:true});await result.getByLabel('沟通结果',{exact:true}).fill('统一详情已回复客户');await result.getByRole('button',{name:'保存结果并完成',exact:true}).click();await result.waitFor({state:'hidden'});await task.waitFor({state:'hidden'});
  page._follow.fail=true;await detail.getByRole('button',{name:'撤销完成',exact:true}).click();await detail.getByRole('alert').filter({hasText:'测试保存失败'}).waitFor();page._follow.fail=false;await detail.getByRole('button',{name:'撤销完成',exact:true}).click();await task.waitFor();if(!page._follow.contacts[0].progressHistory.some(r=>r.content==='统一详情已回复客户'))throw Error('undo removed communication');
  await page.keyboard.press("Escape");
  await detail.waitFor({ state: "hidden" });
  await page.setViewportSize({ width: 1304, height: 880 });
  await page.getByRole("button", { name: /跟进工作台/ }).click();
  await page.getByRole("tab", { name: "客户分类", exact: true }).click();
  await page.getByRole("heading", { name: "示例客户", exact: true }).click();
  await detail.waitFor();
  if (
    (await detail
      .getByRole("tab", { name: "跟进", exact: true })
      .getAttribute("aria-selected")) !== "true"
  )
    throw Error("workbench did not open followup");
  await detail.getByRole("tab", { name: "资料", exact: true }).click();
  await tag.waitFor();
  await detail.getByRole("button", { name: "编辑资料", exact: true }).click();
  const edit = page.getByRole("dialog", {
    name: "编辑联系人资料",
    exact: true,
  });
  if (
    (await edit
      .getByRole("button", { name: "新增记录", exact: true })
      .count()) ||
    (await edit.getByRole("button", { name: "添加保单", exact: true }).count())
  )
    throw Error("profile editor duplicates domain tabs");
  await edit.getByLabel("地址", { exact: true }).fill("统一客户详情回归地址");
  page._follow.profileFail = true;
  await edit.getByRole("button", { name: "保存", exact: true }).click();
  await edit.getByRole("alert").waitFor();
  if (
    (await edit.getByLabel("地址", { exact: true }).inputValue()) !==
    "统一客户详情回归地址"
  )
    throw Error("profile failure lost input");
  page._follow.profileFail = false;
  await edit.getByRole("button", { name: "保存", exact: true }).click();
  await edit.waitFor({ state: "hidden" });
  await detail.getByText("统一客户详情回归地址", { exact: true }).waitFor();
  await page.keyboard.press("Escape");
  if (
    (await page
      .getByRole("tab", { name: "客户分类", exact: true })
      .getAttribute("aria-selected")) !== "true"
  )
    throw Error("close lost original category tab");
  await page.getByRole("button", { name: /保单管理/ }).click();
  await page.getByRole("button", { name: "示例客户", exact: true }).click();
  await detail.getByRole("tab", { name: "保单", exact: true }).waitFor();
  if (
    (await detail
      .getByRole("tab", { name: "保单", exact: true })
      .getAttribute("aria-selected")) !== "true"
  )
    throw Error("policy association did not open policies");
  await page.keyboard.press("Escape");
  return {
    passed: true,
    sharedCustomer: true,
    threeEntryDefaults: true,
    fullPolicyColumns: headers.length,
    mobileHorizontalScroll: metrics,
    profileFailureRetained: true,
    returnCategoryTab: true,
    errors,
  };
};
