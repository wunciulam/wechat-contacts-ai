import test from 'node:test';
import assert from 'node:assert/strict';
import {mergeCustomerProfile,applyProfileDraft} from '../services/customerProfileMutation.ts';
const base:any={id:'customer',remarkName:'示例客户',tags:['家庭'],policies:[],progressHistory:[{id:'old',content:'原记录'}],followupAnalysis:{stage:'需求确认'}};
test('inline profile save preserves concurrently added history, policies and analysis',()=>{
 const live={...structuredClone(base),policies:[{id:'new-policy'}],progressHistory:[...base.progressHistory,{id:'new'}],followupAnalysis:{stage:'方案确认'}};
 const saved=mergeCustomerProfile(live,{...base,address:'修改地址'},base);assert.equal(saved.address,'修改地址');assert.deepEqual(saved.policies,live.policies);assert.deepEqual(saved.progressHistory,live.progressHistory);assert.deepEqual(saved.followupAnalysis,live.followupAnalysis);
});
test('concurrent profile changes conflict, safe retries remain idempotent',()=>{
 assert.throws(()=>mergeCustomerProfile({...base,address:'另一页面'}, {...base,address:'新地址'},base),/另一页面修改/);
 const same=mergeCustomerProfile({...base,address:'新地址'},{...base,address:'新地址'},base);assert.equal(same.address,'新地址');assert.throws(()=>mergeCustomerProfile(undefined,base,base),/已删除/);
});

test('autosave only applies profile fields from a stale draft across sequential saves',()=>{
 const latest:any={...base,address:'first',policies:[{id:'new-policy'}],progressHistory:[{id:'latest'}],followupAnalysis:{stage:'方案比较'},followUpStatus:'idle'};
 const stale:any={...base,address:'second',phoneNumber:'13800000000'};
 const next=applyProfileDraft(latest,stale);assert.equal(next.address,'second');assert.deepEqual(next.policies,latest.policies);assert.deepEqual(next.progressHistory,latest.progressHistory);assert.deepEqual(next.followupAnalysis,latest.followupAnalysis);assert.equal(next.followUpStatus,'idle');
});
