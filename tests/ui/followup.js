async (page) => {
  const d = page.getByRole("dialog", { name: "编辑联系人资料", exact: true });
  await d.getByRole("button", { name: "新增记录", exact: true }).click();
  const content = d.getByRole("textbox", { name: "跟进内容", exact: true });
  await content.fill("回归检查：保留输入并重试");
  page._follow.fail = true;
  const save = d.getByRole("button", { name: "保存到数据库", exact: true });
  await save.click();
  await d.getByRole("alert").filter({ hasText: "测试保存失败" }).waitFor();
  if ((await content.inputValue()) !== "回归检查：保留输入并重试")
    throw Error("failed save cleared input");
  page._follow.fail = false;
  await save.click();
  await d.getByText("回归检查：保留输入并重试", { exact: true }).waitFor();
  await d.getByRole("button", { name: "取消", exact: true }).last().click();
  await page.reload();
  await page.getByRole("heading", { name: "示例客户", exact: true }).click();
  await page
    .getByRole("dialog", { name: "编辑联系人资料", exact: true })
    .getByText("回归检查：保留输入并重试", { exact: true })
    .waitFor();
  await page.screenshot({
    animations: "disabled",
    path: "output/ui-regression/followup-saved.png",
  });
  return {
    passed: true,
    failedInputRetained: true,
    retryPersistedAfterReload: true,
  };
};
