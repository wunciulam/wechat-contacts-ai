import Button from './ui/Button';
import React, {useEffect,useRef,useState} from 'react';
import type {Contact,Policy} from '../types';
import type {ManagedPolicy} from '../services/renewal';
import {key} from '../services/renewal';
import WorkspaceDialog,{WorkspaceDialogFooter} from './WorkspaceDialog';
import PolicyFieldsForm from './PolicyFieldsForm';
const blank = ():ManagedPolicy=>({id:'',productName:'',policyNumber:'',company:'',premium:'',effectiveDate:'',status:'正式保单',applicant:'',insured:'',payments:[]});
export default function ManualPolicyModal({isOpen,onClose,contacts,onSave,initialContactId}:{initialContactId?:string;isOpen:boolean;onClose:()=>void;contacts:Contact[];onSave:(contactId:string,policy:Policy)=>void}) {
  const [draft,setDraft]=useState(blank);
  const [error,setError]=useState('');
  const baseline=useRef(JSON.stringify(blank()));
  useEffect(()=>{if(isOpen){const c=contacts.find(c=>c.id===initialContactId);const initial=c?{...blank(),applicantId:c.id,applicant:c.remarkName||c.nickname}:blank();baseline.current=JSON.stringify(initial);setDraft(initial);setError('');}},[isOpen,initialContactId]);
  if(!isOpen)return null;
  const dirty=Boolean(JSON.stringify(draft)!==baseline.current);
  const close=()=>{if(!dirty||window.confirm('资料尚未保存，确认放弃修改？'))onClose();};
  const save=()=>{
    if(!draft.applicantId||!draft.productName.trim())return;
    if(draft.premium.trim()&&(!Number.isFinite(Number(draft.premium))||Number(draft.premium)<0)){setError('单期保费应为不小于 0 的金额。');return;}
    if(draft.effectiveDate&&draft.expiryDate&&draft.expiryDate<draft.effectiveDate){setError('保障到期日不能早于生效日期。');return;}
    const policy={...draft,id:crypto.randomUUID(),productName:draft.productName.trim()};
    if(policy.policyNumber.trim()&&policy.company.trim()&&contacts.some(c=>(c.policies||[]).some(p=>key(p)===key(policy)))){setError('该公司与保单号已存在，请在保单详情中编辑。');return;}
    onSave(draft.applicantId,policy);onClose();
  };
  return <WorkspaceDialog title="录入新保单" size="import" onClose={close}>
    <div className="space-y-6">
      {error&&<p role="alert" className="text-sm text-danger-600">{error}</p>}
      <PolicyFieldsForm value={draft} onChange={p=>{setDraft(!p.insured&&p.applicantId?{...p,insured:p.applicant,insuredId:p.applicantId}:p);setError('');}} contacts={contacts} requireApplicant/>
    </div>
    <WorkspaceDialogFooter>
      <Button className="" onClick={close} variant="secondary">取消</Button>
      <Button className="" disabled={!draft.applicantId||!draft.productName.trim()} onClick={save} variant="primary" validate>保存保单</Button>
    </WorkspaceDialogFooter>
  </WorkspaceDialog>;
}
