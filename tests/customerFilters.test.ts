import test from 'node:test';
import assert from 'node:assert/strict';
import {matchesCustomerFilters} from '../services/customerFilters.ts';
test('tag and customer categories intersect; multiple choices within each group match any, including uncategorized and legacy links',()=>{
 const cats:any=[{id:'a'},{id:'b'}],c:any={tags:['x','y'],categoryId:'a'};
 assert.equal(matchesCustomerFilters(c,new Set(['y','z']),new Set(['a','b']),cats),true);
 assert.equal(matchesCustomerFilters(c,new Set(['z']),new Set(['a']),cats),false);
 assert.equal(matchesCustomerFilters(c,new Set(['x']),new Set(['b']),cats),false);
 assert.equal(matchesCustomerFilters({...c,categoryIds:['b']},new Set(['x']),new Set(['a']),cats),false);
 assert.equal(matchesCustomerFilters({...c,categoryIds:['deleted']},new Set(),new Set(["a"]),cats),false);
 assert.equal(matchesCustomerFilters({...c,categoryIds:[]},new Set(),new Set(["a"]),cats),false);
});
