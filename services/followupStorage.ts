import {supabase} from './supabaseService';
import type {Contact,ProgressRecord} from '../types';
export async function saveFollowup(contactId:string,kind:'add'|'edit'|'delete',record:ProgressRecord,expected?:ProgressRecord,newContact?:Contact):Promise<Contact> {
  const appId=import.meta.env.VITE_APP_ID;
  if(!appId)throw new Error('缺少固定数据标识');
  const controller=new AbortController();const timeout=setTimeout(()=>controller.abort(),15000);
  try {
    const {data,error}=await supabase.rpc('save_followup_v1',{p_app_id:appId,p_contact_id:contactId,p_kind:kind,p_record:record,p_expected:expected||null,p_new_contact:newContact||null}).abortSignal(controller.signal);
    if(error)throw new Error(error.message||'跟进记录未保存，请重试。');
    if(!data?.id)throw new Error('未收到数据库保存确认，请核对后重试。');
    return data;
  }catch(e){if(controller.signal.aborted)throw new Error('保存超时，输入已保留，可重试。');throw e;}
  finally{clearTimeout(timeout);}
}

export async function saveCustomerProfile(contact:Contact,expected?:Contact):Promise<Contact>{
 const controller=new AbortController();const timeout=setTimeout(()=>controller.abort(),15000);
 try {
  const {data,error}=await supabase.rpc('save_customer_profile_v1',{p_app_id:import.meta.env.VITE_APP_ID,p_contact:contact,p_expected:expected||null}).abortSignal(controller.signal);
  if(error)throw new Error(error.message||'客户资料未保存，请重试。');
  if(!data?.id)throw new Error('未收到数据库保存确认，请核对后重试。');
  return data;
 }catch(e){if(controller.signal.aborted)throw new Error('保存超时，输入已保留，请核对后重试。');throw e;}
 finally{clearTimeout(timeout);}
}
