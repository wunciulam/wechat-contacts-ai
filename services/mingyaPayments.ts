import type {Policy} from '../types';
import type {Payment} from './renewal';
import {financialDate,money} from './mingyaFinancial.ts';
const manualAfter=(payment:Payment,capturedAt:string)=>Math.max(Date.parse(payment.confirmedAt||'')||0,...(payment.history||[]).filter(h=>!(h.source||'').startsWith('明亚')).map(h=>Date.parse(h.at)||0))>(Date.parse(capturedAt)||0);
function contractualDate(policy:Policy,actual:string){
  const anchor=financialDate(policy.effectiveDate);if(!anchor||actual<anchor)return false;
  const frequency=policy.paymentFrequency||policy.mingya?.paymentFrequency||'';
  const months=/半年/.test(frequency)?6:/季/.test(frequency)?3:/月/.test(frequency)?1:/年/.test(frequency)?12:0;
  if(!months)return actual===anchor;
  const [y,m,d]=anchor.split('-').map(Number),[ay,am]=actual.split('-').map(Number),delta=(ay-y)*12+am-m;
  if(delta<0||delta%months)return false;
  const target=new Date(Date.UTC(y,m-1+delta,1)),last=new Date(Date.UTC(target.getUTCFullYear(),target.getUTCMonth()+1,0)).getUTCDate();target.setUTCDate(Math.min(d,last));
  return target.toISOString().slice(0,10)===actual;
}
export function reconcileMingyaPayments(payments:Payment[],policy:Policy):Payment[]{
  const result=structuredClone(payments||[]),source=policy.mingya;
  if(source?.mappingVersion!==2||!source.lastPaidDate||money(source.lastPaidPremium)==='')return result;
  const index=result.findIndex(p=>p.date===source.lastPaidDate);
  if(index<0&&!contractualDate(policy,source.lastPaidDate))return result;
  const before=index>=0?result[index]:undefined;
  if(before&&manualAfter(before,source.capturedAt))return result;
  const amount=money(source.lastPaidPremium),already=before?.status==='已缴费'&&money(before.amount)===amount&&before.paidAt===source.lastPaidDate;
  if(already)return result;
  const updated:Payment={...before,date:source.lastPaidDate,amount,status:'已缴费',paidAt:source.lastPaidDate,
    source:'明亚保单详情',history:[...(before?.history||[]),{at:source.capturedAt,from:before?.status||'未记录',to:'已缴费',source:'明亚保单详情·上期实缴'}]};
  if(index>=0)result[index]=updated;else result.push(updated);
  return result.sort((a,b)=>a.date.localeCompare(b.date));
}
export function detailNextPayment(policy:Policy,payments:Payment[]):Payment|undefined{
  const source=policy.mingya;if(source?.mappingVersion!==2||!financialDate(source.nextPayDate))return;
  if((payments||[]).some(p=>p.status==='未缴费'&&p.date<=source.nextPayDate&&manualAfter(p,source.capturedAt)))return;
  const paid=(payments||[]).find(p=>p.date>=source.nextPayDate&&p.status==='已缴费'&&manualAfter(p,source.capturedAt));
  if(paid)return;
  return {date:source.nextPayDate,amount:source.nextPremium,status:source.nextPremiumIsReference?'待确认':'未缴费',
    amountReference:source.nextPremiumIsReference,source:'明亚保单详情',sourceCapturedAt:source.capturedAt};
}
