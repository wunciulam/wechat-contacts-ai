async (page) => {
  await page.setViewportSize({ width: 1304, height: 880 });
  const inputs = page.locator(".ui-input-shell:visible");
  if (!(await inputs.count())) throw Error("missing shared search");
  const metrics = await inputs.evaluateAll((nodes) =>
    nodes.map((e) => {
      const icon = e.querySelector("svg").getBoundingClientRect(),
        input = e.querySelector("input").getBoundingClientRect();
      return {
        gap: input.left - icon.right,
        height: e.getBoundingClientRect().height,
      };
    }),
  );
  if (metrics.some((x) => x.gap < 8 || x.height !== 38))
    throw Error("search geometry " + JSON.stringify(metrics));
  const search = page.getByRole("searchbox").first();
  await search.fill("不存在的客户");
  if (
    await page.getByRole("heading", { name: "示例客户", exact: true }).count()
  )
    throw Error("search did not filter");
  await search.fill("");
  await page.screenshot({timeout:30000,
    animations: "disabled",
    path: "output/ui-regression/contact-search-desktop.png",
  });
  return { passed: true, metrics };
};
