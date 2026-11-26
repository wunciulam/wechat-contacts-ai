/* ================================================================
 * 明亚保单页 · 抓包诊断器
 * ----------------------------------------------------------------
 * 目的：这个保单页是另一套系统，凭证位置和接口都跟 web.mingya.com.cn 不同。
 * 本脚本做三件事（全部只读，不改数据）：
 *   1. 盘点登录凭证：sessionStorage / localStorage / cookie 全部列出来
 *   2. 抓真实请求：XHR / fetch / window.open 全挂上监听
 *   3. 打印卡片上「电子保单」按钮的绑定方式（外链？还是 JS 调用？）
 *
 * 你需要做的：粘贴运行后，随便点一张卡片上的「电子保单」按钮（会开新标签，正常），
 * 再点一下顶部「保单」标签。然后把控制台输出截图发我。
 * ================================================================ */
(function () {
  'use strict';

  var TAG = '[抓包]';
  function log()  { console.log.apply(console,  [TAG].concat([].slice.call(arguments))); }
  function warn() { console.warn.apply(console, [TAG].concat([].slice.call(arguments))); }
  function grp(t) { try { console.groupCollapsed(TAG + ' ' + t); } catch (e) { log(t); } }
  function grpEnd() { try { console.groupEnd(); } catch (e) {} }

  /* 把超长字符串（token 之类）遮掉，方便截图外发 */
  function mask(s) {
    return String(s === undefined || s === null ? '' : s)
      .replace(/[A-Za-z0-9_\-\.]{40,}/g, function (m) { return '<T' + m.length + '>'; });
  }
  function clip(s, n) {
    s = mask(s);
    return s.length > n ? s.slice(0, n) + '…' : s;
  }

  /* ============ 1. 盘点凭证 ============ */
  var TOKENS = [];

  function addTok(src, k, v) {
    if (typeof v !== 'string' || !v) return;
    var likely = /token|auth|ticket|jwt|sso|erp|jet|credential|session/i.test(k) && v.length >= 16;
    TOKENS.push({ src: src, k: k, v: v, len: v.length, likely: likely });
  }

  try {
    for (var i = 0; i < sessionStorage.length; i++) {
      var sk = sessionStorage.key(i);
      addTok('session', sk, sessionStorage.getItem(sk));
    }
  } catch (e) {}

  try {
    for (var j = 0; j < localStorage.length; j++) {
      var lk = localStorage.key(j);
      addTok('local', lk, localStorage.getItem(lk));
    }
  } catch (e) {}

  try {
    document.cookie.split(';').forEach(function (c) {
      var p = c.indexOf('=');
      if (p > 0) addTok('cookie', c.slice(0, p).trim(), c.slice(p + 1).trim());
    });
  } catch (e) {}

  function printTokens() {
    grp('① 磁盘上能看到的凭证（共 ' + TOKENS.length + ' 条）');
    var rows = TOKENS.map(function (t) {
      return {
        来源: t.src,
        键名: t.k,
        长度: t.len,
        '像凭证?': t.likely ? '★' : '',
        值前缀: mask(t.v).slice(0, 24)
      };
    });
    if (rows.length) console.table(rows); else warn('三个存储里都是空的');
    grpEnd();
  }

  /* ============ 2. 抓真实请求 ============ */
  var REC = [];

  function interesting(url, ct, resp) {
    if (/polic|pdf|file|down|view|order|print|insur|attach|bill|doc/i.test(url)) return true;
    if (/policyid|policyId|"policy/i.test(resp || '')) return true;
    return false;
  }

  function push(rec) {
    var key = rec.method + ' ' + String(rec.url).split('?')[0];
    var dup = REC.some(function (r) { return r.method + ' ' + String(r.url).split('?')[0] === key; });
    REC.push(rec);
    if (dup) return;
    if (!interesting(rec.url, rec.ct, rec.resp)) return;

    log('▲ ' + rec.method + ' ' + clip(rec.url, 200));
    if (rec.headers && Object.keys(rec.headers).length) {
      var hk = Object.keys(rec.headers).map(function (k) {
        return k + '=' + clip(rec.headers[k], 60);
      });
      log('   请求头: ' + hk.join(', '));
    }
    if (rec.body) log('   请求体: ' + clip(rec.body, 300));
    log('   响应: status=' + rec.status + ' ct=' + rec.ct +
        (rec.resp ? ' 长度=' + rec.resp.length : ''));
    if (rec.resp) log('   响应片段: ' + clip(rec.resp, 320));
  }

  /* --- XHR --- */
  var XO = XMLHttpRequest.prototype.open;
  var XS = XMLHttpRequest.prototype.send;
  var XH = XMLHttpRequest.prototype.setRequestHeader;

  XMLHttpRequest.prototype.open = function (m, u) {
    this.__u = u; this.__m = m; this.__h = {};
    return XO.apply(this, arguments);
  };
  XMLHttpRequest.prototype.setRequestHeader = function (k, v) {
    if (this.__h) this.__h[k] = v;
    return XH.apply(this, arguments);
  };
  XMLHttpRequest.prototype.send = function (b) {
    var self = this;
    self.__b = b;
    self.addEventListener('loadend', function () {
      try {
        var txt = '';
        try { txt = self.responseType === '' || self.responseType === 'text' ? self.responseText : ''; } catch (e) {}
        push({
          via: 'xhr', method: self.__m, url: self.__u, headers: self.__h,
          body: typeof self.__b === 'string' ? self.__b : '',
          status: self.status,
          ct: self.getResponseHeader('content-type') || '',
          resp: txt || ''
        });
      } catch (e) {}
    });
    return XS.apply(this, arguments);
  };

  /* --- fetch --- */
  var OF = window.fetch;
  window.fetch = function () {
    var args = [].slice.call(arguments);
    var req = args[0];
    var url = typeof req === 'string' ? req : (req && req.url) || '';
    var method = (args[1] && args[1].method) || (req && req.method) || 'GET';
    var body = (args[1] && args[1].body) || '';
    var hdr = {};
    try {
      var h = (args[1] && args[1].headers) || (req && req.headers);
      if (h) {
        if (typeof h.forEach === 'function' && !Array.isArray(h)) h.forEach(function (v, k) { hdr[k] = v; });
        else Object.keys(h).forEach(function (k) { hdr[k] = h[k]; });
      }
    } catch (e) {}
    var p = OF.apply(this, args);
    p.then(function (res) {
      try {
        res.clone().text().then(function (t) {
          push({ via: 'fetch', method: method, url: url, headers: hdr, body: String(body), status: res.status, ct: res.headers.get('content-type') || '', resp: t });
        }).catch(function () {});
      } catch (e) {}
    }).catch(function () {});
    return p;
  };

  /* --- window.open（电子保单很可能就是开新标签） --- */
  var OPENS = [];
  var WO = window.open;
  window.open = function (u) {
    try {
      OPENS.push(String(u || ''));
      log('↗ window.open 被调用：' + clip(u, 240));
    } catch (e) {}
    return WO.apply(this, arguments);
  };

  /* ============ 3. 卡片按钮绑定方式 ============ */
  function attrMap(el) {
    var o = {};
    try {
      for (var i = 0; i < el.attributes.length; i++) {
        o[el.attributes[i].name] = clip(el.attributes[i].value, 80);
      }
    } catch (e) {}
    return o;
  }

  function findButtons() {
    var out = [];
    var all = document.querySelectorAll('button, a, span, div, i');
    for (var i = 0; i < all.length; i++) {
      var el = all[i];
      if (el.children.length) continue;
      var t = (el.textContent || '').trim();
      if (t !== '电子保单') continue;
      var host = el.closest('button') || el.closest('a') || el.parentElement || el;
      out.push(host);
    }
    return out;
  }

  function printButtons() {
    var bs = findButtons();
    grp('③ 「电子保单」按钮绑定方式（页面上一共 ' + bs.length + ' 个）');
    if (!bs.length) warn('没找到，可能文案不完全一样');
    bs.slice(0, 3).forEach(function (b, idx) {
      log('--- 第 ' + (idx + 1) + ' 个 ---');
      log('标签: ' + b.tagName + '    class: ' + clip(b.className, 120));
      var at = attrMap(b);
      if (Object.keys(at).length) {
        log('属性:');
        Object.keys(at).forEach(function (k) { log('   ' + k + ' = ' + at[k]); });
      }
      log('HTML: ' + clip(b.outerHTML, 400));
    });
    grpEnd();
  }

  /* ============ 4. 对外接口 ============ */
  window.__cap = {
    tokens: TOKENS,
    rec: REC,
    opens: OPENS,
    report: function () { printTokens(); printButtons(); console.table(OPENS.map(function (u) { return { open: clip(u, 200) }; })); },
    dump: function () {
      grp('全部捕获请求（' + REC.length + ' 条）');
      console.table(REC.map(function (r) {
        return { method: r.method, url: clip(String(r.url).split('?')[0], 90), status: r.status, ct: r.ct.slice(0, 30) };
      }));
      grpEnd();
    },
    /* 用候选凭证挨个试打 PDF 接口，看哪个能用 */
    tryPdf: async function (policyId) {
      if (!policyId) { warn('用法：await __cap.tryPdf("保单ID")'); return; }
      var bases = [
        'https://policy.mingya.com.cn/pms-1.0/api/policyCom/queryElectronPolicyWithWatermark',
        'https://nerpcs.mingya.com.cn/policy-1.0/api/policyCom/queryElectronPolicyWithWatermark'
      ];
      var cand = TOKENS.filter(function (t) { return t.likely; });
      log('候选凭证 ' + cand.length + ' 个，开始逐个试…');
      for (var i = 0; i < cand.length; i++) {
        for (var b = 0; b < bases.length; b++) {
          try {
            var r = await fetch(bases[b] + '?policyId=' + encodeURIComponent(policyId), {
              headers: { erptoken: cand[i].v }, credentials: 'omit'
            });
            var buf = new Uint8Array(await r.arrayBuffer());
            var ok = buf.length > 500 && buf[0] === 0x25 && buf[1] === 0x50; // %PDF
            log('  [' + cand[i].src + '/' + cand[i].k + '] base' + (b + 1) + ' → ' + r.status + ' ' + buf.length + 'B ' + (ok ? '✅ PDF 可用' : ''));
            if (ok) { log('★ 可用凭证：' + cand[i].src + ' / ' + cand[i].k); return true; }
          } catch (e) {
            log('  [' + cand[i].src + '/' + cand[i].k + '] 失败：' + e.message);
          }
        }
      }
      warn('所有候选凭证都没打通 PDF 接口');
      return false;
    }
  };

  /* ============ 5. 直接开跑 ============ */
  log('监听已就绪（XHR / fetch / window.open 全部已挂钩）');
  printTokens();
  printButtons();
  log('———— 现在请你做两件事 ————');
  log('  1) 随便点一张卡片上的「电子保单」按钮（会开新标签，正常，不用管它）');
  log('  2) 点一下顶部「保单」标签，或滚动/翻页');
  log('之后把控制台输出整段截图发我即可。');
  log('可用指令：__cap.report() 重看凭证和按钮 / __cap.dump() 看全部请求 / __cap.tryPdf("id") 试下载');
})();
