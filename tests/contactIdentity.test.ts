import test from 'node:test';
import assert from 'node:assert/strict';
import {contactKey,contactNameKey,categoryIds,boardCardId,parseBoardCardId} from '../services/contactIdentity.ts';
test('names ignore whitespace and case and fall back to nickname',()=>{assert.equal(contactKey({remarkName:' 郭 子豪　',nickname:'other'}),contactNameKey('郭子豪'));assert.equal(contactKey({remarkName:' ',nickname:'SAM'}),'sam');});
test('explicit multiple memberships supersede the old category without duplication',()=>{assert.deepEqual(categoryIds({categoryId:'old',categoryIds:['a','b','a']}),['a','b']);assert.deepEqual(categoryIds({categoryId:'old'}),['old']);assert.deepEqual(categoryIds({categoryId:'old',categoryIds:[]}),[]);});
test('same contact has a different drag identifier in every column',()=>{assert.notEqual(boardCardId('c1','a'),boardCardId('c1','b'));assert.deepEqual(parseBoardCardId(boardCardId('a:[x]','b')),{contactId:'a:[x]',category:'b'});assert.equal(parseBoardCardId('category-a'),undefined);});
