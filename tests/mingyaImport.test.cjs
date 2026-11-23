const {test}=require('node:test');const assert=require('node:assert/strict');const fs=require('node:fs');const vm=require('node:vm');const ts=require('typescript');const crypto=require('node:crypto').webcrypto;
const moduleCache={};function localRequire(name){name=name.replace(/\.ts$/,'');if(moduleCache[name])return moduleCache[name];if(!['./mingyaFinancial','./mingyaPayments','./mingyaImport','./mingyaRepair','./policyImportRules','./policyIdentity'].includes(name))throw Error(name);const exp={};moduleCache[name]=exp;vm.runInNewContext(ts.transpileModule(fs.readFileSync('services/'+name.slice(2)+'.ts','utf8'),{compilerOptions:{module:ts.ModuleKind.CommonJS,target:ts.ScriptTarget.ES2022}}).outputText,{exports:exp,require:localRequire,structuredClone});return exp;}
const exportsObject={};vm.runInNewContext(ts.transpileModule(fs.readFileSync('services/mingyaImport.ts','utf8'),{compilerOptions:{module:ts.ModuleKind.CommonJS,target:ts.ScriptTarget.ES2022}}).outputText,{exports:exportsObject,crypto,structuredClone,console,require:localRequire});
const {planMingyaImport,parseMingyaPayload}=exportsObject;
const contact=(extra={})=>({id:'c1',wxid:'wechat',nickname:'客户甲',remarkName:'客户甲',remarkInfo:'手动备注',tags:['重点'],addedAt:1,dealProducts:[],intentProducts:['养老'],progressHistory:[{id:'h',date:'2026-01-01',content:'保留跟进'}],policies:[],...extra});
const record=(extra={})=>({list:{},detail:{policyIndexId:'m1',policyCode:'000001',insComName:'公司甲',productName:'产品',fee:0,totalFee:0,effectDate:'2026-01-01',policyState:'16',appntName:'客户甲',appnt:{name:'客户甲',cardNo:'ID001',mobile:'13800000000'},insureds:[],beneficiaries:[],riskList:[],...extra}});
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
 const p=payload([record({policyIndexId:'term2026',effectDate:'2026-01-01'}),record({policyIndexId:'term2025',effectDate:'2025-01-01',policyState:'16'})]);
 const first=planMingyaImport([],p);assert.equal(first.addedContacts,1);assert.equal(first.addedPolicies,2);assert.equal(first.duplicateRows,0);
 const again=planMingyaImport(first.contacts,p);assert.equal(again.addedPolicies,0);assert.equal(again.unchangedPolicies,2);
});
test('uses website effective date instead of underwriting date; JSON key order does not change data comparison',()=>{
 const p=payload([record({effectDate:'2026-11-02 00:00:00',validDate:'2026-11-06 00:00:00'})]);const result=planMingyaImport([],p);assert.equal(result.contacts[0].policies[0].effectiveDate,'2026-11-06');
 assert.equal(exportsObject.canonicalContactData([{id:'1',tags:['a']}]),exportsObject.canonicalContactData([{tags:['a'],id:'1'}]));
});
test('repairs the known v1 cumulative-premium bug while preserving an unrelated manual premium',()=>{
 const r=record({fee:12000,totalFee:120000,nextPayDate:'2027-11-18',nextPrem:12000});const p=payload([r]);
 const old={id:'old',policyNumber:'000001',company:'公司甲',productName:'产品',premium:'120000',effectiveDate:'2026-01-01',status:'正式保单',applicant:'客户甲',insured:'客户甲',mingya:{key:'index:m1',captureId:'original'}};
 const fixed=planMingyaImport([contact({policies:[old]})],p);assert.equal(fixed.contacts[0].policies[0].premium,'12000');
 const manual=planMingyaImport([contact({policies:[{...old,premium:'777'}]})],p);assert.equal(manual.contacts[0].policies[0].premium,'777');
});
test('future detail captures update source-owned premium without undoing a user edit',()=>{
 const first=planMingyaImport([],payload([record({fee:100,totalFee:1000})]));
 const refresh=planMingyaImport(first.contacts,payload([record({fee:120,totalFee:1200})]));assert.equal(refresh.contacts[0].policies[0].premium,'120');
 first.contacts[0].policies[0].premium='90';const manual=planMingyaImport(first.contacts,payload([record({fee:120,totalFee:1200})]));assert.equal(manual.contacts[0].policies[0].premium,'90');
});
test('data repair changes only source-linked financial data in both stores, and is idempotent',()=>{
 const fix=localRequire('./mingyaRepair').repairCapturedPolicies;
 const old={id:'old',policyNumber:'000001',company:'公司甲',productName:'产品',premium:'120000',effectiveDate:'2025-11-18',paymentFrequency:'期交-年',status:'正式保单',applicant:'客户甲',insured:'客户甲',payments:[{date:'2026-11-18',amount:'12000',status:'未缴费'}],mingya:{key:'index:m1',captureId:'original'}};
 const customers=[contact({policies:[old]})];const renewal={policies:[old],imports:[{at:'keep'}],settings:{enabled:false}};
 const source=payload([record({fee:12000,totalFee:120000,validDate:'2025-11-18',nextPayDate:'2027-11-18',nextPrem:12000,nextContent:'应缴金额未产生',riskList:[{prem:12000,lastPrem:12000,lastPayDate:'2026-11-18',payType:'Y',state:'01'}]})]);
 const result=fix(customers,renewal,source,'original');assert.equal(result.contacts[0].policies[0].premium,'12000');assert.equal(result.renewal.policies[0].payments[0].status,'已缴费');assert.equal(result.contacts[0].wxid,customers[0].wxid);assert.equal(result.contacts[0].remarkInfo,customers[0].remarkInfo);assert.equal(JSON.stringify(result.renewal.imports),JSON.stringify(renewal.imports));assert.equal(customers[0].policies[0].premium,'120000');
 const repeat=fix(result.contacts,result.renewal,source,'original');assert.equal(repeat.counts.metadata,0);assert.equal(exportsObject.canonicalContactData(repeat.contacts),exportsObject.canonicalContactData(result.contacts));
});
test('trusteeship coverage comes from main risk, not payment period, and fills existing blanks',()=>{
 const r=record({dataSource:'trusteeship',validDate:'2009-05-19',guaranteeEndDate:'2073-05-18',insurancePeriod:'',insurancePeriodUnit:'A',riskList:[{mainRiskFlag:'01',insurancePeriod:80,insurancePeriodUnit:'A',payPeriod:15,payPeriodUnit:'Y',risk:{riskFlag:'两全'}},{mainRiskFlag:'02',insurancePeriod:80,insurancePeriodUnit:'A',risk:{riskFlag:'重疾'}}]});
 const source=payload([r]);const first=planMingyaImport([],source);const p=first.contacts[0].policies[0];
 assert.equal(p.coveragePeriod,'至80周岁');assert.equal(p.expiryDate,'2073-05-18');assert.equal(p.insuranceType,'两全');assert.equal(p.paymentYears,'15年');
 delete p.coveragePeriod;delete p.expiryDate;delete p.insuranceType;const refreshed=planMingyaImport(first.contacts,source).contacts[0].policies[0];
 assert.equal(refreshed.coveragePeriod,'至80周岁');assert.equal(refreshed.expiryDate,'2073-05-18');assert.equal(refreshed.insuranceType,'两全');
 p.coveragePeriod='人工核对期间';assert.equal(planMingyaImport(first.contacts,source).contacts[0].policies[0].coveragePeriod,'人工核对期间');
});
test('coverage does not infer expiry from payment end or unknown risk codes',()=>{
 const p=planMingyaImport([],payload([record({payEndDate:'2023-05-19',riskList:[{mainRiskFlag:'01',payPeriod:15,payPeriodUnit:'Y',insurancePeriod:108,insurancePeriodUnit:'UNKNOWN',risk:{riskType:'01'}}]})])).contacts[0].policies[0];
 assert.equal(p.coveragePeriod,'');assert.equal(p.expiryDate,'');assert.equal(p.insuranceType,'');
});

test('filters ended and cancelled policies before customer matching, retaining the existing database',()=>{
 const r=record({policyState:'17'}),cancel=record({policyIndexId:'cancel',policyCode:'CANCEL',policyState:'22'});
 const old={id:'old',policyNumber:'000001',company:'公司甲',productName:'旧保单',premium:'90',status:'正式保单'};
 const before=contact({policies:[old]});const plan=planMingyaImport([before],payload([r,cancel]));
 assert.equal(plan.filteredPolicies,2);assert.equal(plan.issues.length,0);assert.equal(plan.addedContacts,0);assert.equal(plan.updatedContacts,0);assert.equal(plan.addedPolicies,0);assert.equal(JSON.stringify(plan.contacts),JSON.stringify([before]));
 const mixed=planMingyaImport([],payload([r,cancel,record({policyIndexId:'active',policyCode:'ACTIVE'})]));assert.equal(mixed.filteredPolicies,2);assert.equal(mixed.addedPolicies,1);assert.equal(mixed.contacts[0].policies[0].policyNumber,'ACTIVE');
});
test('does not confuse suspended or cancellation-in-progress with final cancellation',()=>{
 const plan=planMingyaImport([],payload([record({policyState:'18'}),record({policyIndexId:'pending',policyCode:'PENDING',policyState:'21'})]));assert.equal(plan.filteredPolicies,0);assert.equal(plan.addedPolicies,2);
});

test('same-name policy import cannot create an independent duplicate',()=>{const p=payload([record()]),original=[contact()];const pending=planMingyaImport(original,p);assert.equal(pending.issues[0].allowNew,false);const forced=planMingyaImport(original,p,{[pending.issues[0].key]:'new'});assert.equal(forced.contacts.length,1);assert.equal(forced.addedContacts,0);assert.equal(forced.issues.length,1);});
test('leading zero aliases merge into the existing ID and preserve the exact source number',()=>{const p=payload([record({policyCode:'000001'})]);const old={id:'legacy',policyNumber:'1',company:'公司甲',effectiveDate:'2026-01-01',productName:'产品',applicant:'客户甲',premium:'50'};const result=planMingyaImport([contact({policies:[old]})],p);assert.equal(result.addedPolicies,0);assert.equal(result.updatedPolicies,1);assert.equal(result.contacts[0].policies[0].id,'legacy');assert.equal(result.contacts[0].policies[0].policyNumber,'000001');});
test('numeric JSON with unsafe long policy number is rejected rather than silently rounded',()=>{assert.throws(()=>planMingyaImport([],payload([record({policyCode:10490006601088300000})])),/长保单号/);});
