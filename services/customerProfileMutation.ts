import type {Contact} from '../types';
// Match the production profile RPC: apply changed fields, preserve concurrent history/analysis/policy updates.
export function mergeCustomerProfile(current:Contact|undefined,input:Contact,expected?:Contact):Contact{
 if(!expected)return current?{...input,progressHistory:current.progressHistory}:input;
 if(!current)throw Error('客户已删除，请刷新后重试。');
 const result={...current};
 for(const [field,value]of Object.entries(input)){
  if(['id','progressHistory','progressDeletedIds'].includes(field))continue;
  const old=(expected as any)[field],now=(current as any)[field];
  if(JSON.stringify(value)===JSON.stringify(old))continue;
  if(JSON.stringify(now)!==JSON.stringify(old)&&JSON.stringify(now)!==JSON.stringify(value))throw Error('客户资料已在另一页面修改，请刷新后重试。');
  (result as any)[field]=value;
 }
 return result;
}

export function applyProfileDraft(base:Contact,draft:Partial<Contact>):Contact{
 const result={...base};
 for(const key of ['remarkName','nickname','wxid','phoneNumber','idCard','birthday','address','tags','remarkInfo','intentProducts','categoryId','categoryIds'] as const)if(Object.prototype.hasOwnProperty.call(draft,key))(result as any)[key]=draft[key];
 return result;
}
