async (page) => {
  const errors = [];
  page.on("pageerror", (e) => errors.push(e.message));
  await page.goto("__BASE_URL__/ui-acceptance.html");
  const select = page.getByRole("combobox", { name: "缴费方式", exact: true });
  await select.click();
  await page.keyboard.press("End");
  await page.keyboard.press("Enter");
  if ((await select.innerText()) !== "季缴")
    throw Error("sample does not use shared keyboard select");
  await page.getByRole("button", { name: "选择示例日期", exact: true }).click();
  const calendar = page.getByRole("dialog", { name: "选择日期", exact: true });
  await calendar.waitFor();
  await page.keyboard.press("Escape");
  await page
    .getByRole("button", { name: "打开长保单示例", exact: true })
    .click();
  const modal = page.getByRole("dialog", {
    name: "保单详情 · 交互样板",
    exact: true,
  });
  await modal.waitFor();
  await page.screenshot({timeout:30000,
    animations: "disabled",
    path: "output/ui-regression/sample-modal-desktop.png",
  });
  await page.keyboard.press("Escape");
  if (await modal.count()) throw Error("sample dialog Escape");
  await page.setViewportSize({ width: 390, height: 844 });
  await page
    .getByRole("button", { name: "打开长保单示例", exact: true })
    .click();
  await modal.waitFor();
  const b = await modal.boundingBox();
  if (b.x < 0 || b.x + b.width > 390 || b.y < 0 || b.y + b.height > 844)
    throw Error("sample mobile modal clipped");
  await page.screenshot({timeout:30000,
    animations: "disabled",
    path: "output/ui-regression/sample-modal-mobile.png",
  });
  await page.keyboard.press("Escape");
  if (errors.length) throw Error(errors.join("\n"));
  return {
    passed: true,
    sharedKeyboardSelect: true,
    sharedCalendar: true,
    desktopAndMobileDialog: true,
  };
};
