/* All policy data and request credentials stay in this frame's memory. */
(() => {
  'use strict';
  if (window.__mingyaExport) return;
  const BASE = 'https://policy.mingya.com.cn/pms-1.0/api/policyCenter/';
  const originalFetch = window.fetch;
  let recipe = null, running = false, cancelled = false, controller = null;
  let records = [], failures = [], total = null, readPages = 0, detailDone = 0;
  let message = '请进入「保单」列表，加载后即可采集。', scope = '', startedAt = '', finishedAt = '';
  const pause = ms => new Promise(resolve => setTimeout(resolve, ms));
  const keyOf = p => String(p.policyIndexId || `${p.dataSource || ''}:${p.policyId || p.policyCode || ''}`);
  const endpoint = url => {
    try { const u = new URL(url, location.href); return u.origin + u.pathname; } catch { return ''; }
  };
  const allowed = url => endpoint(url) === BASE + 'pageList' || endpoint(url) === BASE + 'policyInfo';
  const headersOf = source => {
    const result = {};
    new Headers(source || {}).forEach((v, k) => {
      if (!/^sec-|^(cookie|host|origin|referer|user-agent|content-length|connection)$/i.test(k)) result[k] = v;
    });
    return result;
  };
  function observe(url, method, headers, body) {
    if (endpoint(url) !== BASE + 'pageList' || String(method).toUpperCase() !== 'POST') return;
    try {
      const parsed = JSON.parse(body);
      // Only the confirmed normal policy list, never proposal/todo endpoints.
      if (+parsed.policyBigType !== 2 || parsed.isTodo !== false) return;
      recipe = { headers: headersOf(headers), body: parsed };
      if (!running && !records.length) message = '已连接保单列表，可以开始采集。';
    } catch { /* Ignore non-JSON requests. */ }
  }
  // Observe only the two confirmed read endpoints, without changing website traffic.
  const open = XMLHttpRequest.prototype.open, send = XMLHttpRequest.prototype.send;
  const setHeader = XMLHttpRequest.prototype.setRequestHeader;
  const meta = new WeakMap();
  XMLHttpRequest.prototype.open = function(method, url) {
    meta.set(this, { method, url, headers: {} });
    return open.apply(this, arguments);
  };
  XMLHttpRequest.prototype.setRequestHeader = function(k, v) {
    const m = meta.get(this); if (m) m.headers[k] = v;
    return setHeader.apply(this, arguments);
  };
  XMLHttpRequest.prototype.send = function(body) {
    const m = meta.get(this); if (m && allowed(m.url)) observe(m.url, m.method, m.headers, body);
    return send.apply(this, arguments);
  };
  window.fetch = function(input, init) {
    try {
      const url = input instanceof Request ? input.url : String(input);
      if (allowed(url)) {
        const method = init?.method || (input instanceof Request ? input.method : 'GET');
        const headers = init?.headers || (input instanceof Request ? input.headers : {});
        if (init?.body != null) observe(url, method, headers, init.body);
        else if (input instanceof Request) input.clone().text().then(b => observe(url, method, headers, b)).catch(() => {});
      }
    } catch { /* Observation must not break the application. */ }
    return originalFetch.apply(this, arguments);
  };
  async function request(path, body, headers) {
    for (let attempt = 0; attempt < 3; attempt++) {
      if (cancelled) throw new Error('已停止');
      controller = new AbortController();
      const timer = setTimeout(() => controller.abort(), 45000);
      try {
        const response = await originalFetch.call(window, BASE + path, {
          method: 'POST', credentials: 'include', headers: { ...headers, 'content-type': 'application/json' },
          body: JSON.stringify(body), signal: controller.signal
        });
        if ([401, 403].includes(response.status)) throw new Error('登录已失效，请重新登录后采集');
        if ((response.status === 429 || response.status >= 500) && attempt < 2) { await pause(1000 * (attempt + 1)); continue; }
        if (!response.ok) throw new Error(`读取失败（${response.status}）`);
        const json = await response.json();
        if (!['00', '0', '200'].includes(String(json.code))) throw new Error('网站未返回成功结果，请检查登录状态');
        if (!json.data || typeof json.data !== 'object') throw new Error('网站返回的数据结构已变化');
        return json.data;
      } catch (error) {
        if (cancelled) throw new Error('已停止');
        if (error.name === 'AbortError') throw new Error('网站响应超时，请稍后重新采集');
        if (error instanceof TypeError) throw new Error('网络连接失败，请检查网络后重试');
        throw error;
      } finally { clearTimeout(timer); }
    }
  }
  function allBody() {
    // Verified pageList parameters. Null/empty filters mean all policies accessible to this account.
    return { agentCode: null, orderBy: 'sortDate-desc', policyBigType: 2, isTodo: false,
      pageNum: 1, pageSize: 50, hideTg: false, hideSx: false, policySourceList: [],
      policyStateList: [], productTypeList: [], userRoleList: [], productTypeTreeList: [] };
  }
  async function collect(selectedScope) {
    const source = structuredClone(recipe);
    running = true; cancelled = false; records = []; failures = []; total = null;
    readPages = 0; detailDone = 0; scope = selectedScope; startedAt = new Date().toISOString(); finishedAt = '';
    const body = selectedScope === 'all' ? allBody() : { ...source.body, pageNum: 1 };
    const seen = new Map();
    try {
      let ended = false;
      for (let page = 1; page <= 1000; page++) {
        message = `正在读取列表，第 ${page} 页…`;
        const data = await request('pageList', { ...body, pageNum: page }, source.headers);
        if (!Array.isArray(data.list) || !Number.isFinite(+data.total)) throw new Error('分页格式已变化，已保留已采集数据');
        if (+data.pageNum !== page) throw new Error('网站没有返回请求的页码，已停止以避免漏页');
        if (total !== null && total !== +data.total) throw new Error('采集期间保单总数变化，请重新采集');
        total = +data.total; readPages++;
        let added = 0;
        for (const policy of data.list) {
          if (!policy || (!policy.policyIndexId && !policy.policyId && !policy.policyCode)) throw new Error('保单标识缺失');
          const key = keyOf(policy);
          if (!seen.has(key)) { const entry = { key, list: policy, detail: null }; seen.set(key, entry); records.push(entry); added++; }
        }
        if (records.length === total) { ended = true; break; }
        if (!added || data.hasNextPage === false) throw new Error(`列表不完整：已采集 ${records.length} / ${total} 份`);
        await pause(350);
      }
      if (!ended) throw new Error('达到 1000 页上限，列表尚未完整');
      for (const entry of records) {
        if (cancelled) throw new Error('已停止');
        message = `正在读取保单详情…`;
        const p = entry.list;
        try {
          // Same parameters used when opening a policy in the site's own UI.
          const payload = p.policyIndexId
            ? { policyIndexId: p.policyIndexId, policyId: '', dataSource: '', tgMingyaCode: '', ignoreDesensitization: true }
            : { policyIndexId: '', policyId: p.policyId || '', dataSource: p.dataSource || '', tgMingyaCode: p.mingyaCode || '', ignoreDesensitization: true };
          const detail = await request('policyInfo', payload, source.headers);
          if (!detail.policyIndexId && !detail.policyId && !detail.policyCode) throw new Error('详情为空');
          if (p.policyIndexId && detail.policyIndexId && p.policyIndexId !== detail.policyIndexId) throw new Error('详情与保单不匹配');
          if (p.policyCode && detail.policyCode && p.policyCode !== detail.policyCode) throw new Error('详情与保单不匹配');
          entry.detail = detail; entry.detailSource = 'policyCenter/policyInfo'; entry.detailCapturedAt = new Date().toISOString(); detailDone++;
        } catch (error) {
          if (cancelled || /登录/.test(error.message)) throw error;
          failures.push({ 保单号: p.policyCode || '', 标识: entry.key, 原因: error.message });
        }
        await pause(250);
      }
      message = failures.length ? '部分详情未取得，请查看导出文件中的失败清单。' : '采集完成。';
    } catch (error) { message = cancelled ? '已停止，可导出已采集的信息。' : error.message; }
    finally { running = false; controller = null; finishedAt = new Date().toISOString(); }
  }
  function status() {
    return { ready: !!recipe, running, count: records.length, total, readPages, detailDone,
      failed: failures.length, message, scope, startedAt, finishedAt,
      complete: !running && !!finishedAt && !cancelled && records.length === total && detailDone === total && !failures.length };
  }
  // Remove session credentials even if the backend adds them to future policy objects.
  function scrub(value) {
    if (Array.isArray(value)) return value.map(scrub);
    if (value && typeof value === 'object') return Object.fromEntries(Object.entries(value)
      .filter(([k]) => !/token|authorization|password|secret|cookie/i.test(k)).map(([k,v]) => [k, scrub(v)]));
    return value;
  }
  Object.defineProperty(window, '__mingyaExport', { value: Object.freeze({
    status,
    start: selectedScope => {
      if (running) return status();
      if (!recipe) throw new Error('请先进入「保单」列表；若已打开，请刷新页面后重新进入。');
      if (!['all', 'current'].includes(selectedScope)) throw new Error('请选择采集范围');
      void collect(selectedScope); return status();
    },
    stop: () => { if (running) { cancelled = true; controller?.abort(); } return status(); },
    clear: () => { if (running) throw new Error('请先停止采集'); records = []; failures = []; total = null; detailDone = 0; readPages = 0; finishedAt = ''; message = '已清空本次数据。'; return status(); },
    export: () => { if (running) throw new Error('请等待采集结束或先停止'); return scrub({ version: 1, status: status(), records, failures }); }
  }), configurable: false });
})();
