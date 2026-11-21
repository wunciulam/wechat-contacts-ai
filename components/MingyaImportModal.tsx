import React, {useEffect, useMemo, useRef, useState} from 'react';
import {X, Upload, Check, AlertCircle} from 'lucide-react';
import type {ContactImportSnapshot} from '../services/supabaseService';
import {parseMingyaPayload, planMingyaImport, type MingyaPayload, type Resolutions, type MergeMode, type ImportPlan} from '../services/mingyaImport';
import './mingyaImport.css';
interface Props {
  open:boolean; initialPayload:unknown; onClose:()=>void;
  onLoad:()=>Promise<ContactImportSnapshot>;
  onApply:(snapshot:ContactImportSnapshot,plan:ImportPlan,payload:MingyaPayload)=>Promise<void>;
}
const labels:Record<string,string>={policyNumber:'保单号',productName:'产品名称',company:'保险公司',premium:'保费',effectiveDate:'生效日期',status:'状态',applicant:'投保人',insured:'被保人',paymentYears:'缴费期间',insuranceType:'险种',coverage:'保额'};
export default function MingyaImportModal({open,initialPayload,onClose,onLoad,onApply}:Props){
  const [payload,setPayload]=useState<MingyaPayload|null>(null),[snapshot,setSnapshot]=useState<ContactImportSnapshot|null>(null);
  const [resolutions,setResolutions]=useState<Resolutions>({}),[mode,setMode]=useState<MergeMode>('fill');
  const [busy,setBusy]=useState(false),[error,setError]=useState(''),[done,setDone]=useState(false),[query,setQuery]=useState('');
  const input=useRef<HTMLInputElement>(null),dialog=useRef<HTMLDivElement>(null),loadRef=useRef(onLoad);loadRef.current=onLoad;
  useEffect(()=>{
    if(!open)return;
    let active=true;
    setPayload(null);setSnapshot(null);setResolutions({});setError('');setDone(false);setQuery('');setBusy(true);
    const previous=document.activeElement as HTMLElement;dialog.current?.focus();
    loadRef.current().then(data=>{if(active)setSnapshot(data);}).catch(e=>{if(active)setError(e.message);}).finally(()=>{if(active)setBusy(false);});
    if(initialPayload){try{setPayload(parseMingyaPayload(initialPayload));}catch(e){setError((e as Error).message);}}
    return()=>{active=false;previous?.focus();};
  },[open,initialPayload]);
  useEffect(()=>{if(!open)return;const listener=(e:KeyboardEvent)=>{
    if(e.key==='Escape'&&!busy)onClose();
    if(e.key==='Tab'&&dialog.current){const nodes=Array.from(dialog.current.querySelectorAll<HTMLElement>('button:not(:disabled),input,select,summary,[tabindex="0"]')) as HTMLElement[];const visibleNodes=nodes.filter(n=>n.offsetParent!==null);const first=visibleNodes[0],last=visibleNodes[visibleNodes.length-1];if(e.shiftKey&&document.activeElement===first){e.preventDefault();last?.focus();}else if(!e.shiftKey&&document.activeElement===last){e.preventDefault();first?.focus();}}
  };document.addEventListener('keydown',listener);return()=>document.removeEventListener('keydown',listener);},[open,busy,onClose]);
  const result=useMemo(()=>{
    if(!payload||!snapshot)return {plan:null,error:''};
    try{return {plan:planMingyaImport(snapshot.contacts,payload,resolutions,mode),error:''};}catch{return {plan:null,error:'文件包含无法识别的字段，请重新采集并导出。'};}
  },[payload,snapshot,resolutions,mode]);
  const plan=result.plan;
  const rows=plan?.rows.filter(r=>!query||`${r.name} ${r.number} ${r.product} ${r.contact}`.toLowerCase().includes(query.toLowerCase()))||[];
  if(!open)return null;
  async function choose(file?:File){if(!file)return;setError('');setDone(false);setResolutions({});try{if(file.size>64*1024*1024)throw new Error('文件超过 64 MB，请分批导出。');setPayload(parseMingyaPayload(JSON.parse(await file.text())));}catch(e){setError((e as Error).message);}if(input.current)input.current.value='';}
  async function apply(){if(!plan||!snapshot||plan.issues.length)return;setBusy(true);setError('');try{await onApply(snapshot,plan,payload!);setDone(true);}catch(e){setError((e as Error).message);}finally{setBusy(false);}}
  return <div className="mingya-overlay"><div ref={dialog} tabIndex={-1} role="dialog" aria-modal="true" aria-labelledby="mingya-title" className="mingya-dialog">
    <header><h2 id="mingya-title">明亚保单导入</h2><button onClick={onClose} disabled={busy} aria-label="关闭导入"><X size={20}/></button></header>
    <div className="mingya-body">
      {done?<div className="mingya-success" role="status"><Check size={28}/><h3>已导入跟单仔</h3><p>新增 {plan?.addedPolicies} 份，补充或更新 {plan?.updatedPolicies} 份保单。</p><button className="mingya-primary" onClick={onClose}>查看客户保单</button></div>:<>
        {(error||result.error)&&<p className="mingya-error" role="alert"><AlertCircle size={16}/>{error||result.error}</p>}
        {busy&&!plan&&<p role="status">正在读取当前客户…</p>}
        {!payload?<div className="mingya-file"><Upload size={28}/><p>选择明亚插件导出的原始 JSON</p><button className="mingya-primary" disabled={busy||!snapshot} onClick={()=>input.current?.click()}>选择文件</button></div>:plan&&<>
          {!payload.status.complete&&<p className="mingya-warning">这是部分采集结果，仅合并已取得的信息。</p>}
          <dl className="mingya-stats"><div><dt>新增客户</dt><dd>{plan.addedContacts}</dd></div><div><dt>补充客户</dt><dd>{plan.updatedContacts}</dd></div><div><dt>新增保单</dt><dd>{plan.addedPolicies}</dd></div><div><dt>补充 / 更新保单</dt><dd>{plan.updatedPolicies}</dd></div></dl>
          <div className="mingya-rule"><label htmlFor="mingya-mode">已有保单</label><select id="mingya-mode" value={mode} onChange={e=>setMode(e.target.value as MergeMode)}><option value="fill">保留人工修改，更新采集字段</option><option value="source">用明亚数据更新保单字段</option></select></div>
          <p className="mingya-note">客户按投保人归属。微信备注、标签和跟进记录保留；同号续保按生效日期区分。</p>
          {plan.issues.length>0&&<section className="mingya-issues"><h3>需要核对的客户 · {plan.issues.length}</h3>{plan.issues.map(issue=><div key={issue.key} className="mingya-issue"><div><strong>{issue.name||'未提供姓名'}</strong><p>{issue.reason}</p></div><label><span className="mingya-sr">{issue.name}的归属</span><select value={resolutions[issue.key]||''} onChange={e=>setResolutions({...resolutions,[issue.key]:e.target.value})}><option value="">请选择处理方式</option>{issue.allowNew&&issue.candidates.map(c=><option key={c.id} value={c.id}>合并到 {c.name}{c.phone?` · ${c.phone}`:''}</option>)}{issue.allowNew&&<option value="new">建立独立客户</option>}<option value="skip">本次跳过</option></select></label></div>)}</section>}
          <details><summary>保单明细 · {plan.rows.length}{plan.duplicateRows?`（另有 ${plan.duplicateRows} 条重复已忽略）`:''}</summary><input aria-label="搜索导入保单" placeholder="搜索客户、保单号或产品" value={query} onChange={e=>setQuery(e.target.value)}/><div className="mingya-table"><table><thead><tr><th>投保人</th><th>保单</th><th>处理结果</th><th>归属客户</th></tr></thead><tbody>{rows.map(r=><tr key={r.key}><td>{r.name}</td><td><span>{r.product}</span><small>{r.number}</small></td><td>{r.action}</td><td>{r.contact||'—'}</td></tr>)}</tbody></table></div></details>
          {plan.fieldConflicts>0&&<details><summary>已有字段差异 · {plan.fieldConflicts}</summary><div className="mingya-table"><table><thead><tr><th>保单号</th><th>字段</th><th>跟单仔当前值</th><th>明亚本次值</th></tr></thead><tbody>{plan.conflicts.map((c,i)=><tr key={i}><td>{c.number}</td><td>{labels[c.field]||c.field}</td><td>{c.existing}</td><td>{c.incoming}</td></tr>)}</tbody></table></div></details>}
          {(plan.unchangedPolicies>0||!plan.issues.length&&plan.skippedPolicies>0)&&<p className="mingya-note">{[plan.unchangedPolicies>0?`${plan.unchangedPolicies} 份已存在且无变化`:null,!plan.issues.length&&plan.skippedPolicies>0?`${plan.skippedPolicies} 份本次跳过`:null].filter(Boolean).join('，')}。</p>}
        </>}
      </>}
      <input hidden ref={input} type="file" accept=".json,application/json" onChange={e=>choose(e.target.files?.[0])}/>
    </div>
    {!done&&<footer><button disabled={busy} onClick={onClose}>取消</button>{payload&&<button disabled={busy} onClick={()=>input.current?.click()}>更换文件</button>}<button className="mingya-primary" disabled={busy||!plan||plan.issues.length>0||!plan.addedPolicies&&!plan.updatedPolicies&&!plan.updatedContacts} onClick={apply}>{busy?'正在保存…':'确认合并导入'}</button></footer>}
  </div></div>;
}
