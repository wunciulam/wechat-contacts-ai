import test from 'node:test';
import assert from 'node:assert/strict';
import {excludedPolicyImport} from '../services/policyImportRules.ts';
test('terminal display uses the same rules as import, including legacy suffixes and codes',()=>{for(const s of ['终止保单','终止保单-满期终止','撤单','已撤单','撤单保单','17',22])assert.equal(excludedPolicyImport(s),true,String(s));});
test('suspension, in-progress cancellation and unknown status stay visible',()=>{for(const s of ['正式保单','中止保单','撤单中','撤单失败','明亚状态（23）','',undefined,'18','21'])assert.equal(excludedPolicyImport(s),false,String(s));});
