import React, {useEffect, useMemo, useRef, useState} from 'react';
import {Upload, Check, AlertCircle} from 'lucide-react';
import type {ContactImportSnapshot} from '../services/supabaseService';
import {parseMingyaPayload, planMingyaImport, type MingyaPayload, type Resolutions, type MergeMode, type ImportPlan} from '../services/mingyaImport';
import WorkspaceDialog, {WorkspaceDialogFooter} from './WorkspaceDialog';
interface Props {
  open:boolean; initialPayload:unknown; onClose:()=>void;
  onLoad:()=>Promise<ContactImportSnapshot>;
  onApply:(snapshot:ContactImportSnapshot,plan:ImportPlan,payload:MingyaPayload)=>Promise<void>;
}
const labels:Record<string,string>={policyNumber:'保单号',productName:'产品名称',company:'保险公司',premium:'保费',effectiveDate:'生效日期',status:'状态',applicant:'投保人',insured:'被保人',paymentYears:'缴费期间',insuranceType:'险种',coverage:'保额',coveragePeriod:'保障期间',expiryDate:'保障到期日'};
export default function MingyaImportModal({open,initialPayload,onClose,onLoad,onApply}:Props){
  const [payload,setPayload]=useState<MingyaPayload|null>(null),[snapshot,setSnapshot]=useState<ContactImportSnapshot|null>(null);
  const [resolutions,setResolutions]=useState<Resolutions>({}),[mode,setMode]=useState<MergeMode>('fill');
  const [busy,setBusy]=useState(false),[error,setError]=useState(''),[done,setDone]=useState(false),[query,setQuery]=useState('');
  const input=useRef<HTMLInputElement>(null),loadRef=useRef(onLoad);loadRef.current=onLoad;
  useEffect(()=>{
    if(!open)return;
    let active=true;
    setPayload(null);setSnapshot(null);setResolutions({});setError('');setDone(false);setQuery('');setBusy(true);
    loadRef.current().then(data=>{if(active)setSnapshot(data);}).catch(e=>{if(active)setError(e.message);}).finally(()=>{if(active)setBusy(false);});
    if(initialPayload){try{setPayload(parseMingyaPayload(initialPayload));}catch(e){setError((e as Error).message);}}
    return()=>{active=false;};
  },[open,initialPayload]);
  const result=useMemo(()=>{
    if(!payload||!snapshot)return {plan:null,error:''};
    try{return {plan:planMingyaImport(snapshot.contacts,payload,resolutions,mode),error:''};}catch(e){return {plan:null,error:e instanceof Error&&e.message.includes('长保单号')?e.message:'文件包含无法识别的字段，请重新采集并导出。'};}
  },[payload,snapshot,resolutions,mode]);
  const plan=result.plan;
  const rows=plan?.rows.filter(r=>!query||`${r.name} ${r.number} ${r.product} ${r.contact}`.toLowerCase().includes(query.toLowerCase()))||[];
  if(!open)return null;
  async function choose(file?:File){if(!file)return;setError('');setDone(false);setResolutions({});try{if(file.size>64*1024*1024)throw new Error('文件超过 64 MB，请分批导出。');setPayload(parseMingyaPayload(JSON.parse(await file.text())));}catch(e){setError((e as Error).message);}if(input.current)input.current.value='';}
  async function apply(){if(!plan||!snapshot||plan.issues.length)return;setBusy(true);setError('');try{await onApply(snapshot,plan,payload!);setDone(true);}catch(e){setError((e as Error).message);}finally{setBusy(false);}}
  return <WorkspaceDialog title="明亚保单导入" size="import" className="mingya-dialog" onClose={()=>{if(!busy)onClose();}}>
    <div className="space-y-4 text-sm">
      {(error||result.error)&&<p className="flex items-start gap-2 text-danger-600" role="alert"><AlertCircle size={16} className="mt-0.5 shrink-0"/>{error||result.error}</p>}
      {done ? <div className="space-y-2" role="status">
        <h3 className="flex items-center gap-2 font-semibold"><Check size={18}/>已导入跟单仔</h3>
        <p className="text-gray-600">新增 {plan?.addedPolicies} 份，补充或更新 {plan?.updatedPolicies} 份保单。</p>
      </div> : <>
        {busy&&!plan&&<p role="status" className="text-gray-500">正在读取当前客户…</p>}
        {!payload ? <div className="space-y-4">
          <p className="text-gray-600">选择明亚插件导出的 JSON 文件。</p>
          <button className="btn btn-primary text-sm" disabled={busy||!snapshot} onClick={()=>input.current?.click()}><Upload size={16}/>选择文件</button>
        </div> : plan&&<>
          <p className="text-xs text-gray-500">预览，尚未保存。</p>
          {plan.filteredPolicies>0&&<p className="text-xs text-gray-500">已过滤 {plan.filteredPolicies} 份终止或撤单保单。</p>}
          {!payload.status.complete&&<p className="text-sm text-gray-600">这是部分采集结果，仅合并已取得的信息。</p>}
          <dl className="grid grid-cols-2 gap-x-6 gap-y-4 sm:grid-cols-4">
            {([['新增客户',plan.addedContacts],['补充客户',plan.updatedContacts],['新增保单',plan.addedPolicies],['更新保单',plan.updatedPolicies]] as const).map(([label,value])=><div key={label}><dt className="text-xs text-gray-500">{label}</dt><dd className="mt-1.5 text-sm font-semibold tabular-nums">{value}</dd></div>)}
          </dl>
          <div className="grid gap-1.5 sm:max-w-md">
            <label htmlFor="mingya-mode" className="text-xs font-medium text-gray-500">已有保单处理方式</label>
            <select id="mingya-mode" className="input" disabled={busy} value={mode} onChange={e=>setMode(e.target.value as MergeMode)}>
              <option value="fill">保留人工修改，更新采集字段</option><option value="source">用明亚数据更新保单字段</option>
            </select>
          </div>
          <details className="border-t border-gray-100 pt-4"><summary className="cursor-pointer text-gray-600">合并规则</summary><p className="mt-3 text-xs leading-relaxed text-gray-500">客户按投保人归属；保留微信备注、标签和跟进记录。同号续保按生效日期区分。</p></details>
          {plan.issues.length>0&&<section className="space-y-4 border-t border-gray-100 pt-4">
            <h3 className="font-semibold">需要核对的客户（{plan.issues.length}）</h3>
            {plan.issues.map(issue=><div key={issue.key} className="grid items-start gap-x-6 gap-y-3 border-b border-gray-100 pb-4 sm:grid-cols-2">
              <div><h4 className="font-medium">{issue.name||'未提供姓名'}</h4><p className="mt-1.5 text-xs leading-relaxed text-gray-500">{issue.reason}</p></div>
              <label className="min-w-0"><span className="sr-only">{issue.name}的归属</span><select className="input" disabled={busy} value={resolutions[issue.key]||''} onChange={e=>setResolutions({...resolutions,[issue.key]:e.target.value})}>
                <option value="">请选择处理方式</option>{issue.allowNew&&issue.candidates.map(c=><option key={c.id} value={c.id}>合并到 {c.name}{c.phone?` · ${c.phone}`:''}</option>)}{issue.allowNew&&<option value="new">建立独立客户</option>}<option value="skip">本次跳过</option>
              </select></label>
            </div>)}
          </section>}
          <details className="border-t border-gray-100 pt-4"><summary className="cursor-pointer">保单明细（{plan.rows.length}）{plan.duplicateRows?`，已忽略 ${plan.duplicateRows} 条重复`:''}</summary>
            <input className="input mt-4" aria-label="搜索导入保单" placeholder="搜索客户、保单号或产品" value={query} onChange={e=>setQuery(e.target.value)}/>
            <div className="mt-4 max-h-80 overflow-auto rounded-lg border border-gray-200"><table className="w-full text-left"><thead className="table-header sticky top-0"><tr>{['投保人','保单','处理结果','归属客户'].map(h=><th key={h} className="px-4 py-3 font-medium whitespace-nowrap">{h}</th>)}</tr></thead><tbody>{rows.map(r=><tr key={r.key} className="table-row"><td className="table-cell whitespace-nowrap">{r.name}</td><td className="table-cell min-w-48"><span>{r.product}</span><small className="mt-1 block text-xs text-gray-500 whitespace-nowrap">{r.number}</small></td><td className="table-cell whitespace-nowrap">{r.action}</td><td className="table-cell whitespace-nowrap">{r.contact||'—'}</td></tr>)}</tbody></table></div>
          </details>
          {plan.fieldConflicts>0&&<details className="border-t border-gray-100 pt-4"><summary className="cursor-pointer">已有字段差异（{plan.fieldConflicts}）</summary><div className="mt-4 max-h-80 overflow-auto rounded-lg border border-gray-200"><table className="w-full text-left"><thead className="table-header sticky top-0"><tr>{['保单号','字段','当前值','明亚本次值'].map(h=><th key={h} className="px-4 py-3 font-medium whitespace-nowrap">{h}</th>)}</tr></thead><tbody>{plan.conflicts.map((c,i)=><tr key={i} className="table-row"><td className="table-cell whitespace-nowrap">{c.number}</td><td className="table-cell whitespace-nowrap">{labels[c.field]||c.field}</td><td className="table-cell min-w-32">{c.existing}</td><td className="table-cell min-w-32">{c.incoming}</td></tr>)}</tbody></table></div></details>}
          {(plan.unchangedPolicies>0||!plan.issues.length&&plan.skippedPolicies>0)&&<p className="text-xs text-gray-500">{[plan.unchangedPolicies>0?`${plan.unchangedPolicies} 份无变化`:null,!plan.issues.length&&plan.skippedPolicies>0?`${plan.skippedPolicies} 份本次跳过`:null].filter(Boolean).join('，')}。</p>}
        </>}
      </>}
      <input hidden ref={input} type="file" accept=".json,application/json" onChange={e=>choose(e.target.files?.[0])}/>
    </div>
    <WorkspaceDialogFooter>
      {done ? <button className="btn btn-primary text-sm" onClick={onClose}>查看客户保单</button> : <>
        <button className="btn btn-secondary text-sm" disabled={busy} onClick={onClose}>取消</button>
        {payload&&<><button className="btn btn-secondary text-sm" disabled={busy} onClick={()=>input.current?.click()}>更换文件</button><button className="btn btn-primary text-sm" disabled={busy||!plan||plan.issues.length>0||!plan.addedPolicies&&!plan.updatedPolicies&&!plan.updatedContacts} onClick={apply}>{busy?'正在保存…':'确认合并导入'}</button></>}
      </>}
    </WorkspaceDialogFooter>
  </WorkspaceDialog>;
}
