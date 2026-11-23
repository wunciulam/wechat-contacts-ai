const fs = require("node:fs"),
  path = require("node:path"),
  ts = require("typescript"),
  postcss = require("postcss");
const roots = ["index.tsx", "ui-acceptance.tsx", "module-acceptance.tsx"],
  seen = new Set(),
  issues = [],
  inventory = {};
function resolve(from, spec) {
  const base = path.resolve(path.dirname(from), spec);
  return [base, base + ".tsx", base + ".ts", base + "/index.tsx"].find(
    (p) => fs.existsSync(p) && fs.statSync(p).isFile(),
  );
}
function scan(file, override) {
  file = path.resolve(file);
  if (seen.has(file)) return;
  if (file.endsWith(".css")) {
    seen.add(file);
    checkCss(fs.readFileSync(file, "utf8"), path.relative(process.cwd(), file));
    return;
  }
  if (!/\.[tj]sx?$/.test(file)) return;
  seen.add(file);
  const source = override ?? fs.readFileSync(file, "utf8"),
    sf = ts.createSourceFile(
      file,
      source,
      ts.ScriptTarget.Latest,
      true,
      file.endsWith("tsx") ? ts.ScriptKind.TSX : ts.ScriptKind.TS,
    ),
    rel = path.relative(process.cwd(), file),
    primitive = rel.startsWith("components/ui/");
  const add = (node, rule, msg) =>
    issues.push({
      file: rel,
      line: sf.getLineAndCharacterOfPosition(node.getStart(sf)).line + 1,
      rule,
      message: msg,
    });
  const attrs = (n) => n.attributes.properties,
    attr = (n, name) => attrs(n).find((x) => x.name?.getText(sf) === name),
    value = (n, name) => attr(n, name)?.initializer;
  function walk(n) {
    if (
      ts.isImportDeclaration(n) &&
      ts.isStringLiteral(n.moduleSpecifier) &&
      n.moduleSpecifier.text.startsWith(".")
    ) {
      const p = resolve(file, n.moduleSpecifier.text);
      if (p) scan(p);
    }
    if (ts.isJsxOpeningElement(n) || ts.isJsxSelfClosingElement(n)) {
      const tag = n.tagName.getText(sf);
      inventory[tag] = (inventory[tag] || 0) + 1;
      if (!primitive) {
        if (["select", "textarea", "button"].includes(tag))
          add(n, "shared-controls", `使用公共组件替代 <${tag}>`);
        if (
          tag === "input" &&
          !["checkbox", "radio", "file", "hidden"].includes(
            value(n, "type")?.text,
          )
        )
          add(
            n,
            "shared-controls",
            "文本、日期、搜索输入必须使用 Input/SearchInput",
          );
        if (tag === "Search")
          add(n, "search-layout", "搜索图标应由 SearchInput 内部管理");
        if (tag === "div" && value(n, "role")?.text === "dialog")
          add(n, "shared-dialog", "弹窗必须复用 WorkspaceDialog");
        if (
          tag === "IconButton" &&
          !attr(n, "aria-label") &&
          !attr(n, "aria-labelledby")
        )
          add(n, "icon-label", "图标按钮缺少可访问名称");
        const c = value(n, "className")?.getText(sf) || "";
        if (/text-\[(?:[0-9]|10|11)px\]/.test(c))
          add(n, "minimum-type", "最小字号为12px");
        if (/\btransition-all\b/.test(c))
          add(n, "explicit-transition", "明确动画属性，不能使用transition-all");
        if (
          ["Input", "Select", "SearchInput"].includes(tag) &&
          /\b(?:p[lrxy]-|text-(?:xs|sm)|rounded-|bg-|border-(?:gray|rose)|h-\d)/.test(
            c,
          )
        )
          add(n, "control-style", "控件视觉尺寸应由公共组件定义，仅保留布局类");
        if (
          ["Input", "Select", "SearchInput"].includes(tag) &&
          ts.isStringLiteral(value(n, "placeholder") || {}) &&
          value(n, "placeholder").text.includes("搜索") &&
          tag === "Input"
        )
          add(n, "search-layout", "搜索输入必须使用 SearchInput");
      }
    }
    ts.forEachChild(n, walk);
  }
  walk(sf);
}
function checkCss(source, file = "index.css") {
  const css = postcss.parse(source, { from: file });
  css.walkRules((rule) => {
    if (
      !/\.(?:input|btn|icon-btn|ui-input-shell|ui-date-control|ui-select-trigger)(?![\w-])/.test(
        rule.selector,
      )
    )
      return;
    let ancestor = rule.parent,
      inLayer = false;
    while (ancestor) {
      if (ancestor.type === "atrule" && ancestor.name === "layer")
        inLayer = true;
      ancestor = ancestor.parent;
    }
    if (!inLayer)
      issues.push({
        file,
        line: rule.source.start.line,
        rule: "css-layer",
        message: "公共控件样式必须在CSS层内，避免覆盖布局工具类",
      });
  });
}
if (process.argv.includes("--self-test")) {
  scan(
    "components/__ui_bad_fixture.tsx",
    'const Bad=()=> <div><input placeholder="搜索联系人"/><select/><textarea/><button/><Search/><IconButton/><Input className="pl-8 text-[10px]"/><div role="dialog"/></div>;',
  );
  checkCss(".input { padding: 4px; }");
  for (const expected of [
    "shared-controls",
    "search-layout",
    "icon-label",
    "minimum-type",
    "control-style",
    "shared-dialog",
    "css-layer",
  ])
    if (!issues.some((i) => i.rule === expected))
      throw Error("Missing guard: " + expected);
  const before = issues.length;
  scan(
    "components/ui/__allowed_fixture.tsx",
    'const Allowed=()=> <input type="text"/>;',
  );
  checkCss("@layer components { .input { height:38px } }");
  if (issues.length !== before)
    throw Error("Allowed primitive/layer was rejected");
  console.log(
    "UI guard self-test: prohibited controls, icon overlap styles, missing names, tiny text, independent dialog and unlayered CSS rejected.",
  );
  process.exit(0);
}
roots.forEach((file) => scan(file));
checkCss(fs.readFileSync("index.css", "utf8"));
const report = {
  version: 1,
  files: seen.size,
  sources: [...seen].map((file) => path.relative(process.cwd(), file)).sort(),
  inventory,
  issues,
};
fs.mkdirSync("output", { recursive: true });
fs.writeFileSync(
  "output/ui-contract-report.json",
  JSON.stringify(report, null, 2),
);
for (const i of issues)
  console.error(`${i.file}:${i.line} [${i.rule}] ${i.message}`);
console.log(`UI contract: ${seen.size} files, ${issues.length} violations`);
process.exitCode = issues.length ? 1 : 0;
