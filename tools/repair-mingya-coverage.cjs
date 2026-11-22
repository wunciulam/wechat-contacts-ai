// Fill only verified empty coverage fields; preserve all other customer and payment data.
const fs=require('node:fs'),vm=require('node:vm'),ts=require('typescript'),assert=require('node:assert/strict');
const cache={};function load(name){const f=name.endsWith('.ts')?name:name+'.ts';if(cache[f])return cache[f];const exp={};cache[f]=exp;const js=ts.transpileModule(fs.readFileSync('services/'+f,'utf8'),{compilerOptions:{module:ts.ModuleKind.CommonJS,target:ts.ScriptTarget.ES2022}}).outputText;vm.runInNewContext(js,{exports:exp,structuredClone,crypto:require('node:crypto').webcrypto,require:p=>load(p.replace(/^\.\//,''))});return exp;}
(async()=>{
 const {loadEnv}=await import('vite');const{createClient}=await import('@supabase/supabase-js');const env=loadEnv('production',process.cwd(),'VITE_');
 const config=fs.readFileSync('vite.config.ts','utf8');const url=env.VITE_SUPABASE_URL||'https://ulgqiixqaxxgodyowrep.supabase.co';if(new URL(url).hostname!=='ulgqiixqaxxgodyowrep.supabase.co')throw Error('Wrong database');
 const client=createClient(url,env.VITE_SUPABASE_ANON_KEY||config.match(/env\.VITE_SUPABASE_ANON_KEY \|\| '([^']+)'/)[1],{auth:{persistSession:false}});
 const appId=env.VITE_APP_ID;if(appId!=='app_yp9dq7mofjm')throw Error('Wrong app');
 const {data:rows,error}=await client.from('app_data').select('id,app_id,data_type,data,updated_at').eq('app_id',appId).in('data_type',['contacts','renewal_v1']);if(error)throw error;
 const dir='/Users/apple/.codex/backups/insurance-20261122-coverage';fs.mkdirSync(dir,{recursive:true,mode:0o700});const backup=dir+'/before-'+Date.now()+'.json';fs.writeFileSync(backup,JSON.stringify(rows),{mode:0o600});
 const payload=JSON.parse(fs.readFileSync('/Users/apple/.codex/backups/insurance-20261121-premium-fix/capture.json','utf8'));
 const captureId='bf1ef8c554af281a6e6f40dfa5f0ec2b53e1b139d1ce56268927bb28c10ae608';
 const lookup=new Map(load('mingyaImport').normalizeMingya(payload).items.map(x=>[x.key,x.policy]));
 const fields=['coveragePeriod','expiryDate','insuranceType'];const counts=Object.fromEntries(fields.map(f=>[f,0]));const strip=p=>{const out=structuredClone(p);for(const f of fields){delete out[f];if(out.mingya)delete out.mingya[f];}return out;};
 function patch(p){const incoming=lookup.get(p.mingya?.key);if(p.mingya?.captureId!==captureId||!incoming||incoming.policyNumber!==p.policyNumber)return p;const out=structuredClone(p);for(const f of fields){if(!String(out[f]??'').trim()&&incoming[f]){out[f]=incoming[f];counts[f]++;}out.mingya[f]=incoming.mingya[f];}assert.deepEqual(strip(p),strip(out));return out;}
 const c=rows.find(x=>x.data_type==='contacts'),r=rows.find(x=>x.data_type==='renewal_v1');const contacts=c.data.map(c=>({...c,policies:(c.policies||[]).map(patch)}));const renewal={...r.data,policies:r.data.policies.map(patch)};
 assert.equal(contacts.length,c.data.length);assert.equal(renewal.policies.length,r.data.policies.length);
 const target=renewal.policies.find(p=>p.productName==='国寿瑞鑫两全保险（分红型）'&&p.effectiveDate==='2009-05-19');
 fs.writeFileSync(dir+'/plan.json',JSON.stringify({contacts,renewal}),{mode:0o600});console.log(JSON.stringify({counts,contacts:contacts.length,policies:renewal.policies.length,target:target&&Object.fromEntries(fields.map(f=>[f,target[f]])),backup}));
 if(process.argv.includes('--apply')){const {error}=await client.rpc('commit_mingya_import_v2',{p_app_id:appId,p_contact_id:c.id,p_contact_revision:c.updated_at,p_renewal_revision:r.updated_at,p_contacts:contacts,p_renewal:renewal});if(error)throw error;console.log('Coverage fields saved atomically.');}
})().catch(e=>{console.error(e.message);process.exitCode=1;});
