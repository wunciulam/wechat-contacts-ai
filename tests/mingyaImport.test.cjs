const {test}=require('node:test');const assert=require('node:assert/strict');const fs=require('node:fs');const vm=require('node:vm');const ts=require('typescript');const crypto=require('node:crypto').webcrypto;
const exportsObject={};vm.runInNewContext(ts.transpileModule(fs.readFileSync('services/mingyaImport.ts','utf8'),{compilerOptions:{module:ts.ModuleKind.CommonJS,target:ts.ScriptTarget.ES2022}}).outputText,{exports:exportsObject,crypto,structuredClone,console});
const {planMingyaImport,parseMingyaPayload}=exportsObject;
const contact=(extra={})=>({id:'c1',wxid:'wechat',nickname:'客户甲',remarkName:'客户甲',remarkInfo:'手动备注',tags:['重点'],addedAt:1,dealProducts:[],intentProducts:['养老'],progressHistory:[{id:'h',date:'2026-01-01',content:'保留跟进'}],policies:[],...extra});
const record=(extra={})=>({list:{},detail:{policyIndexId:'m1',policyCode:'000001',insComName:'公司甲',productName:'产品',totalFee:0,effectDate:'2026-01-01',policyState:'16',appntName:'客户甲',appnt:{name:'客户甲',cardNo:'ID001',mobile:'13800000000'},insureds:[],beneficiaries:[],riskList:[],...extra}});
const payload=(records)=>({version:1,status:{complete:true,finishedAt:'2026-11-21'},records});
test('adds by applicant and repeated imports do not duplicate or alter follow-up data',()=>{
 const source=payload([record()]);const first=planMingyaImport([],source);assert.equal(first.addedPolicies,1);assert.equal(first.contacts[0].policies[0].premium,'0');const second=planMingyaImport(first.contacts,source);assert.equal(second.addedPolicies,0);assert.equal(second.updatedPolicies,0);assert.equal(second.unchangedPolicies,1);assert.equal(second.contacts.length,1);
});
test('same name alone requires confirmation; explicit selection merges and preserves manual info',()=>{
 const original=[contact()];const p=payload([record()]);const plan=planMingyaImport(original,p);assert.equal(plan.issues.length,1);assert.equal(plan.addedPolicies,0);
 const accepted=planMingyaImport(original,p,{[plan.issues[0].key]:'c1'});assert.equal(accepted.addedContacts,0);assert.equal(accepted.addedPolicies,1);assert.equal(accepted.contacts[0].wxid,'wechat');assert.equal(accepted.contacts[0].remarkInfo,'手动备注');assert.equal(accepted.contacts[0].progressHistory[0].content,'保留跟进');assert.equal(original[0].policies.length,0);
});
test('shared phone does not merge different people; conflicting identity does not merge same name',()=>{
 const p=payload([record()]);const plan=planMingyaImport([contact({nickname:'客户乙',remarkName:'客户乙',phoneNumber:'13800000000',idCard:'OTHER'})],p);assert.equal(plan.addedContacts,1);
 const sameName=planMingyaImport([contact({phoneNumber:'13800000000',idCard:'OTHER'})],p);assert.equal(sameName.issues.length,1);const forced=planMingyaImport([contact({phoneNumber:'13800000000',idCard:'OTHER'})],p,{[sameName.issues[0].key]:'c1'});assert.equal(forced.issues.length,1);
});
test('matching policy anchors other policies of the same verified person, independent of row order',()=>{
 const old={id:'old-id',policyNumber:'000001',company:'公司甲',productName:'旧产品',premium:'50',effectiveDate:'',status:'有效',applicant:'客户甲',insured:'客户甲'};
 const p=payload([record({policyIndexId:'m2',policyCode:'000002'}),record()]);const result=planMingyaImport([contact({policies:[old]})],p);assert.equal(result.issues.length,0);assert.equal(result.addedContacts,0);assert.equal(result.addedPolicies,1);assert.equal(result.updatedPolicies,1);assert.equal(result.contacts[0].policies[0].id,'old-id');assert.equal(result.contacts[0].policies[0].premium,'50');
 const authoritative=planMingyaImport([contact({policies:[old]})],p,{},'source');assert.equal(authoritative.contacts[0].policies[0].premium,'0');assert.equal(authoritative.contacts[0].policies[0].productName,'产品');assert.ok(result.fieldConflicts>0);
});
test('global duplicate policies and insurer mismatches never silently add',()=>{
 const old={id:'old-id',policyNumber:'000001',company:'公司甲',productName:'产品'};const a=contact({policies:[old]}),b=contact({id:'c2',policies:[{...old,id:'old2'}]});
 const result=planMingyaImport([a,b],payload([record()]));assert.equal(result.issues.length,1);assert.equal(result.addedPolicies,0);
 const other=planMingyaImport([contact({policies:[{...old,company:'公司乙'}]})],payload([record()]));assert.equal(other.issues.length,1);assert.equal(other.addedPolicies,0);
});
test('input duplicates are collapsed, unknown states stay explicit, encrypted summary values are not imported as IDs',()=>{
 const r=record({policyState:'23',appnt:{name:'客户甲',cardNo:'0000123',mobile:'012345'},appntCardNo:'MY_*encrypted'});const result=planMingyaImport([],payload([r,r]));assert.equal(result.duplicateRows,1);assert.equal(result.addedPolicies,1);assert.equal(result.contacts[0].idCard,'0000123');assert.equal(result.contacts[0].policies[0].status,'明亚状态（23）');
 assert.throws(()=>parseMingyaPayload({records:[]}));
});
test('renewal terms sharing a policy number remain separate; repeat import stays idempotent',()=>{
 const p=payload([record({policyIndexId:'term2026',effectDate:'2026-01-01'}),record({policyIndexId:'term2025',effectDate:'2025-01-01',policyState:'17'})]);
 const first=planMingyaImport([],p);assert.equal(first.addedContacts,1);assert.equal(first.addedPolicies,2);assert.equal(first.duplicateRows,0);
 const again=planMingyaImport(first.contacts,p);assert.equal(again.addedPolicies,0);assert.equal(again.unchangedPolicies,2);
});
test('uses website effective date instead of underwriting date; JSON key order does not change data comparison',()=>{
 const p=payload([record({effectDate:'2026-11-02 00:00:00',validDate:'2026-11-06 00:00:00'})]);const result=planMingyaImport([],p);assert.equal(result.contacts[0].policies[0].effectiveDate,'2026-11-06');
 assert.equal(exportsObject.canonicalContactData([{id:'1',tags:['a']}]),exportsObject.canonicalContactData([{tags:['a'],id:'1'}]));
});
