import Button from './ui/Button';
import React, {useEffect, useState} from 'react';
import {Download} from 'lucide-react';
import type {Policy, MingyaPerson} from '../types';
import {downloadMingyaCapture} from '../services/supabaseService';
import WorkspaceDialog, {WorkspaceDialogFooter} from './WorkspaceDialog';
import {formatMoney} from './PolicyPaymentSummary';
export const currencyLabel=(code?:string)=>code==='USD'?'US$':code&&code!=='CNY'?code:'¥';
export default function MingyaPolicyDetailModal({policy,onClose}:{policy:Policy|null;onClose:()=>void}){
  const [error,setError]=useState(''),[busy,setBusy]=useState(false);
  useEffect(()=>setError(''),[policy]);
  if(!policy?.mingya)return null;
  const source={...policy.mingya,applicant:policy.mingya.applicant||{name:policy.applicant},insureds:policy.mingya.insureds||[],beneficiaries:policy.mingya.beneficiaries||[],risks:policy.mingya.risks||[]};
  const people=(list:Partial<MingyaPerson>[])=>list.map((p,i)=><div key={i} className="mt-4 rounded-lg border border-gray-200 p-4"><strong className="text-sm font-semibold">{p.name||'未提供姓名'}</strong><dl className="mt-3 space-y-3">{[['证件号',p.idCard],['手机号',p.phone],['生日',p.birthday],['地址',p.address],['受益比例',p.share]].filter(([,v])=>v).map(([k,v])=><div key={k} className="grid grid-cols-[5rem_minmax(0,1fr)] gap-4"><dt className="text-xs text-gray-500">{k}</dt><dd className="text-sm break-words">{v}</dd></div>)}</dl></div>);
  const basic=[['保单号',policy.policyNumber],['保险公司',policy.company],['状态',policy.status],['单期保费',formatMoney(source.periodicPremium||policy.premium,source.currency||undefined)],['缴费期总保费',source.termTotalPremium?formatMoney(source.termTotalPremium,source.currency||undefined):''],['生效日期',policy.effectiveDate],['保障期间',source.coveragePeriod],['保障结束日期',source.expiryDate||source.endDate],['险种类型',source.insuranceType],['下次缴费日期',source.nextPayDate],[source.nextPremiumIsReference?'下期参考金额':'下期应缴保费',source.nextPremium?formatMoney(source.nextPremium,source.currency||undefined):''],['上期实缴日期',source.lastPaidDate||''],['上期实缴保费',source.lastPaidPremium?formatMoney(source.lastPaidPremium,source.currency||undefined):'']];
  async function original(){setBusy(true);setError('');try{const payload=await downloadMingyaCapture(source.captureId!);const url=URL.createObjectURL(new Blob([JSON.stringify(payload,null,2)],{type:'application/json'}));const a=document.createElement('a');a.href=url;a.download=`明亚原始采集_${source.capturedAt.slice(0,10)}.json`;a.click();setTimeout(()=>URL.revokeObjectURL(url),30000);}catch(e){setError((e as Error).message);}finally{setBusy(false);}}
  return <WorkspaceDialog title={policy.productName} className="mingya-dialog" onClose={onClose}>
    <div className="space-y-4 text-sm"><dl className="grid grid-cols-1 gap-x-6 gap-y-4 sm:grid-cols-2">{basic.filter(([,v])=>v).map(([k,v])=><div key={k} ><dt className="text-xs text-gray-500">{k}</dt><dd className="mt-1.5 text-sm break-words tabular-nums">{v}</dd></div>)}</dl>
      {source.nextPaymentNote&&<p className="text-xs leading-relaxed text-gray-500">{source.nextPaymentNote}</p>}
      <details open className="border-t border-gray-100 pt-4"><summary className="cursor-pointer font-medium">投保人</summary>{people([source.applicant])}</details>
      {source.insureds.length>0&&<details className="border-t border-gray-100 pt-4"><summary className="cursor-pointer font-medium">被保人 · {source.insureds.length}</summary>{people(source.insureds)}</details>}
      {source.beneficiaries.length>0&&<details className="border-t border-gray-100 pt-4"><summary className="cursor-pointer font-medium">受益人 · {source.beneficiaries.length}</summary>{people(source.beneficiaries)}</details>}
      {source.risks.length>0&&<details className="border-t border-gray-100 pt-4"><summary className="cursor-pointer font-medium">险种 · {source.risks.length}</summary>{source.risks.map((r,i)=><div className="mt-4 rounded-lg border border-gray-200 p-4" key={i}><strong className="text-sm font-semibold">{r.name||'未提供名称'}</strong><dl className="mt-3 space-y-3">{[['保费',formatMoney(r.premium,source.currency||undefined)],['保额',r.coverage],['缴费期间',r.paymentPeriod],['保险期间',r.insurancePeriod],['生效日期',r.effectiveDate],['被保人',r.insureds.join('、')]].filter(([,v])=>v).map(([k,v])=><div key={k} className="grid grid-cols-[5rem_minmax(0,1fr)] gap-4"><dt className="text-xs text-gray-500">{k}</dt><dd className="text-sm break-words">{v}</dd></div>)}</dl></div>)}</details>}
      {error&&<p role="alert" className="text-danger-600">{error}</p>}
    </div><WorkspaceDialogFooter>{source.captureId&&<Button disabled={busy} onClick={original} className="" variant="secondary"><Download size={15}/>{busy?'正在读取…':'下载本次原始采集'}</Button>}<Button className="" onClick={onClose} variant="primary">关闭</Button></WorkspaceDialogFooter>
  </WorkspaceDialog>;
}
