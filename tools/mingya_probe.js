/* =========================================================================
 * 明亚工作台 · 任务列表接口探针（诊断用，不改任何数据）
 *
 * 用法：在工作台页面 F12 → Console → 粘贴全部 → 回车
 * 把打印出来的结果整段截图或复制发给我
 * ========================================================================= */
(async () => {
  const API = 'https://wps.mingya.com.cn/workbench';
  const tk = () => (sessionStorage.getItem('wps_token') || '').slice(0, 6) + '…';

  const probe = async (label, path, params) => {
    const q = new URLSearchParams(
      Object.entries(params).filter(([, v]) => v !== undefined && v !== null)
    ).toString();
    const url = `${API}${path}${q ? '?' + q : ''}`;
    try {
      const r = await fetch(url, {
        credentials: 'include',
        headers: { platform: 'WEB', Accept: 'application/json' }
      });
      const j = await r.json();
      const d = j.data;
      let shape = 'data=' + (Array.isArray(d) ? `Array(${d.length})` : typeof d);
      if (d && !Array.isArray(d)) {
        const keys = Object.keys(d).slice(0, 8);
        shape += ' keys=[' + keys.join(',') + ']';
        for (const k of ['list', 'records', 'rows', 'total', 'totalCount']) {
          if (k in d) {
            const v = d[k];
            shape += ` ${k}=` + (Array.isArray(v) ? `Array(${v.length})` : v);
          }
        }
      }
      console.log(`%c[${label}]`, 'color:#0f6e56;font-weight:bold', `code=${j.code} ${j.msg || ''}`);
      console.log('   ', shape);
      console.log('   ', url);
      // 深挖一层：list[0] 的结构
      const list = Array.isArray(d) ? d : (d && (d.list || d.records || d.rows));
      if (Array.isArray(list) && list.length) {
        const first = list[0];
        console.log('    list[0] keys:', Object.keys(first).join(','));
        if (first.tasks) {
          console.log('    list[0].tasks:', Array.isArray(first.tasks) ? `Array(${first.tasks.length})` : typeof first.tasks);
          if (Array.isArray(first.tasks) && first.tasks[0]) {
            console.log('    tasks[0] keys:', Object.keys(first.tasks[0]).join(','));
            console.log('    tasks[0] 示例:', JSON.stringify(first.tasks[0]).slice(0, 300));
          }
        } else {
          console.log('    list[0] 示例:', JSON.stringify(first).slice(0, 300));
        }
      }
      console.log('---');
      return j;
    } catch (e) {
      console.log(`%c[${label}] 失败`, 'color:#a32d2d', e.message, url);
      console.log('---');
      return null;
    }
  };

  console.log('%c=== 明亚任务列表探针开始 ===', 'color:#534ab7;font-weight:bold');
  console.log('sessionStorage wps_token:', tk() || '(空)');

  // A. 裸调用，看默认返回什么
  await probe('A 裸 /task/list', '/task/list', {});

  // B. 只有 firstType
  for (const ft of ['1', '2', '3', '4', '5', '6']) {
    await probe(`B firstType=${ft}`, '/task/list', { firstType: ft });
  }

  // C. 分页参数名比对
  await probe('C1 pageNum/pageSize', '/task/list', { firstType: '1', pageNum: 1, pageSize: 10 });
  await probe('C2 page/limit', '/task/list', { firstType: '1', page: 1, limit: 10 });
  await probe('C3 currentPage/size', '/task/list', { firstType: '1', currentPage: 1, size: 10 });
  await probe('C4 pageIndex/pageSize', '/task/list', { firstType: '1', pageIndex: 1, pageSize: 10 });

  // D. 换 /task/listUser
  await probe('D /task/listUser', '/task/listUser', { firstType: '1', pageNum: 1, pageSize: 10 });

  // E. 计数接口（能看出总共有多少任务）
  await probe('E /task/count', '/task/count', {});
  await probe('E2 /task/menuCount', '/task/menuCount', {});

  console.log('%c=== 探针结束，请把以上全部结果发我 ===', 'color:#534ab7;font-weight:bold');
})();
