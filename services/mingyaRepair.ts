import type {Contact,Policy} from '../types';
import type {MingyaPayload} from './mingyaImport';
import {normalizeMingya,canonicalContactData} from './mingyaImport';
import {money} from './mingyaFinancial';
import {reconcileMingyaPayments} from './mingyaPayments';
import type {RenewalData} from './renewal';
export function repairCapturedPolicies(contacts:Contact[],renewal:RenewalData,payload:MingyaPayload,captureId:string){
  const lookup=new Map(payload.records.flatMap(record=>normalizeMingya({...payload,records:[record]}).items).map(item=>[item.key,item.policy]));
  let premiums=0,paidUpdates=0,metadata=0;
  const rows:{number:string;beforePremium:string;afterPremium:string;nextDate:string;paidDate:string}[]=[];
  const repair=(original:Policy):Policy=>{
    if(!original.mingya||original.mingya.captureId!==captureId||original.mingya.mappingVersion===2)return structuredClone(original);
    const incoming=lookup.get(original.mingya.key);if(!incoming?.mingya||incoming.policyNumber!==original.policyNumber)return structuredClone(original);
    const p=structuredClone(original),oldPremium=p.premium;
    const sameOldTotal=money(p.premium)!==''&&money(p.premium)===incoming.mingya.termTotalPremium;
    if(incoming.mingya.periodicPremium!==''&&(!p.premium||sameOldTotal))p.premium=incoming.mingya.periodicPremium!;
    if(money(p.premium)!==money(oldPremium))premiums++;
    p.paymentFrequency ||= incoming.paymentFrequency;p.paymentEndDate ||= incoming.paymentEndDate;
    p.mingya={...incoming.mingya,captureId};
    const previous=(p as any).payments||[];const updated=reconcileMingyaPayments(previous,p);
    if(canonicalContactData(previous)!==canonicalContactData(updated))paidUpdates++;
    (p as any).payments=updated;metadata++;
    rows.push({number:p.policyNumber,beforePremium:oldPremium,afterPremium:p.premium,nextDate:p.mingya.nextPayDate,paidDate:p.mingya.lastPaidDate||''});
    return p;
  };
  const resultContacts=contacts.map(c=>({...structuredClone(c),policies:(c.policies||[]).map(repair)}));
  const resultRenewal={...structuredClone(renewal),policies:renewal.policies.map(p=>repair(p) as typeof p)};
  return {contacts:resultContacts,renewal:resultRenewal,counts:{premiums,paidUpdates,metadata},rows};
}
