import { test } from 'node:test';
import assert from 'node:assert/strict';
import vm from 'node:vm';
import fs from 'node:fs';
import {createRequire} from 'node:module';
const require=createRequire(import.meta.url), XLSX=require('xlsx');
const collector=fs.readFileSync(new URL('../mingya-export-extension/collector.js',import.meta.url),'utf8');
const exporter=fs.readFileSync(new URL('../mingya-export-extension/export.js',import.meta.url),'utf8');
const base='https://policy.mingya.com.cn/pms-1.0/api/policyCenter/';
function harness(handler){
  class XHR{open(){}send(){}setRequestHeader(){}}
  const calls=[];
  const w={fetch:async(url,init)=>{const body=JSON.parse(init.body);calls.push({url,body});return handler(url,body,init);}};
  const ctx={window:w,XMLHttpRequest:XHR,Headers,Request,URL,location:{href:'https://app.mingya.com.cn/salespolicy/'},
    AbortController,structuredClone,Date,setTimeout:(cb,ms)=>ms===45000?0:setTimeout(cb,0),clearTimeout};
  vm.runInNewContext(collector,ctx);
  return {w,calls,api:w.__mingyaExport};
}
const ok=data=>({ok:true,status:200,json:async()=>({code:'00',data})});
const policy=i=>({policyIndexId:`index${i}`,policyId:`id${i}`,policyCode:`000${i}`,productName:'产品',totalFee:0});
async function ready(h){await h.w.fetch(base+'pageList',{method:'POST',headers:{erptoken:'secret'},body:JSON.stringify({policyBigType:2,isTodo:false,pageNum:1,pageSize:2,hideSx:true})});}
async function finished(api){for(let i=0;i<200&&api.status().running;i++)await new Promise(r=>setTimeout(r,5));assert.equal(api.status().running,false);}
test('all pages and nested details; credentials stay out of export',async()=>{
 const h=harness((url,b)=>url.endsWith('pageList')?ok({pageNum:b.pageNum,total:3,hasNextPage:b.pageNum<2,list:b.pageNum===1?[policy(1),policy(2)]:[policy(3)]}):ok({...policy(+b.policyIndexId.slice(5)),erptoken:'secret',appnt:{cardNo:'001234',mobile:'01234'},riskList:[{prem:0}]}));
 await ready(h);h.api.start('all');await finished(h.api);const p=h.api.export();
 assert.equal(p.status.complete,true);assert.equal(p.records.length,3);assert.equal(p.status.detailDone,3);assert.ok(!JSON.stringify(p).includes('secret'));
 assert.equal(h.calls[1].body.hideSx,false);assert.equal(h.calls[1].body.hideTg,false);
 assert.deepEqual(h.calls.filter(c=>c.url.endsWith('policyInfo')).map(c=>c.body.policyIndexId),['index1','index2','index3']);
});
test('ignored page parameter never reports a complete export',async()=>{
 const h=harness(()=>ok({pageNum:1,total:3,list:[policy(1),policy(2)],hasNextPage:true}));await ready(h);h.api.start('current');await finished(h.api);
 assert.equal(h.api.status().complete,false);assert.equal(h.api.status().count,2);assert.match(h.api.status().message,/页码/);
});
test('detail failure retains the list and records the failure',async()=>{
 const h=harness(url=>url.endsWith('pageList')?ok({pageNum:1,total:1,list:[policy(1)]}):({ok:false,status:400}));await ready(h);h.api.start('all');await finished(h.api);
 assert.equal(h.api.status().complete,false);assert.equal(h.api.export().records.length,1);assert.equal(h.api.export().failures.length,1);
});
test('expired login stops fetching details',async()=>{
 let n=0;const h=harness(url=>url.endsWith('pageList')?ok({pageNum:1,total:2,list:[policy(1),policy(2)]}):(n++,{ok:false,status:401}));await ready(h);h.api.start('all');await finished(h.api);
 assert.equal(n,1);assert.match(h.api.status().message,/登录/);assert.equal(h.api.status().complete,false);
});
test('export preserves identifiers, zero premium, formula-like text, nested values and long fields',()=>{
 const ctx={};vm.runInNewContext(exporter,ctx);
 const entry={...policy(1),appntName:'=1+1',remark:'长'.repeat(35000),insureds:[{name:'客户',cardNo:'00001'}]};
 const payload={records:[{list:entry,detail:{...entry,riskList:[{prem:0}]}}],status:{scope:'all',complete:true,count:1,total:1,detailDone:1,failed:0},failures:[]};
 const book=ctx.MingyaFile.workbook(payload,XLSX);const decoded=XLSX.read(XLSX.write(book,{type:'buffer',bookType:'xlsx'}),{type:'buffer'});
 const data=XLSX.utils.sheet_to_json(decoded.Sheets['保单汇总']);assert.equal(data[0]['保单号'],'0001');assert.equal(data[0]['保费'],0);assert.equal(data[0]['投保人姓名'],'=1+1');
 const fields=XLSX.utils.sheet_to_json(decoded.Sheets['全部字段']);assert.equal(fields.filter(r=>r['字段']==='详情.remark').map(r=>r['值']).join(''),'长'.repeat(35000));
 assert.ok(fields.some(r=>r['字段']==='详情.insureds.0.cardNo'&&r['值']==='00001'));
});
