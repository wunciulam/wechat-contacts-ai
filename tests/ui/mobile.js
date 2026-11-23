async (page) => {
  const errors = [];
  page.on("pageerror", (e) => errors.push(e.message));
  await page.setViewportSize({ width: 390, height: 844 });
  const d = page.getByRole("dialog", { name: "编辑联系人资料", exact: true });
  const scroll = d.locator("[data-contact-scroll]");
  await scroll.evaluate((e) => (e.scrollTop = 0));
  const searchState = await page
    .locator(".ui-input-shell:visible")
    .evaluateAll((nodes) =>
      nodes.map((e) => {
        const icon = e.querySelector("svg").getBoundingClientRect(),
          input = e.querySelector("input").getBoundingClientRect();
        return {
          gap: input.left - icon.right,
          height: e.getBoundingClientRect().height,
        };
      }),
    );
  if (searchState.some((x) => x.gap < 8))
    throw Error("search icon overlaps input");
  await d.getByRole("button", { name: "添加保单", exact: true }).click();
  const date = d.getByLabel("生效日期", { exact: true });
  await date.scrollIntoViewIfNeeded();
  const product = d.getByLabel("产品名称*", { exact: true });
  const datebox = await date.locator("..").boundingBox();
  const selectbox = await d
    .getByRole("combobox", { name: "状态", exact: true })
    .boundingBox();
  if (Math.abs(datebox.x - selectbox.x) > 1 || selectbox.y <= datebox.y)
    throw Error("mobile fields did not stack");
  await d.getByRole("button", { name: "选择生效日期", exact: true }).click();
  const popup = page.getByRole("dialog", { name: "选择日期", exact: true });
  const b = await popup.boundingBox();
  if (b.x < 0 || b.y < 0 || b.x + b.width > 390 || b.y + b.height > 844)
    throw Error("mobile calendar clipped");
  await page.screenshot({
    animations: "disabled",
    path: "output/ui-regression/calendar-mobile.png",
  });
  await page.keyboard.press("Escape");
  await d.getByRole("button", { name: "取消", exact: true }).first().click();
  await scroll.evaluate((e) => (e.scrollTop = e.scrollHeight));
  const scrolling = await scroll.evaluate((e) => ({
    scroll: e.scrollTop,
    height: e.clientHeight,
    total: e.scrollHeight,
  }));
  if (scrolling.total > scrolling.height && scrolling.scroll === 0)
    throw Error("contact cannot scroll");
  const save = await d
    .getByRole("button", { name: "保存", exact: true })
    .boundingBox();
  if (!save || save.y + save.height > 844) throw Error("footer inaccessible");
  await page.screenshot({
    animations: "disabled",
    path: "output/ui-regression/contact-mobile-scroll.png",
  });
  await d.getByRole("button", { name: "取消", exact: true }).click();
  const menu = page.getByRole("button", { name: "打开菜单", exact: true });
  await menu.click();
  const drawer = page.getByRole("dialog", { name: "工作区导航", exact: true });
  await drawer.waitFor();
  const nav = await drawer.boundingBox();
  if (nav.width !== 256) throw Error("drawer width");
  await page.keyboard.press("Tab");
  if (!(await drawer.evaluate((e) => e.contains(document.activeElement))))
    throw Error("drawer lost focus");
  await page.screenshot({
    animations: "disabled",
    path: "output/ui-regression/navigation-mobile.png",
  });
  await page.keyboard.press("Escape");
  if (await drawer.count()) throw Error("drawer Escape");
  if (!(await menu.evaluate((e) => e === document.activeElement)))
    throw Error("drawer focus not restored");
  if (errors.length) throw Error(errors.join("\n"));
  return {
    passed: true,
    mobileCalendar: true,
    stackedFields: true,
    scrolling,
    fixedFooter: true,
    navigationFocus: true,
  };
};
