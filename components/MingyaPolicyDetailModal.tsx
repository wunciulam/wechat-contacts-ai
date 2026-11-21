import React, {useEffect, useRef, useState} from 'react';
import {X, Download} from 'lucide-react';
import type {Policy, MingyaPerson} from '../types';
import {downloadMingyaCapture} from '../services/supabaseService';
import './mingyaImport.css';
export const currencyLabel=(code?:string)=>code==='USD'?'US$':code&&code!=='CNY'?code:'¥';
export default function MingyaPolicyDetailModal({policy,onClose}:{policy:Policy|null;onClose:()=>void}){
  const dialog=useRef<HTMLDivElement>(null),[error,setError]=useState(''),[busy,setBusy]=useState(false);
  useEffect(()=>{if(!policy)return;setError('');const previous=document.activeElement as HTMLElement;dialog.current?.focus();const handle=(e:KeyboardEvent)=>{if(e.key==='Escape'){e.stopPropagation();onClose();}if(e.key==='Tab'&&dialog.current){const nodes=Array.from(dialog.current.querySelectorAll('button:not(:disabled),summary')) as HTMLElement[];const first=nodes[0],last=nodes[nodes.length-1];if(e.shiftKey&&document.activeElement===first){e.preventDefault();last?.focus();}else if(!e.shiftKey&&document.activeElement===last){e.preventDefault();first?.focus();}}};document.addEventListener('keydown',handle);return()=>{document.removeEventListener('keydown',handle);previous?.focus();};},[policy,onClose]);
  if(!policy?.mingya)return null;
  const source=policy.mingya;
  const people=(list:MingyaPerson[])=>list.map((p,i)=><div key={i} className="mingya-person"><strong>{p.name||'未提供姓名'}</strong><dl>{[['证件号',p.idCard],['手机号',p.phone],['生日',p.birthday],['地址',p.address],['受益比例',p.share]].filter(([,v])=>v).map(([k,v])=><div key={k}><dt>{k}</dt><dd>{v}</dd></div>)}</dl></div>);
  const basic=[['保单号',policy.policyNumber],['保险公司',policy.company],['状态',policy.status],['单期保费',`${currencyLabel(source.currency)} ${source.periodicPremium||policy.premium}`],['缴费期总保费',source.termTotalPremium?`${currencyLabel(source.currency)} ${source.termTotalPremium}`:''],['生效日期',policy.effectiveDate],['保障结束日期',source.endDate],['下次缴费日期',source.nextPayDate],[source.nextPremiumIsReference?'下期参考金额':'下期应缴保费',source.nextPremium?`${currencyLabel(source.currency)} ${source.nextPremium}`:''],['上期实缴日期',source.lastPaidDate||''],['上期实缴保费',source.lastPaidPremium?`${currencyLabel(source.currency)} ${source.lastPaidPremium}`:'']];
  async function original(){setBusy(true);setError('');try{const payload=await downloadMingyaCapture(source.captureId!);const url=URL.createObjectURL(new Blob([JSON.stringify(payload,null,2)],{type:'application/json'}));const a=document.createElement('a');a.href=url;a.download=`明亚原始采集_${source.capturedAt.slice(0,10)}.json`;a.click();setTimeout(()=>URL.revokeObjectURL(url),30000);}catch(e){setError((e as Error).message);}finally{setBusy(false);}}
  return <div className="mingya-overlay"><div className="mingya-dialog" role="dialog" aria-modal="true" aria-labelledby="mingya-detail-title" tabIndex={-1} ref={dialog}>
    <header><h2 id="mingya-detail-title">{policy.productName}</h2><button onClick={onClose} aria-label="关闭保单详情"><X size={20}/></button></header>
    <div className="mingya-body"><dl className="mingya-info">{basic.filter(([,v])=>v).map(([k,v])=><div key={k}><dt>{k}</dt><dd>{v}</dd></div>)}</dl>
      {source.nextPaymentNote&&<p className="mingya-note">{source.nextPaymentNote}</p>}
      <details open><summary>投保人</summary>{people([source.applicant])}</details>
      {source.insureds.length>0&&<details><summary>被保人 · {source.insureds.length}</summary>{people(source.insureds)}</details>}
      {source.beneficiaries.length>0&&<details><summary>受益人 · {source.beneficiaries.length}</summary>{people(source.beneficiaries)}</details>}
      {source.risks.length>0&&<details><summary>险种 · {source.risks.length}</summary>{source.risks.map((r,i)=><div className="mingya-person" key={i}><strong>{r.name||'未提供名称'}</strong><dl>{[['保费',`${currencyLabel(source.currency)} ${r.premium}`],['保额',r.coverage],['缴费期间',r.paymentPeriod],['保险期间',r.insurancePeriod],['生效日期',r.effectiveDate],['被保人',r.insureds.join('、')]].filter(([,v])=>v).map(([k,v])=><div key={k}><dt>{k}</dt><dd>{v}</dd></div>)}</dl></div>)}</details>}
      {error&&<p role="alert" className="mingya-error">{error}</p>}
    </div><footer>{source.captureId&&<button disabled={busy} onClick={original} className="flex items-center gap-2"><Download size={15}/>{busy?'正在读取…':'下载本次原始采集'}</button>}<button className="mingya-primary" onClick={onClose}>关闭</button></footer>
  </div></div>;
}
