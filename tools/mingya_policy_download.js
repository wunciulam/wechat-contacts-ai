/* ================================================================
 * 明亚「电子保单」批量下载 · 自动发现版
 * ----------------------------------------------------------------
 * 原理（从 viewer.js / app.js 逆出来的）：
 *   电子保单按钮最终请求：
 *     GET https://policy.mingya.com.cn/pms-1.0/api/policyCom/queryElectronPolicyWithWatermark?policyId=xxx
 *     Header: erptoken: <sessionStorage.erp_token>
 *   直接返回 PDF 字节流。
 *
 * 所以只要拿到「全部 policyId」就能批量下。本脚本不猜列表接口，
 * 而是挂载 XHR/fetch 监听页面真实请求，自动识别出列表接口并翻页。
 *
 * 用法：
 *   1. 在「保单」列表页（能看到 待处理/投保单/保单 那个页面）按 F12
 *   2. 切到 Console，粘贴本文件全部内容，回车
 *   3. 若脚本没自动开始，点一下「保单」标签或翻一页，它捕获到就会自动跑
 *   4. 结束时会下载一个 zip，里面是全部 PDF
 * ================================================================ */
(async function () {
  'use strict';

  var TAG = '[保单]';
  function log()  { console.log.apply(console,  [TAG].concat([].slice.call(arguments))); }
  function warn() { console.warn.apply(console, [TAG].concat([].slice.call(arguments))); }
  function err()  { console.error.apply(console,[TAG].concat([].slice.call(arguments))); }

  var CONFIG = {
    AUTO_DOWNLOAD: true,   // 捕获到就自动开跑
    AUTO_PAGE: true,       // 自动翻页，把全部保单抓完
    MAX_PAGES: 60,
    IDLE_MS: 2000,         // 抓到数据后静默多久开始跑
    CONCURRENCY: 3,
    ZIP: true,             // true=打包成一个 zip（推荐，不会被浏览器拦）
    ZIP_MAX_MB: 350,       // 超过这个体积就改成逐个下载
    PMS:     'https://policy.mingya.com.cn/pms-1.0/api/policyCom/queryElectronPolicyWithWatermark',
    PMS_ALT: 'https://nerpcs.mingya.com.cn/policy-1.0/api/policyCom/queryElectronPolicyWithWatermark',
    DONE_KEY: 'my_policy_download_done_v1'
  };

  /* ---------------- 0. 取 erp_token ---------------- */
  var TOKEN = null, tokenFrom = '';
  ['erp_token', 'jettoken-pc'].forEach(function (k) {
    if (TOKEN) return;
    var v = sessionStorage.getItem(k) || localStorage.getItem(k);
    if (v) { TOKEN = v; tokenFrom = k; }
  });
  if (!TOKEN) {
    err('没找到 erp_token。请确认这是已登录的明亚页面（保单列表页/工作台都行）。');
    return;
  }
  log('erp_token ✓ 来自 ' + tokenFrom + '，长度 ' + TOKEN.length);
  log('若稍后出现 401/403，说明登录态过期，刷新页面重登后重跑即可。');

  /* ---------------- 1. 收集保单 ---------------- */
  var IM = {};                       // policyId -> {code, holder}
  var APIS = [];                     // 捕获到的列表接口
  var ID_RE = /^(policy_?id|erp_?policy_?id)$/i;
  var CODE_KEYS   = ['policycode', 'policyno', 'policy_no', 'policy_code', 'policynumber'];
  var HOLDER_KEYS = ['policyholder', 'policyholdername', 'holdername', 'customername',
                     'insurantname', 'insuredname', 'insured'];

  function pick(o, names) {
    for (var i = 0; i < names.length; i++) {
      var n = names[i];
      for (var k in o) {
        if (k.toLowerCase() === n) {
          var v = o[k];
          if (v !== undefined && v !== null && String(v).trim() !== '') return String(v).trim();
        }
      }
    }
    return '';
  }

  function scan(node, depth) {
    if (!node || typeof node !== 'object' || depth > 7) return 0;
    if (Array.isArray(node)) {
      var c0 = 0;
      for (var i = 0; i < node.length; i++) c0 += scan(node[i], depth + 1);
      return c0;
    }
    var c = 0, id = '';
    for (var k in node) {
      if (ID_RE.test(k)) {
        var v = node[k];
        if ((typeof v === 'string' || typeof v === 'number') && String(v).length >= 6) { id = String(v); break; }
      }
    }
    if (id && !IM[id]) {
      IM[id] = { code: pick(node, CODE_KEYS), holder: pick(node, HOLDER_KEYS) };
      c++;
    }
    for (var k2 in node) {
      if (node[k2] && typeof node[k2] === 'object') c += scan(node[k2], depth + 1);
    }
    return c;
  }

  function onResp(url, method, body, json) {
    var n = scan(json, 0);
    if (n <= 0) return;
    if (!APIS.some(function (a) { return a.url === url && a.method === method; })) {
      APIS.push({ url: url, method: method, body: body, count: n });
    }
    log('捕获 ' + n + ' 个保单 ← ' + method + ' ' + String(url).slice(0, 110));
    log('   累计 ' + Object.keys(IM).length + ' 个');
    schedule();
  }

  /* ---------------- 2. 挂载监听 ---------------- */
  var XO = XMLHttpRequest.prototype.open, XS = XMLHttpRequest.prototype.send;
  XMLHttpRequest.prototype.open = function (m, u) { this.__u = u; this.__m = m; return XO.apply(this, arguments); };
  XMLHttpRequest.prototype.send = function () {
    this.__b = arguments[0];
    this.addEventListener('load', function () {
      try {
        var u = String(this.__u || '');
        if (/queryElectronPolicyWithWatermark/i.test(u)) return;
        var ct = this.getResponseHeader('content-type') || '';
        if (ct.indexOf('json') === -1) return;
        if (!this.responseText || this.responseText.length > 8e6) return;
        onResp(u, this.__m, this.__b, JSON.parse(this.responseText));
      } catch (e) {}
    });
    return XS.apply(this, arguments);
  };

  var OF = window.fetch;
  window.fetch = function () {
    var args = [].slice.call(arguments);
    var req = args[0];
    var url = typeof req === 'string' ? req : (req && req.url) || '';
    var method = (args[1] && args[1].method) || (req && req.method) || 'GET';
    var body = (args[1] && args[1].body) || '';
    var p = OF.apply(this, args);
    p.then(function (res) {
      try {
        if (/queryElectronPolicyWithWatermark/i.test(url)) return;
        var ct = res.headers.get('content-type') || '';
        if (ct.indexOf('json') === -1) return;
        res.clone().json().then(function (j) { onResp(url, method, body, j); }).catch(function () {});
      } catch (e) {}
    }).catch(function () {});
    return p;
  };

  /* ---------------- 3. 自动翻页 ---------------- */
  function pagerOf(api) {
    try {
      var u = new URL(api.url, location.origin);
      var hit = null;
      u.searchParams.forEach(function (v, k) {
        if (hit) return;
        if (/^(page|pageNum|pageNo|pageIndex|current|currentPage)$/i.test(k) && /^\d+$/.test(v)) {
          hit = { type: 'q', key: k, val: +v, base: u.toString() };
        }
      });
      if (hit) return hit;
    } catch (e) {}
    if (api.body && typeof api.body === 'string') {
      try {
        var j = JSON.parse(api.body);
        for (var k in j) {
          if (/^(page|pageNum|pageNo|pageIndex|current|currentPage)$/i.test(k) && typeof j[k] === 'number') {
            return { type: 'b', key: k, val: j[k], src: j, url: api.url, method: api.method };
          }
        }
      } catch (e2) {}
    }
    return null;
  }

  async function autoPage() {
    if (!CONFIG.AUTO_PAGE) return;
    var api = APIS.slice().sort(function (a, b) { return b.count - a.count; })[0];
    if (!api) return;
    var pg = pagerOf(api);
    if (!pg) { warn('列表接口没有分页参数，跳过自动翻页（只处理已捕获的部分）'); return; }
    log('检测到分页参数「' + pg.key + '」，当前值 ' + pg.val + '，开始自动翻页…');
    var empty = 0;
    for (var i = 1; i <= CONFIG.MAX_PAGES; i++) {
      var next = pg.val + i;
      try {
        var r;
        if (pg.type === 'q') {
          var u = new URL(pg.base);
          u.searchParams.set(pg.key, String(next));
          r = await fetch(u.toString(), { credentials: 'include' });
        } else {
          var b = Object.assign({}, pg.src);
          b[pg.key] = next;
          r = await fetch(pg.url, {
            method: pg.method || 'POST', credentials: 'include',
            headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(b)
          });
        }
        var got = scan(await r.json(), 0);
        log('  第 ' + next + ' 页 → 新增 ' + got + '（累计 ' + Object.keys(IM).length + '）');
        if (got === 0) { if (++empty >= 2) { log('  连续两页无新增，翻页结束'); break; } }
        else empty = 0;
      } catch (e) {
        warn('  第 ' + next + ' 页失败：' + e.message);
        break;
      }
    }
  }

  /* ---------------- 4. 下载 ---------------- */
  function loadDone() { try { return new Set(JSON.parse(localStorage.getItem(CONFIG.DONE_KEY) || '[]')); } catch (e) { return new Set(); } }
  function saveDone(s) { try { localStorage.setItem(CONFIG.DONE_KEY, JSON.stringify(Array.from(s))); } catch (e) {} }

  async function getPdf(id) {
    var lastErr = null;
    for (var i = 0; i < 2; i++) {
      var base = i === 0 ? CONFIG.PMS : CONFIG.PMS_ALT;
      var ctl = new AbortController();
      var tid = setTimeout(function () { ctl.abort(); }, 90000);
      try {
        var r = await fetch(base + '?policyId=' + encodeURIComponent(id), {
          headers: { erptoken: TOKEN }, credentials: 'omit', signal: ctl.signal
        });
        clearTimeout(tid);
        if (!r.ok) throw new Error('HTTP ' + r.status);
        var ct = r.headers.get('content-type') || '';
        if (ct.indexOf('json') > -1) {
          var j = await r.json().catch(function () { return {}; });
          throw new Error('接口返回 ' + (j.message || j.msg || JSON.stringify(j).slice(0, 100)));
        }
        var buf = new Uint8Array(await r.arrayBuffer());
        // 实测：token 无效时服务端返回 200 + 空响应体，不是 401
        if (buf.length === 0) throw new Error('__EMPTY__');
        if (buf.length < 500) throw new Error('内容异常，仅 ' + buf.length + ' B（可能不是 PDF）');
        return {
          buf: buf,
          cd: r.headers.get('content-disposition') || '',
          orig: r.headers.get('original-url') || ''
        };
      } catch (e) { clearTimeout(tid); lastErr = e; }
    }
    throw lastErr || new Error('下载失败');
  }

  function stamp() {
    var d = new Date(), p = function (n) { return String(n).padStart(2, '0'); };
    return d.getFullYear() + p(d.getMonth() + 1) + p(d.getDate()) + '_' + p(d.getHours()) + p(d.getMinutes());
  }

  function saveBlob(blob, name) {
    var a = document.createElement('a');
    var url = URL.createObjectURL(blob);
    a.href = url; a.download = name;
    document.body.appendChild(a);
    a.click();
    setTimeout(function () { URL.revokeObjectURL(url); a.remove(); }, 5000);
  }

  function buildName(f, i) {
    var base = '';
    var m = /filename\*=UTF-8''([^;]+)/i.exec(f.cd) || /filename="?([^";]+)"?/i.exec(f.cd);
    if (m) { try { base = decodeURIComponent(m[1]); } catch (e) { base = m[1]; } }
    if (!base) {
      var parts = [f.meta && f.meta.holder, f.meta && f.meta.code].filter(Boolean);
      base = parts.length ? parts.join('_') : ('保单_' + String(i + 1).padStart(3, '0') + '_' + f.id);
    }
    if (!/\.pdf$/i.test(base)) base += '.pdf';
    return base.replace(/[\\/:*?"<>|\r\n\t]/g, '_').replace(/\s+/g, ' ').trim().slice(0, 100);
  }

  /* 最小 ZIP 打包（store 存储，PDF 本身就是压缩格式，不再二次压缩） */
  var CRC_T = (function () {
    var t = new Uint32Array(256);
    for (var n = 0; n < 256; n++) {
      var c = n;
      for (var k = 0; k < 8; k++) c = (c & 1) ? (0xEDB88320 ^ (c >>> 1)) : (c >>> 1);
      t[n] = c >>> 0;
    }
    return t;
  })();
  function crc32(buf) {
    var c = 0xFFFFFFFF;
    for (var i = 0; i < buf.length; i++) c = CRC_T[(c ^ buf[i]) & 0xFF] ^ (c >>> 8);
    return (c ^ 0xFFFFFFFF) >>> 0;
  }
  function makeZip(files) {
    var enc = new TextEncoder();
    var parts = [], central = [], offset = 0;
    files.forEach(function (f) {
      var nb = enc.encode(f.name);
      var crc = crc32(f.data);
      var lh = new DataView(new ArrayBuffer(30));
      lh.setUint32(0, 0x04034b50, true);
      lh.setUint16(4, 20, true); lh.setUint16(6, 0x0800, true); lh.setUint16(8, 0, true);
      lh.setUint16(10, 0, true); lh.setUint16(12, 0, true);
      lh.setUint32(14, crc, true);
      lh.setUint32(18, f.data.length, true); lh.setUint32(22, f.data.length, true);
      lh.setUint16(26, nb.length, true); lh.setUint16(28, 0, true);
      var local = new Uint8Array(30 + nb.length);
      local.set(new Uint8Array(lh.buffer), 0); local.set(nb, 30);
      parts.push(local, f.data);

      var cd = new DataView(new ArrayBuffer(46));
      cd.setUint32(0, 0x02014b50, true);
      cd.setUint16(4, 20, true); cd.setUint16(6, 20, true);
      cd.setUint16(8, 0x0800, true); cd.setUint16(10, 0, true);
      cd.setUint16(12, 0, true); cd.setUint16(14, 0, true);
      cd.setUint32(16, crc, true);
      cd.setUint32(20, f.data.length, true); cd.setUint32(24, f.data.length, true);
      cd.setUint16(28, nb.length, true);
      cd.setUint16(30, 0, true); cd.setUint16(32, 0, true);
      cd.setUint16(34, 0, true); cd.setUint16(36, 0, true);
      cd.setUint32(38, 0, true); cd.setUint32(42, offset, true);
      var c = new Uint8Array(46 + nb.length);
      c.set(new Uint8Array(cd.buffer), 0); c.set(nb, 46);
      central.push(c);
      offset += local.length + f.data.length;
    });
    var cdSize = central.reduce(function (s, c) { return s + c.length; }, 0);
    var eo = new DataView(new ArrayBuffer(22));
    eo.setUint32(0, 0x06054b50, true);
    eo.setUint16(4, 0, true); eo.setUint16(6, 0, true);
    eo.setUint16(8, files.length, true); eo.setUint16(10, files.length, true);
    eo.setUint32(12, cdSize, true); eo.setUint32(16, offset, true);
    eo.setUint16(20, 0, true);
    return new Blob(parts.concat(central, [new Uint8Array(eo.buffer)]), { type: 'application/zip' });
  }

  /* ---------------- 5. 主流程 ---------------- */
  var ran = false;
  async function run() {
    if (ran) return;
    ran = true;
    log('===== 开始执行 =====');
    await autoPage();

    var ids = Object.keys(IM);
    log('共识别到 ' + ids.length + ' 份保单');
    if (!ids.length) { warn('没有保单数据，终止'); return; }

    var done = loadDone();
    var todo = ids.filter(function (id) { return !done.has(id); });
    log('待下载 ' + todo.length + '（已下过 ' + (ids.length - todo.length) + ' 份，自动跳过）');
    if (!todo.length) {
      log('全部已下载过。要重新下：执行 localStorage.removeItem("' + CONFIG.DONE_KEY + '") 后重跑');
      return;
    }

    var files = [], failed = [], okCount = 0, total = todo.length;
    var queue = todo.slice();
    var emptyCount = 0, abortAll = false;

    async function worker() {
      while (queue.length && !abortAll) {
        var id = queue.shift();
        var meta = IM[id] || {};
        try {
          var r = await getPdf(id);
          if (r.orig) {
            warn('[' + (meta.code || id) + '] 无电子保单文件，保司原件地址：' + r.orig);
            failed.push({ id: id, code: meta.code, reason: '保司原始地址，需手动', orig: r.orig });
            continue;
          }
          okCount++;
          emptyCount = 0;
          files.push({ name: '', data: r.buf, id: id, meta: meta, cd: r.cd });
          log('✓ ' + okCount + '/' + total + '  ' + (meta.holder || '') + ' ' + (meta.code || id));
        } catch (e) {
          var msg = e.message === '__EMPTY__' ? '返回空内容（该保单无电子保单，或 token 已失效）' : e.message;
          warn('✗ ' + (meta.code || id) + '  ' + msg);
          failed.push({ id: id, code: meta.code, reason: msg });
          if (e.message === '__EMPTY__') {
            emptyCount++;
            if (okCount === 0 && emptyCount >= 3) {
              abortAll = true;
              queue.length = 0;
              err('连续 3 个都返回空内容 → 判定 erp_token 已失效，已中止。');
              err('处理办法：刷新页面重新登录 → 重新进入保单列表 → 重跑本脚本。');
            }
          }
        }
      }
    }

    var ws = [];
    for (var i = 0; i < CONFIG.CONCURRENCY; i++) ws.push(worker());
    await Promise.all(ws);

    files.forEach(function (f, i) { f.name = buildName(f, i); });

    if (files.length) {
      var mb = files.reduce(function (s, f) { return s + f.data.length; }, 0) / 1048576;
      if (CONFIG.ZIP && mb <= CONFIG.ZIP_MAX_MB) {
        log('打包中…（' + files.length + ' 份，' + mb.toFixed(1) + ' MB）');
        saveBlob(makeZip(files), '明亚电子保单_' + files.length + '份_' + stamp() + '.zip');
        log('已触发下载：明亚电子保单_' + files.length + '份_' + stamp() + '.zip');
      } else {
        for (var k = 0; k < files.length; k++) {
          saveBlob(new Blob([files[k].data], { type: 'application/pdf' }), files[k].name);
          await new Promise(function (r2) { setTimeout(r2, 500); });
        }
        log('已逐个触发 ' + files.length + ' 个 PDF 下载');
      }
      var d2 = loadDone();
      files.forEach(function (f) { d2.add(f.id); });
      saveDone(d2);
    }

    log('===== 完成 =====');
    log('成功 ' + files.length + ' 份，失败 ' + failed.length + ' 份');
    if (failed.length) {
      warn('失败清单（可复制给我）：');
      console.table(failed);
    }
    if (APIS.length) {
      log('本次捕获到的列表接口：');
      APIS.forEach(function (a) { log('  ' + a.method + ' ' + String(a.url).slice(0, 150)); });
    }
  }

  var timer = null;
  function schedule() {
    if (!CONFIG.AUTO_DOWNLOAD || ran) return;
    clearTimeout(timer);
    timer = setTimeout(run, CONFIG.IDLE_MS);
  }

  /* ---------------- 6. 手动入口 & 兜底提示 ---------------- */
  window.myPolicy = {
    report: function () {
      log('已捕获 ' + Object.keys(IM).length + ' 份保单');
      console.table(Object.keys(IM).slice(0, 300).map(function (id) {
        return { policyId: id, 保单号: IM[id].code, 投保人: IM[id].holder };
      }));
    },
    start: function () { ran = false; return run(); },
    apis: function () { return APIS; },
    reset: function () { localStorage.removeItem(CONFIG.DONE_KEY); log('已清空下载记录'); }
  };

  setTimeout(function () {
    if (!Object.keys(IM).length) {
      warn('15 秒内没捕到保单数据。请确认：');
      warn('  ① 当前页面是「保单」列表页（能看到 待处理/投保单/保单 三个标签）');
      warn('  ② 点一下「保单」标签，或翻一页 —— 发出请求后会自动开始');
      warn('  ③ 若仍无反应，执行 myPolicy.apis() 看捕获到什么');
    }
  }, 15000);

  log('监听已就绪。现在去点「保单」标签或翻页，捕获到会自动开始下载。');
  log('手动指令：myPolicy.report() 看清单 / myPolicy.start() 立刻开始 / myPolicy.reset() 清下载记录');
})();
