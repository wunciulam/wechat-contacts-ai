/* =========================================================================
 * 明亚工作台 · 任务详情结构探针（只读，不改数据）
 * 目的：查清附件到底藏在哪个字段里
 * 用法：工作台页面 F12 → Console → 粘贴 → 回车（约 40-60 秒）
 * ========================================================================= */
(async () => {
  const API = 'https://wps.mingya.com.cn/workbench';
  const sleep = ms => new Promise(r => setTimeout(r, ms));
  const log = (...a) => console.log('%c[探针]', 'color:#534ab7;font-weight:bold', ...a);

  const jget = async (path, params = {}) => {
    const q = new URLSearchParams(params).toString();
    const r = await fetch(`${API}${path}${q ? '?' + q : ''}`, {
      credentials: 'include', headers: { platform: 'WEB', Accept: 'application/json' }
    });
    return r.json();
  };

  /* 1. 取任务，按 menuName 分组抽样 */
  const tasks = new Map();
  for (const ft of ['1', '2', '4']) {
    try {
      const j = await jget('/task/listUser', { firstType: ft });
      const gs = (j.data && (j.data.records || j.data)) || [];
      for (const g of (Array.isArray(gs) ? gs : [])) {
        for (const t of (g.tasks || [])) if (t.id && !tasks.has(t.id)) tasks.set(t.id, t);
      }
    } catch (e) { log('拉列表失败', ft, e.message); }
  }
  log(`总任务 ${tasks.size}`);

  const byMenu = new Map();
  for (const t of tasks.values()) {
    const k = t.menuName || '(无)';
    if (!byMenu.has(k)) byMenu.set(k, []);
    byMenu.get(k).push(t);
  }
  log(`分类数 ${byMenu.size}`);

  /* 2. 每类抽 3 个查详情 */
  const samples = [];
  for (const [menu, arr] of byMenu) {
    for (const t of arr.slice(0, 3)) samples.push({ menu, t });
  }
  log(`抽样 ${samples.length} 个任务查详情…`);

  const arrayStat = new Map();   // 字段名 -> {count, maxLen}
  const pdfHits = [];
  let withAttach = 0;
  const menuStat = new Map();
  let bestSample = null;

  for (let i = 0; i < samples.length; i++) {
    const { menu, t } = samples[i];
    let d = null;
    try {
      const j = await jget('/task/taskDetail', { id: t.id });
      d = j.data || {};
    } catch (e) { continue; }

    if (!menuStat.has(menu)) menuStat.set(menu, { n: 0, attach: 0 });
    const ms = menuStat.get(menu);
    ms.n++;

    let found = false;
    const walk = (obj, path, depth) => {
      if (!obj || depth > 4) return;
      for (const [k, v] of Object.entries(obj)) {
        if (Array.isArray(v)) {
          const st = arrayStat.get(k) || { count: 0, maxLen: 0 };
          st.count++; st.maxLen = Math.max(st.maxLen, v.length);
          arrayStat.set(k, st);
          if (v.length) {
            found = true;
            if (!bestSample) bestSample = { menu, title: t.title, id: t.id, path: path + '.' + k, val: v };
          }
          v.slice(0, 3).forEach((x, idx) => { if (x && typeof x === 'object') walk(x, `${path}.${k}[${idx}]`, depth + 1); });
        } else if (v && typeof v === 'object') {
          walk(v, path + '.' + k, depth + 1);
        } else if (typeof v === 'string') {
          if (/\.pdf(\?|$)/i.test(v) || /^https?:\/\//.test(v)) {
            pdfHits.push({ menu, title: (t.title || '').slice(0, 25), field: path + '.' + k, val: v.slice(0, 160) });
          }
        }
      }
    };
    walk(d, 'data', 0);

    if (found) { withAttach++; ms.attach++; }
    if (i % 20 === 0) log(`进度 ${i}/${samples.length}`);
    await sleep(90);
  }

  /* 3. 输出结论 */
  log(`抽查 ${samples.length} 个任务，其中 ${withAttach} 个含数组内容`);

  log('各分类：抽查数 / 有内容数');
  console.table([...menuStat.entries()].map(([m, v]) => ({ 分类: m, 抽查: v.n, 有内容: v.attach })));

  log('所有出现过的数组字段（字段名 / 非空次数 / 最大长度）：');
  console.table([...arrayStat.entries()].sort((a, b) => b[1].count - a[1].count)
    .map(([k, v]) => ({ 字段: k, 出现次数: v.count, 最大长度: v.maxLen })));

  if (bestSample) {
    log(`第一个有内容的字段：${bestSample.path}（分类：${bestSample.menu}）`);
    console.log(JSON.stringify(bestSample.val.slice(0, 2), null, 2).slice(0, 1500));
  } else {
    log('★ 所有抽查任务的数组字段全为空 —— 说明任务详情本身不含附件');
  }

  if (pdfHits.length) {
    log(`发现含 pdf 链接或 http 地址的字符串 ${pdfHits.length} 处：`);
    console.table(pdfHits.slice(0, 15));
  } else {
    log('没有在任何字符串里发现 .pdf 或 http 链接');
  }

  /* 4. dump 一条完整详情，看全貌 */
  if (samples.length) {
    const { menu, t } = samples.find(s => s.menu.includes('续期')) || samples[0];
    try {
      const j = await jget('/task/taskDetail', { id: t.id });
      log(`完整样例如下（分类：${menu}，任务：${(t.title || '').slice(0, 30)}）`);
      console.log('顶层字段:', Object.keys(j.data || {}).join(', '));
      console.log(JSON.stringify(j.data, null, 2).slice(0, 3000));
    } catch (e) { log('dump 失败', e.message); }
  }

  log('探针结束');
})();
