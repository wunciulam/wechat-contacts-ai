(function (root) {
  'use strict';
  const fields = {
    policyCode: '保单号', productName: '产品名称', insComName: '保险公司',
    totalFee: '保费', validDate: '生效日期', effectDate: '承保日期', appntName: '投保人姓名', insuredName: '被保人',
    appntMobile: '手机号', appntCardNo: '证件号', amount: '保额', currency: '币种',
    policyState: '保单状态代码', dataSource: '数据来源代码', policySource: '保单来源代码',
    endDate: '结束日期', guaranteeEndDate: '保障结束日期', receiveDate: '交单日期',
    nextPayDate: '下次缴费日期', nextPrem: '下次保费', insurancePeriod: '保险期间',
    insurancePeriodUnit: '保险期间单位代码', salerName: '销售人员', salerServiceName: '服务人员',
    benefName: '受益人', remark: '备注', policyId: '保单ID', policyIndexId: '保单索引ID'
  };
  function fullFields(value, path, rows, policy) {
    if (value && typeof value === 'object') {
      const entries = Object.entries(value);
      if (!entries.length) rows.push({ 保单号: policy, 字段: path, 值: Array.isArray(value) ? '[]' : '{}' });
      else for (const [key, child] of entries) fullFields(child, path ? `${path}.${key}` : key, rows, policy);
    } else {
      const text = value == null ? '' : String(value);
      // Excel cells have a 32767 character limit; preserve oversized values in numbered chunks.
      const parts = Math.max(1, Math.ceil(text.length / 30000));
      for (let i=0; i<parts; i++) rows.push({ 保单号: policy, 字段: path, 分段: `${i+1}/${parts}`, 类型: value === null ? 'null' : typeof value, 值: text.slice(i*30000,(i+1)*30000) });
    }
  }
  function tables(payload) {
    const summary=[], all=[], people=[], risks=[];
    for (const entry of payload.records) {
      const p={...entry.list,...(entry.detail||{})};
      const number=String(p.policyCode||'');
      const summaryPolicy={...p,appntMobile:p.appnt?.mobile||p.appntMobile,appntCardNo:p.appnt?.cardNo||p.appntCardNo};
      const row=Object.fromEntries(Object.entries(fields).map(([key,label])=>[label,summaryPolicy[key] ?? '']));
      // Keep backend codes explicit; do not invent a status or convert currencies/units.
      row['详情采集']=entry.detail?'成功':'未取得';
      summary.push(row);
      fullFields(entry.list,'列表',all,number);
      if(entry.detail) fullFields(entry.detail,'详情',all,number);
      for (const [role, list] of [['投保人',p.appnt?[p.appnt]:[]],['被保人',p.insureds||[]],['受益人',p.beneficiaries||[]]]) {
        for (const person of list) {
          const out={保单号:number,角色:role};
          for(const [key,val] of Object.entries(person)) if(val===null||typeof val!=='object') out[key]=val??'';
          people.push(out);
        }
      }
      for (const risk of p.riskList||[]) {
        const out={保单号:number};
        for (const [key,val] of Object.entries(risk)) if(val===null||typeof val!=='object') out[key]=val??'';
        risks.push(out);
      }
    }
    return { 保单汇总:summary, 人员信息:people, 险种信息:risks, 全部字段:all,
      采集结果:[{范围:payload.status.scope==='all'?'全部保单（含终止、托管）':'当前筛选',
        完整:payload.status.complete?'是':'否', 网站总数:payload.status.total??'', 列表数量:payload.status.count,
        详情成功:payload.status.detailDone, 详情失败:payload.status.failed,
        开始时间:payload.status.startedAt, 结束时间:payload.status.finishedAt, 结果:payload.status.message}],
      失败清单:payload.failures };
  }
  function workbook(payload, XLSX) {
    const book=XLSX.utils.book_new();
    for(const [name,rows] of Object.entries(tables(payload))) {
      if (!rows.length) continue;
      // Split big tables before Excel's 1,048,576-row limit.
      for(let start=0;start<rows.length;start+=1000000) {
        const safeRows=rows.slice(start,start+1000000).map(row=>Object.fromEntries(Object.entries(row).map(([k,v])=>[k,typeof v==='string'&&v.length>32700?v.slice(0,32000)+'（完整内容见「全部字段」）':v])));
        const sheet=XLSX.utils.json_to_sheet(safeRows);
        sheet['!cols']=Object.keys(rows[0]).map(k=>({wch:k==='字段'?42:k==='值'?55:22}));
        if(sheet['!ref'])sheet['!autofilter']={ref:sheet['!ref']};
        XLSX.utils.book_append_sheet(book,sheet,start?`${name}${start/1000000+1}`:name);
      }
    }
    return book;
  }
  root.MingyaFile={tables,workbook};
})(typeof globalThis !== 'undefined' ? globalThis : this);
