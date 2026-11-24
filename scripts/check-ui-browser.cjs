/* Browser regression uses fixture routes; never writes real customer records. */
const fs = require("node:fs"),
  path = require("node:path"),
  http = require("node:http"),
  { spawn } = require("node:child_process");
const out = path.resolve("output/ui-regression");
fs.mkdirSync(out, { recursive: true });
for (const file of ["failure.txt", "results.json"])
  fs.rmSync(path.join(out, file), { force: true });
const session = "ui-contract-" + process.pid;
const results = [];
let server;
function command(args) {
  return new Promise((resolve, reject) => {
    const child = spawn(
      "npx",
      [
        "--yes",
        "--package",
        "@playwright/cli@0.1.25",
        "playwright-cli",
        "-s=" + session,
        ...args,
      ],
      { stdio: ["ignore", "pipe", "pipe"] },
    );
    let stdout = "",
      stderr = "";
    child.stdout.on("data", (b) => (stdout += b));
    child.stderr.on("data", (b) => (stderr += b));
    child.on("error", reject);
    child.on("exit", (code) =>
      code || stdout.includes("### Error")
        ? reject(Error((stdout + "\n" + stderr).slice(0, 2500)))
        : resolve(stdout),
    );
  });
}
(async () => {
  let base = process.env.UI_BASE_URL;
  if (!base) {
    server = http.createServer((req, res) => {
      let file = path.resolve(
        "dist",
        "." + decodeURIComponent(new URL(req.url, "http://local").pathname),
      );
      if (
        file !== path.resolve("dist") &&
        !file.startsWith(path.resolve("dist") + path.sep)
      ) {
        res.writeHead(403).end();
        return;
      }
      if (fs.existsSync(file) && fs.statSync(file).isDirectory())
        file = path.join(file, "index.html");
      if (!fs.existsSync(file)) {
        res.writeHead(404).end();
        return;
      }
      const ext = path.extname(file);
      res.setHeader(
        "Content-Type",
        {
          ".html": "text/html",
          ".js": "application/javascript",
          ".css": "text/css",
          ".svg": "image/svg+xml",
        }[ext] || "application/octet-stream",
      );
      fs.createReadStream(file).pipe(res);
    });
    await new Promise((r) => server.listen(0, "127.0.0.1", r));
    base = "http://127.0.0.1:" + server.address().port;
  }
  const config = path.join(out, "cli.config.json");
  fs.writeFileSync(
    config,
    JSON.stringify({
      browser: {
        browserName: "chromium",
        isolated: true,
        launchOptions: {
          channel: process.env.CI ? "chromium" : "chrome",
          headless: true,
        },
      },
      outputDir: out,
      outputMode: "file",
      timeouts: { action: 7000, navigation: 20000 },
    }),
  );
  await command(["open", "about:blank", "--config", config]);
  if (process.env.UI_AUTH_URL) await command(["goto", process.env.UI_AUTH_URL]);
  async function run(name, file) {
    let code = fs
      .readFileSync("tests/ui/" + file, "utf8")
      .trim()
      .replace(/;$/, "")
      .replaceAll("__BASE_URL__", base.replace(/\/$/, ""));
    let output;try {output=await command(["run-code", code]);}catch(e){await command(["screenshot","--filename",path.join(out,"failure.png")]).catch(()=>{});const state=await command(["run-code", 'async page => ({body:await page.locator("body").innerText(), requests:page._follow?.requests})']).catch(()=>"");fs.writeFileSync(path.join(out,"failure-state.txt"),state);throw e;}
    const match = output.match(/### Result\s*\n([^\n]+)/);
    if (!match)
      throw Error(name + ": missing result: " + output.slice(0, 1200));
    const result = JSON.parse(match[1]);
    if (result.errors?.length)
      throw Error(name + ": " + result.errors.join("\n"));
    results.push({ name, ...result });
    console.log("PASS " + name);
  }
  await run("fixture load", "setup.js");
  await run("desktop date/select/keyboard", "controls.js");
  await run("fixture reset", "setup.js");
  await run("mobile modal/scroll/drawer", "mobile.js");
  await run("search alignment and filtering", "search.js");
  await run("fixture reset", "setup.js");
  await run("follow-up failure/retry", "followup.js");
  await run("fixture reset", "setup.js");
  await run("business entry regression", "workflows.js");
  await run("fixture reset", "setup.js");
  await run("density and customer search", "density.js");
  await run("fixture reset", "setup.js");
  await run("contact basic information", "contact-basics.js");
  await run("fixture reset", "setup.js");
  await run("chat OCR, evidence, archive and tasks", "chat-followup.js");
  await run("component acceptance", "acceptance.js");
  fs.writeFileSync(
    path.join(out, "results.json"),
    JSON.stringify({ passed: true, results }, null, 2),
  );
})()
  .catch((e) => {
    fs.writeFileSync(path.join(out, "failure.txt"), String(e));
    console.error(e.message);
    process.exitCode = 1;
  })
  .finally(async () => {
    await command(["close"]).catch(() => {});
    server?.close();
  });
