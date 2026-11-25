import test from 'node:test';
import assert from 'node:assert/strict';
import {mergeCustomerProfile} from '../services/customerProfileMutation.ts';
const base:any={id:'customer',remarkName:'示例客户',tags:['家庭'],policies:[],progressHistory:[{id:'old',content:'原记录'}],followupAnalysis:{stage:'需求确认'}};
test('inline profile save preserves concurrently added history, policies and analysis',()=>{
 const live={...structuredClone(base),policies:[{id:'new-policy'}],progressHistory:[...base.progressHistory,{id:'new'}],followupAnalysis:{stage:'方案确认'}};
 const saved=mergeCustomerProfile(live,{...base,address:'修改地址'},base);assert.equal(saved.address,'修改地址');assert.deepEqual(saved.policies,live.policies);assert.deepEqual(saved.progressHistory,live.progressHistory);assert.deepEqual(saved.followupAnalysis,live.followupAnalysis);
});
test('concurrent profile changes conflict, safe retries remain idempotent',()=>{
 assert.throws(()=>mergeCustomerProfile({...base,address:'另一页面'}, {...base,address:'新地址'},base),/另一页面修改/);
 const same=mergeCustomerProfile({...base,address:'新地址'},{...base,address:'新地址'},base);assert.equal(same.address,'新地址');assert.throws(()=>mergeCustomerProfile(undefined,base,base),/已删除/);
});
