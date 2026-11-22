import { financialFromDetail, money } from './mingyaFinancial';
import { reconcileMingyaPayments } from './mingyaPayments';
import type { Contact, Policy, MingyaPolicyData, MingyaPerson } from '../types';

type Json = Record<string, any>;
export interface MingyaPayload { version: 1; status: { complete?: boolean; count?: number; total?: number; finishedAt?: string }; records: {key?: string; list: Json; detail: Json | null}[]; }
export interface IncomingPolicy { key: string; personKey: string; policy: Policy; applicant: MingyaPerson; hasDetail: boolean; }
export interface ImportIssue { key: string; name: string; reason: string; candidates: {id:string;name:string;phone:string}[]; allowNew: boolean; }
export interface ImportPlan {
  contacts: Contact[]; addedContacts: number; updatedContacts: number; addedPolicies: number; updatedPolicies: number;
  unchangedPolicies: number; skippedPolicies: number; duplicateRows: number; fieldConflicts: number;
  conflicts: {number:string;field:string;existing:string;incoming:string}[];
  issues: ImportIssue[]; rows: {key:string;name:string;number:string;product:string;action:string;contact:string}[];
}
export type Resolutions = Record<string, string>;
export type MergeMode = 'fill' | 'source';
const text = (v: unknown) => v == null ? '' : String(v).trim();
export const normalizeId = (v: unknown) => text(v).replace(/\s/g,'').toUpperCase();
const nameKey = (v: unknown) => text(v).replace(/\s/g,'').toLocaleLowerCase();
const readable = (v: unknown) => {const s=text(v);return /MY_\*|\*{2,}|•|●/.test(s)?'':s;};
const phoneKey = (v: unknown) => readable(v).replace(/^\+?86(?=1\d{10}$)/,'').replace(/[\s()-]/g,'');
const identity = (v: unknown) => normalizeId(readable(v));
const companyKey = (v: unknown) => normalizeId(v).replace(/[（）()]/g,'');
export const dateKey = (v: unknown) => { const s=text(v),m=s.match(/^(\d{4})[.\/-](\d{1,2})[.\/-](\d{1,2})/);return m?`${m[1]}-${m[2].padStart(2,'0')}-${m[3].padStart(2,'0')}`:s.slice(0,10); };
const policyKey = (p: Policy) => normalizeId(p.policyNumber)+'|'+companyKey(p.company);
const uuid = () => crypto.randomUUID();
const has = (v: unknown) => v !== undefined && v !== null && text(v) !== '';
const person = (input: Json = {}): MingyaPerson => { const p=input||{};return ({ name:text(p.name),idCard:readable(p.cardNo),phone:readable(p.mobile),birthday:text(p.birthday).slice(0,10),sex:text(p.sex),address:text(p.homeAddress||p.postAddress),share:text(p.bnfRate),order:text(p.bnfOrder) }); };
const period = (n: unknown, unit: unknown) => {const s=text(n),u=text(unit);return s ? `${u==='A'?'至':''}${s}${u==='Y'?'年':u==='M'?'月':u==='D'?'天':u==='A'?'周岁':u?`（单位代码 ${u}）`:''}` : '';};
// Coverage uses insurance periods and explicit end dates, never payment terms.
export function coverageFromDetail(source: Json) {
  const risks: Json[] = Array.isArray(source.riskList) ? source.riskList : [];
  const mains = risks.filter(r => r.mainRiskFlag === true || ['01','1','Y'].includes(text(r.mainRiskFlag)));
  const readablePeriod = (r: Json) => /[\u4e00-\u9fff]/.test(text(r.insurancePeriodText)) ? text(r.insurancePeriodText)
    : ['A','Y','M','D'].includes(text(r.insurancePeriodUnit)) ? period(r.insurancePeriod,r.insurancePeriodUnit) : '';
  const periods = [...new Set((mains.length ? mains : risks).map(readablePeriod).filter(Boolean))];
  const ends = [...new Set(risks.map(r=>text(r.endDate).slice(0,10)).filter(Boolean))];
  const validDate = (value: unknown) => { const d=text(value).slice(0,10);return /^\d{4}-\d{2}-\d{2}$/.test(d)&&!isNaN(Date.parse(d))&&new Date(d+'T00:00:00Z').toISOString().slice(0,10)===d?d:''; };
  return {
    coveragePeriod: readablePeriod(source) || (periods.length===1 ? periods[0] : ''),
    expiryDate: validDate(source.guaranteeEndDate) || validDate(source.endDate) || (ends.length===1 ? validDate(ends[0]) : ''),
    insuranceType: [...new Set((mains.length ? mains : risks).map(r=>text(r.risk?.riskFlag)).filter(v=>/[\u4e00-\u9fff]/.test(v)))].join('、'),
  };
}
function compact(source: Json, capturedAt: string, key: string): MingyaPolicyData {
  return { ...financialFromDetail(source),...coverageFromDetail(source),key,capturedAt,policyId:text(source.policyId),policyIndexId:text(source.policyIndexId),companyId:text(source.insComId),
    currency:text(source.currency),rawStatus:text(source.policyState),endDate:text(source.guaranteeEndDate||source.endDate).slice(0,10),
    applicant:person(source.appnt),
    insureds:(source.insureds||[]).map(person),beneficiaries:(source.beneficiaries||[]).map(person),
    risks:(source.riskList||[]).map((r:Json)=>({name:text(r.risk?.riskName||r.riskName),premium:text(r.prem),coverage:text(r.amntDesc||r.amnt),
      main:r.mainRiskFlag===true||['01','1','Y'].includes(text(r.mainRiskFlag)),paymentPeriod:period(r.payPeriod,r.payPeriodUnit),insurancePeriod:period(r.insurancePeriod,r.insurancePeriodUnit),
      effectiveDate:text(r.validDate).slice(0,10),endDate:text(r.endDate).slice(0,10),state:text(r.state),insureds:(r.insureds||[]).map((p:Json)=>text(p.name)).filter(Boolean)})) };
}
export function parseMingyaPayload(input: unknown): MingyaPayload {
  if(!input || typeof input!=='object')throw new Error('请选择明亚插件导出的原始 JSON 文件。');
  const p=input as MingyaPayload;
  if(p.version!==1||!Array.isArray(p.records)||!p.status||p.records.length>50000)throw new Error('文件格式不符合明亚采集格式。');
  if(!p.records.length)throw new Error('文件中没有保单。');
  for(const r of p.records){if(!r||typeof r.list!=='object'||!r.list||Array.isArray(r.list)||r.detail!==null&&(typeof r.detail!=='object'||Array.isArray(r.detail)))throw new Error('保单数据结构不完整，请重新导出 JSON。');}
  return p;
}
export function normalizeMingya(payload: MingyaPayload): {items: IncomingPolicy[]; duplicates:number} {
  const items:IncomingPolicy[]=[],seen=new Set<string>();let duplicates=0;
  for(const r of payload.records){
    const p={...r.list,...(r.detail||{})};
    const index=text(p.policyIndexId),number=text(p.policyCode),company=text(p.insComName||p.insComSimpleName);
    const key=index?`index:${index}`:`policy:${text(p.dataSource)}:${text(p.policyId)||normalizeId(number)+'|'+companyKey(company)}`;
    const deDupe=normalizeId(number)&&companyKey(company)?normalizeId(number)+'|'+companyKey(company)+'|'+dateKey(p.validDate||p.effectDate):key;
    if(seen.has(key)||seen.has(deDupe)){duplicates++;continue;}seen.add(key);seen.add(deDupe);
    const applicant=person(p.appnt);applicant.name ||= text(p.appntName);
    applicant.idCard ||= readable(p.appntCardNo);applicant.phone ||= readable(p.appntMobile);
    const source=compact(r.detail||{},text(payload.status.finishedAt),key);
    const policy:Policy={id:`mingya-${encodeURIComponent(key)}`,policyNumber:number,productName:text(p.productName),company,
      premium:source.periodicPremium||'',effectiveDate:dateKey(p.validDate||p.effectDate),
      status:({'16':'正式保单','17':'终止保单'} as Record<string,string>)[text(p.policyState)]||`明亚状态（${text(p.policyState)||'未知'}）`,
      applicant:applicant.name,insured:text(p.insuredName)||source.insureds.map(x=>x.name).join('、'),
      coverage:+p.amount===-1?'详见条款':text(p.amount),paymentYears:[...new Set(source.risks.map(x=>x.paymentPeriod).filter(Boolean))].join('、'),paymentFrequency:source.paymentFrequency||'',paymentEndDate:source.paymentEndDate||'',coveragePeriod:source.coveragePeriod||'',expiryDate:source.expiryDate||'',insuranceType:source.insuranceType||'',mingya:source};
    const personKey=identity(applicant.idCard)?`id:${identity(applicant.idCard)}`:phoneKey(applicant.phone)?`phone:${phoneKey(applicant.phone)}:${nameKey(applicant.name)}`:`name:${nameKey(applicant.name)}`;
    items.push({key,personKey,policy,applicant,hasDetail:!!r.detail});
  }
  return {items,duplicates};
}
function sameName(c:Contact,name:string){return [c.remarkName,c.nickname,...(c.policies||[]).map(p=>p.applicant)].some(n=>nameKey(n)&&nameKey(n)===nameKey(name));}
function conflictingId(c:Contact,p:MingyaPerson){return identity(c.idCard)&&identity(p.idCard)&&identity(c.idCard)!==identity(p.idCard);}
function policyMatches(p:Policy,incoming:IncomingPolicy){
  if(p.mingya?.key===incoming.key)return true;
  return !!normalizeId(p.policyNumber)&&!!companyKey(p.company)&&policyKey(p)===policyKey(incoming.policy)&&(!dateKey(p.effectiveDate)||!dateKey(incoming.policy.effectiveDate)||dateKey(p.effectiveDate)===dateKey(incoming.policy.effectiveDate));
}
export function planMingyaImport(existing: Contact[], payload:MingyaPayload, resolutions:Resolutions={},mode:MergeMode='fill'):ImportPlan {
  const {items,duplicates}=normalizeMingya(payload);
  const contacts=structuredClone(existing), touched=new Set<string>(),created=new Set<string>();
  const plan:ImportPlan={contacts,addedContacts:0,updatedContacts:0,addedPolicies:0,updatedPolicies:0,unchangedPolicies:0,skippedPolicies:0,duplicateRows:duplicates,fieldConflicts:0,conflicts:[],issues:[],rows:[]};
  const anchors=new Map<string,Set<string>>();
  const multipleTerms=new Set(items.filter((x,_,arr)=>arr.filter(y=>policyKey(x.policy)===policyKey(y.policy)).length>1).map(x=>policyKey(x.policy)));
  const ambiguousTerm=(p:Policy,incoming:IncomingPolicy)=>!dateKey(p.effectiveDate)&&multipleTerms.has(policyKey(incoming.policy));
  // A shared policy establishes an identity link before any new policy is assigned.
  for(const incoming of items){
    const matches=[...new Map(existing.flatMap(c=>(c.policies||[]).filter(p=>normalizeId(p.policyNumber)&&policyKey(p)===policyKey(incoming.policy)&&nameKey(p.applicant)===nameKey(incoming.applicant.name)).map(()=>c)).map(c=>[c.id,c])).values()];
    if(matches.length===1&&!conflictingId(matches[0],incoming.applicant)&&identity(incoming.applicant.idCard)){
      const set=anchors.get(incoming.personKey)||new Set();set.add(matches[0].id);anchors.set(incoming.personKey,set);
    }
  }
  const newOwners=new Map<string,string>();
  for(const incoming of items){
    const p=incoming.policy,a=incoming.applicant,selection=resolutions[incoming.personKey];
    const row={key:incoming.key,name:a.name||'未提供投保人',number:p.policyNumber,product:p.productName,action:'',contact:''};plan.rows.push(row);
    if(selection==='skip'){plan.skippedPolicies++;row.action='跳过';continue;}
    const matches=contacts.flatMap(c=>(c.policies||[]).filter(x=>policyMatches(x,incoming)&&!ambiguousTerm(x,incoming)).map(x=>({contact:c,policy:x})));
    let owner:Contact|undefined,issue='';let candidates:Contact[]=[];let allowNew=true;
    if(!incoming.hasDetail){issue='保单详情未取得，请重新采集';allowNew=false;}
    else if(!p.policyNumber||!p.company||!a.name){issue='缺少保单号、保险公司或投保人';allowNew=false;}
    else if(matches.length>1){issue='这份保单已存在于多条记录，请先核对现有保单';candidates=matches.map(x=>x.contact);allowNew=false;}
    else if(matches.length===1){
      owner=matches[0].contact;allowNew=false;
      if(conflictingId(owner,a)){issue='已有保单所属客户的证件号不一致';candidates=[owner];owner=undefined;}
    } else {
      const ids=identity(a.idCard)?contacts.filter(c=>identity(c.idCard)===identity(a.idCard)):[];
      const anchorIds=anchors.get(incoming.personKey);
      const linked=anchorIds?[...anchorIds].map(id=>contacts.find(c=>c.id===id)!).filter(Boolean):[];
      const phones=phoneKey(a.phone)?contacts.filter(c=>phoneKey(c.phoneNumber)===phoneKey(a.phone)&&sameName(c,a.name)&&!conflictingId(c,a)):[];
      const strong=ids.length?ids:linked.length?linked:phones;
      if(strong.length===1)owner=strong[0];
      else if(strong.length>1){issue='身份信息匹配到多位客户';candidates=strong;}
      else if(newOwners.has(incoming.personKey))owner=contacts.find(c=>c.id===newOwners.get(incoming.personKey));
      else {candidates=contacts.filter(c=>sameName(c,a.name));if(candidates.length)issue='仅姓名相同，需要确认是否同一人';}
      // A different known insurer with the same number must not silently become a second record.
      const numberMatches=contacts.flatMap(c=>(c.policies||[]).filter(x=>normalizeId(x.policyNumber)===normalizeId(p.policyNumber)&&(companyKey(x.company)!==companyKey(p.company)||ambiguousTerm(x,incoming))).map(()=>c));
      if(numberMatches.length){issue='相同保单号的保险公司不一致，或旧记录缺少年度';candidates=numberMatches;owner=undefined;allowNew=false;}
      if(selection&&selection!=='new'){
        const selected=contacts.find(c=>c.id===selection);
        if(selected&&!conflictingId(selected,a)&&(!numberMatches.length)){owner=selected;issue='';}
      }else if(selection==='new'&&allowNew){owner=undefined;issue='';}
    }
    if(issue){
      if(!plan.issues.some(x=>x.key===incoming.personKey))plan.issues.push({key:incoming.personKey,name:a.name,reason:issue,candidates:[...new Map(candidates.map(c=>[c.id,c])).values()].map(c=>({id:c.id,name:c.remarkName||c.nickname,phone:c.phoneNumber||''})),allowNew});
      plan.skippedPolicies++;row.action='待核对';continue;
    }
    if(!owner){
      owner={id:uuid(),wxid:'',nickname:a.name,remarkName:a.name,remarkInfo:'',tags:['成交客户'],addedAt:Date.now(),dealProducts:[],intentProducts:[],policies:[],followUpStatus:'idle',progressHistory:[]};
      contacts.push(owner);created.add(owner.id);newOwners.set(incoming.personKey,owner.id);plan.addedContacts++;
    }
    row.contact=owner.remarkName||owner.nickname;
    const before=JSON.stringify(owner);
    for(const [key,value] of Object.entries({idCard:a.idCard,phoneNumber:a.phone,birthday:a.birthday,address:a.address})){
      if(!has(owner[key as keyof Contact])&&has(value))(owner as unknown as Json)[key]=value;
    }
    if(matches.length===1){
      const old=matches[0].policy;const merged={...old};
      for(const key of ['policyNumber','productName','company','premium','effectiveDate','status','applicant','insured','paymentYears','paymentFrequency','paymentEndDate','coveragePeriod','expiryDate','insuranceType','coverage'] as const){
        const value=p[key];if(has(old[key])&&has(value)&&text(old[key])!==text(value)){plan.fieldConflicts++;plan.conflicts.push({number:p.policyNumber,field:key,existing:text(old[key]),incoming:text(value)});}
        const fixOldPremium=key==='premium'&&old.mingya&&old.mingya.mappingVersion!==2&&money(old.premium)!==''&&money(old.premium)===p.mingya?.termTotalPremium;
        const sourceField=({premium:'periodicPremium',paymentFrequency:'paymentFrequency',paymentEndDate:'paymentEndDate',coveragePeriod:'coveragePeriod',expiryDate:'expiryDate',insuranceType:'insuranceType'} as Record<string,string>)[key];
        const sourceOwned=old.mingya?.mappingVersion===2&&sourceField&&text(old[key])===text((old.mingya as any)[sourceField]);
        if(has(value)&&(mode==='source'||!has(old[key])||fixOldPremium||sourceOwned))merged[key]=value;
      }
      merged.mingya=p.mingya;
      (merged as any).payments=reconcileMingyaPayments((old as any).payments||[],merged);
      // A new capture time alone does not create a changed policy on every run.
      if(old.mingya&&JSON.stringify({...old.mingya,capturedAt:'',captureId:undefined})===JSON.stringify({...p.mingya,capturedAt:'',captureId:undefined}))merged.mingya=old.mingya;
      if(JSON.stringify(old)!==JSON.stringify(merged)){owner.policies=(owner.policies||[]).map(x=>x.id===old.id?merged:x);plan.updatedPolicies++;row.action='补充 / 更新';}
      else{plan.unchangedPolicies++;row.action='已存在';}
    }else{(p as any).payments=reconcileMingyaPayments([],p);owner.policies=[...(owner.policies||[]),p];plan.addedPolicies++;row.action='新增保单';}
    if(p.productName)owner.dealProducts=[...new Set([...(owner.dealProducts||[]),p.productName])];
    owner.tags=[...new Set([...(owner.tags||[]),'成交客户'])];
    if(before!==JSON.stringify(owner)&&!created.has(owner.id))touched.add(owner.id);
  }
  plan.updatedContacts=touched.size;
  return plan;
}

export function canonicalContactData(value: unknown): string {
  const ordered = (node: any): any => Array.isArray(node) ? node.map(ordered) : node && typeof node === 'object'
    ? Object.fromEntries(Object.keys(node).sort().map(key => [key, ordered(node[key])])) : node;
  return JSON.stringify(ordered(value));
}
