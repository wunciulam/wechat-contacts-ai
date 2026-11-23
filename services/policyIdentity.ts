// Match policy identity across exports without converting long numbers to Number.
export type PolicyIdentity={id?:string;policyNumber?:unknown;company?:string;effectiveDate?:string;applicant?:string;insured?:string;mingya?:{key?:string}};
export function readPolicyNumber(value:unknown):string {if(typeof value==='number'&&(!Number.isSafeInteger(value)||String(Math.abs(value)).length>15))throw new Error('长保单号被表格按数字保存，尾号可能已改变。请将保单号列设为文本后重新导出。');return String(value??'').trim();}
export const policyNumberKey=(value:unknown)=>String(value??'').trim().replace(/[^0-9A-Za-z]/g,'').toUpperCase().replace(/^0+(?=[0-9A-Z])/,'');
const clean=(value:unknown)=>String(value??'').replace(/[\s（）()]/g,'').toUpperCase();
const person=(value:unknown)=>String(value??'').replace(/\s/g,'').toLocaleLowerCase();
const insuredNames=(v:unknown)=>[...new Set(String(v||'').split(/[,，、;；]/).map(person).filter(Boolean))].sort();
const insuredCompatible=(a:PolicyIdentity,b:PolicyIdentity)=>{const x=insuredNames(a.insured),y=insuredNames(b.insured);return !x.length||!y.length||JSON.stringify(x)===JSON.stringify(y)||(Boolean(a.mingya?.key)&&y.every(n=>x.includes(n)))||(Boolean(b.mingya?.key)&&x.every(n=>y.includes(n)));};
export const policyCompanyKey=(value:unknown)=>clean(value);
export const policyTermKey=(value:unknown)=>{const m=String(value||'').match(/^(\d{4})[.\/-](\d{1,2})[.\/-](\d{1,2})/);return m?`${m[1]}-${m[2].padStart(2,'0')}-${m[3].padStart(2,'0')}`:'';};
export const policyBaseKey=(p:PolicyIdentity)=>policyNumberKey(p.policyNumber)&&clean(p.company)?`${clean(p.company)}|${policyNumberKey(p.policyNumber)}`:'';
export function findPolicyMatch<T extends PolicyIdentity>(p:PolicyIdentity,all:T[]):T|undefined {
 const direct=all.find(x=>p.id&&x.id===p.id)||all.find(x=>p.mingya?.key&&x.mingya?.key===p.mingya.key);if(direct)return direct;
 const base=policyBaseKey(p);if(!base)return;
 const candidates=all.filter(x=>policyBaseKey(x)===base&&!(p.mingya?.key&&x.mingya?.key&&p.mingya.key!==x.mingya.key)&&!(person(p.applicant)&&person(x.applicant)&&person(p.applicant)!==person(x.applicant))&&insuredCompatible(p,x));
 const term=policyTermKey(p.effectiveDate);const exact=term?candidates.filter(x=>policyTermKey(x.effectiveDate)===term):[];
 if(exact.length===1)return exact[0];if(exact.length>1)return;
 const terms=new Set(candidates.map(x=>policyTermKey(x.effectiveDate)).filter(Boolean));
 const compatible=candidates.filter(x=>!term||!policyTermKey(x.effectiveDate));
 return terms.size<=1&&compatible.length===1?compatible[0]:undefined;
}
