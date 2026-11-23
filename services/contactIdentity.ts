import type {Contact} from '../types';
export const contactNameKey=(value:string|undefined)=>String(value||'').replace(/[\s\u3000]+/g,'').toLocaleLowerCase();
export const contactKey=(c:Pick<Contact,'remarkName'|'nickname'>)=>contactNameKey(c.remarkName?.trim()||c.nickname);
export const categoryIds=(c:Pick<Contact,'categoryId'> & {categoryIds?:string[]})=>[...new Set(c.categoryIds??(c.categoryId?[c.categoryId]:[]))].filter(Boolean);
export const boardCardId=(contactId:string,category:string)=>JSON.stringify(['contact',contactId,category]);
export function parseBoardCardId(id:string):{contactId:string;category:string}|undefined {try{const p=JSON.parse(id);if(p[0]==='contact'&&p.length===3)return{contactId:p[1],category:p[2]};}catch{}return undefined;}
