import React from 'react';
import type {Contact} from '../types';
import type {ManagedPolicy} from '../services/renewal';

// One schema drives new policy entry, detail editing and detail display.
export const policyFields: [keyof ManagedPolicy, string, string?][] = [
  ['productName','产品名称'], ['applicant','投保人'], ['insured','被保人'],
  ['company','保险公司'], ['policyNumber','保单号'], ['applicationNumber','投保单号'],
  ['status','保单状态'], ['premium','单期保费'], ['effectiveDate','生效日期','date'],
  ['paymentFrequency','缴费方式'], ['paymentYears','缴费期间'], ['paymentEndDate','缴费结束日期（不含当天）','date'],
  ['coveragePeriod','保障期间'], ['expiryDate','保障到期日','date'], ['coverage','保额'], ['insuranceType','险种类型'],
];
const groups = [
  {label:'保单信息', keys:['productName','policyNumber','applicationNumber','company','applicant','insured','status','effectiveDate']},
  {label:'缴费信息',keys:['premium','paymentFrequency','paymentYears','paymentEndDate']},
  {label:'保障信息',keys:['coveragePeriod','expiryDate','coverage','insuranceType']},
];
export default function PolicyFieldsForm({value,onChange,contacts,identityReadonly=false,disabled=false,requireApplicant=false}:{
  value:ManagedPolicy;onChange:(p:ManagedPolicy)=>void;contacts:Contact[];identityReadonly?:boolean;disabled?:boolean;requireApplicant?:boolean;
}) {
  const formId=React.useId();
  const fieldMap = new Map(policyFields.map(f=>[f[0],f]));
  return <div className="space-y-6">{groups.map(group=><fieldset key={group.label} disabled={disabled}>
    <legend className="mb-4 text-sm font-semibold">{group.label}</legend>
    <div className="grid grid-cols-1 gap-x-6 gap-y-4 sm:grid-cols-2">{group.keys.map(key=>{
      const [k,label,type] = fieldMap.get(key as keyof ManagedPolicy)!;
      const update = (v:string) => onChange({...value,[k]:v,...(k==='expiryDate'?{renewed:false}:{})});
      const textValue=String(value[k]??'');
      return <div key={k} className="min-w-0"><label htmlFor={`${formId}-${k}`} className="block text-xs font-medium text-gray-500">
        {label}{(k==='productName'||requireApplicant&&k==='applicant')&&<span aria-hidden="true"> *</span>}
        </label>
        {k==='applicant'||k==='insured'?<select id={`${formId}-${k}`} required={requireApplicant&&k==='applicant'} className="input mt-1.5 font-normal text-gray-900" value={value[k==='applicant'?'applicantId':'insuredId']||''} onChange={e=>{
          const c=contacts.find(c=>c.id===e.target.value);
          onChange({...value,[k]:c?c.remarkName||c.nickname:value[k],[k==='applicant'?'applicantId':'insuredId']:c?.id});
        }}>
          <option value="">{textValue||'选择客户'}</option>
          {contacts.map(c=><option value={c.id} key={c.id}>{c.remarkName||c.nickname}{c.phoneNumber?` · 尾号${c.phoneNumber.slice(-4)}`:''}</option>)}
        </select>:k==='paymentFrequency'?<select id={`${formId}-${k}`} className="input mt-1.5 font-normal text-gray-900" value={textValue} onChange={e=>update(e.target.value)}>
          {['','期交-年','期交-半年','期交-季','期交-月','趸交',...(!['','期交-年','期交-半年','期交-季','期交-月','趸交'].includes(textValue)?[textValue]:[])].map(v=><option key={v} value={v}>{v||'待补充'}</option>)}
        </select>:<input id={`${formId}-${k}`} className="input mt-1.5 font-normal text-gray-900 read-only:bg-gray-50" type={type||'text'} required={k==='productName'}
          readOnly={identityReadonly&&['policyNumber','company'].includes(k)&&Boolean(value[k])}
          inputMode={k==='premium'||k==='coverage'?'decimal':undefined} value={textValue}
          placeholder={k==='paymentYears'?'例如：20年':k==='coveragePeriod'?'例如：终身、至80周岁':k==='premium'?'例如：12000':undefined}
          onChange={e=>update(e.target.value)}/>}
      </div>;
    })}</div>
  </fieldset>)}</div>;
}
