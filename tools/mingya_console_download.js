/* =========================================================================
 * 明亚工作台 · 保单 PDF 批量下载 v2
 *
 * 用法：工作台页面（已登录，能看到任务列表）→ F12 → Console → 粘贴全部 → 回车
 *       首次会提示"允许多个下载"，点允许
 *
 * v2 修正（依据真实接口响应）：
 *   - 列表数据在 data.records（MyBatis-Plus Page），不是 data.list
 *   - pageNum/page/pageSize 等参数服务端不认，改为自动探测 + listUser 兜底
 *   - 按 menuName 分类过滤，默认只取保单/续期/投保类任务
 *   - 已处理任务 id 存 localStorage，可断点续跑
 * ========================================================================= */
(async () => {
  const API = 'https://wps.mingya.com.cn/workbench';

  /* ---------------- 可调参数 ---------------- */
  const ONLY_PDF   = true;      // 只下 PDF
  const DRY_RUN    = false;     // true = 只扫描列清单，不下载
  const FIRST_TYPES = ['1', '2', '3', '4', '5'];  // 6=全部通知(12772条)太重，需要时自己加
  // null = 不过滤，全部任务都要
  const MENU_FILTER = ['保单', '续期', '投保', '缴费', '合同', '保障', '保险', '回执', '核保'];
  const MAX_DETAIL = 2500;      // 最多查多少个任务的详情（防止跑太久）
  const GAP = 650;              // 每个文件下载间隔 ms
  const SLEEP = 130;            // 详情接口间隔 ms
  /* ------------------------------------------ */

  const sleep = ms => new Promise(r => setTimeout(r, ms));
  const log  = (...a) => console.log('%c[明亚]', 'color:#0f6e56;font-weight:bold', ...a);
  const warn = (...a) => console.warn('[明亚]', ...a);

  const jget = async (path, params = {}) => {
    const q = new URLSearchParams(
      Object.entries(params).filter(([, v]) => v !== undefined && v !== null && v !== '')
    ).toString();
    const r = await fetch(`${API}${path}${q ? '?' + q : ''}`, {
      credentials: 'include',
      headers: { platform: 'WEB', Accept: 'application/json' }
    });
    if (!r.ok) throw new Error(`HTTP ${r.status} @ ${path}`);
    const j = await r.json();
    if (j.code && j.code !== 200) throw new Error(`${j.msg || j.message || '接口错误'} @ ${path}`);
    return j;
  };

  const clean = (s, max = 70) =>
    String(s || '未命名').replace(/[\\/:*?"<>|\r\n\t]/g, '_').trim().slice(0, max) || '未命名';

  const extOf = (f, url) => {
    const t = (f.type || '').toLowerCase();
    const m = { pdf: '.pdf', jpg: '.jpg', jpeg: '.jpg', png: '.png',
                xlsx: '.xlsx', xls: '.xls', doc: '.doc', docx: '.docx' };
    if (m[t]) return m[t];
    const x = String(url || '').match(/\.([A-Za-z0-9]{2,5})(?:\?|$)/);
    return x ? '.' + x[1].toLowerCase() : '';
  };

  /* ---------- 1. 登录态 ---------- */
  try {
    await jget('/task/list', { firstType: '1' });
    log('登录态有效 ✓');
  } catch (e) {
    console.error('%c[明亚] 未登录/会话过期：' + e.message, 'color:#a32d2d;font-weight:bold');
    return;
  }

  /* ---------- 2. 探测分页是否生效 ---------- */
  let paginationWorks = false;
  {
    const j = await jget('/task/list', { firstType: '1', size: 100 });
    const d = j.data || {};
    if (d.size === 100) { paginationWorks = true; log('分页参数生效（size/current）'); }
    else log(`分页参数不生效（服务端返回 size=${d.size}），改用 listUser 全量拉取`);
  }

  /* ---------- 3. 收集任务 ---------- */
  const tasks = new Map();   // id -> task

  const collectFromList = async (ft) => {
    let page = 1, added = 0, total = null;
    while (page <= 200) {
      const j = await jget('/task/list', { firstType: ft, current: page, size: 100 });
      const d = j.data || {};
      const recs = d.records || [];
      total = d.total;
      if (!recs.length) break;
      for (const t of recs) {
        if (t && t.id && !tasks.has(t.id)) { tasks.set(t.id, t); added++; }
      }
      if (paginationWorks && (page * 100) >= (total || 0)) break;
      if (!paginationWorks) break;   // 不生效时只拿第一页
      page++;
      await sleep(120);
    }
    return { added, total };
  };

  const collectFromUser = async (ft) => {
    // /task/listUser 一次返回该用户名下全部 tasks
    const j = await jget('/task/listUser', { firstType: ft });
    const d = j.data || {};
    const groups = d.records || (Array.isArray(d) ? d : []);
    let added = 0;
    for (const g of groups) {
      for (const t of (g.tasks || [])) {
        if (t && t.id && !tasks.has(t.id)) { tasks.set(t.id, t); added++; }
      }
    }
    return { added, total: groups.reduce((s, g) => s + (g.tasks || []).length, 0) };
  };

  for (const ft of FIRST_TYPES) {
    try {
      const r = paginationWorks ? await collectFromList(ft) : await collectFromUser(ft);
      log(`类型${ft} → 新增 ${r.added}（该分类共 ${r.total ?? '?'}，累计 ${tasks.size}）`);
    } catch (e) {
      warn(`类型${ft} 拉取失败：${e.message}`);
    }
  }

  if (!tasks.size) { warn('没有取到任何任务'); return; }

  /* ---------- 4. 按 menuName 分类统计 ---------- */
  const all = [...tasks.values()];
  const byMenu = new Map();
  for (const t of all) {
    const k = t.menuName || '(无分类)';
    byMenu.set(k, (byMenu.get(k) || 0) + 1);
  }
  const table = [...byMenu.entries()].sort((a, b) => b[1] - a[1]);
  log(`共 ${all.length} 个去重任务，分类分布如下：`);
  console.table(table.map(([menu, n]) => ({ 分类: menu, 任务数: n })));

  /* ---------- 5. 筛选 ---------- */
  const hit = (t) => !MENU_FILTER ||
    MENU_FILTER.some(k => (t.menuName || '').includes(k) || (t.title || '').includes(k));

  let targets = all.filter(hit);
  log(`命中筛选条件 ${targets.length} 个任务（关键词：${MENU_FILTER ? MENU_FILTER.join('/') : '不过滤'}）`);

  if (targets.length > MAX_DETAIL) {
    warn(`超过上限 ${MAX_DETAIL}，只处理前 ${MAX_DETAIL} 个。如需全量请调大 MAX_DETAIL。`);
    targets = targets.slice(0, MAX_DETAIL);
  }

  if (DRY_RUN) {
    console.table(targets.slice(0, 60).map(t => ({
      标题: (t.title || '').slice(0, 40),
      分类: t.menuName, 时间: t.pushTime, id: t.id
    })));
    log('DRY_RUN 已开启，未下载。把 DRY_RUN 改成 false 再跑一次即可。');
    return;
  }

  /* ---------- 6. 逐个取附件 ---------- */
  const files = [];
  const doneKey = 'mya_done_files';
  const doneFiles = new Set(JSON.parse(localStorage.getItem(doneKey) || '[]'));
  const detailDone = new Set(JSON.parse(localStorage.getItem('mya_done_tasks') || '[]'));

  let i = 0;
  for (const t of targets) {
    i++;
    const tid = t.id;
    if (detailDone.has(String(tid))) continue;
    try {
      const j = await jget('/task/taskDetail', { id: tid });
      const d = j.data || {};
      for (const f of (d.fileInfo || [])) {
        let url = f.url;
        if (!url) {
          try { url = (await jget('/file/view', { fileId: f.id, taskId: tid })).data; }
          catch { }
        }
        if (!url) continue;
        const ext = extOf(f, url);
        if (ONLY_PDF && ext.toLowerCase() !== '.pdf') continue;
        const key = `${tid}/${f.id}`;
        if (doneFiles.has(key)) continue;
        files.push({
          key, task: clean(t.title || `task-${tid}`), menu: t.menuName || '',
          name: clean(f.name || 'unnamed'), ext, url
        });
      }
      detailDone.add(String(tid));
      localStorage.setItem('mya_done_tasks', JSON.stringify([...detailDone]));
    } catch (e) {
      if (i % 50 === 0) warn(`任务 ${tid} 详情失败：${e.message}`);
    }
    if (i % 25 === 0) log(`详情进度 ${i}/${targets.length}，已找到 ${files.length} 个 PDF`);
    await sleep(SLEEP);
  }

  log(`扫描完成：共找到 ${files.length} 个待下载 PDF`);
  if (!files.length) { warn('这些任务下没有 PDF 附件。可把 ONLY_PDF 改 false 看全部类型。'); return; }

  /* ---------- 7. 下载 ---------- */
  let ok = 0, fail = 0;
  const failed = [];
  for (const f of files) {
    try {
      const r = await fetch(f.url, { credentials: 'omit' });
      if (!r.ok) throw new Error('HTTP ' + r.status);
      const blob = await r.blob();
      if (blob.size < 200) throw new Error('文件过小，可能不是有效 PDF');
      const a = document.createElement('a');
      a.href = URL.createObjectURL(blob);
      a.download = f.name + f.ext;
      document.body.appendChild(a);
      a.click();
      setTimeout(() => { URL.revokeObjectURL(a.href); a.remove(); }, 5000);
      doneFiles.add(f.key);
      localStorage.setItem(doneKey, JSON.stringify([...doneFiles]));
      ok++;
      log(`✓ ${ok}/${files.length}  ${f.name}${f.ext}  (${f.menu})`);
    } catch (e) {
      fail++; failed.push(f);
      warn(`✗ ${f.name}${f.ext} — ${e.message}`);
    }
    await sleep(GAP);
  }

  log(`全部完成：成功 ${ok}，失败 ${fail}`);
  if (failed.length) {
    console.table(failed.map(f => ({ 任务: f.task.slice(0, 30), 文件: f.name + f.ext, 直链: f.url })));
  }
  log('若浏览器提示"已阻止多个下载"，点地址栏右侧图标选『始终允许』后重跑，已下的会自动跳过。');
})();
