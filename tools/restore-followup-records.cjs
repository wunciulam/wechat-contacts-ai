const fs=require('node:fs');
(async()=>{
 const{loadEnv}=await import('vite'),{createClient}=await import('@supabase/supabase-js');const env=loadEnv('production',process.cwd(),'VITE_');
 const url=env.VITE_SUPABASE_URL||'https://ulgqiixqaxxgodyowrep.supabase.co';if(new URL(url).hostname!=='ulgqiixqaxxgodyowrep.supabase.co'||env.VITE_APP_ID!=='app_yp9dq7mofjm')throw Error('Wrong target');
 const key=env.VITE_SUPABASE_ANON_KEY||fs.readFileSync('vite.config.ts','utf8').match(/env\.VITE_SUPABASE_ANON_KEY \|\| '([^']+)'/)[1];const client=createClient(url,key,{auth:{persistSession:false}});
 const{data:row,error}=await client.from('app_data').select('*').eq('app_id',env.VITE_APP_ID).eq('data_type','contacts').single();if(error)throw error;
 const dir='/Users/apple/.codex/backups/insurance-20261122-followup-recovery';fs.mkdirSync(dir,{recursive:true,mode:0o700});fs.writeFileSync(dir+'/before-'+Date.now()+'.json',JSON.stringify(row),{mode:0o600});
 const oldRows=JSON.parse(fs.readFileSync('/Users/apple/.codex/backups/insurance-20261122-coverage/before-1795314201345.json','utf8'));const old=oldRows.find(x=>x.data_type==='contacts').data;
 const missing=old.flatMap(c=>{const current=row.data.find(x=>x.id===c.id);return current?(c.progressHistory||[]).filter(r=>!(current.progressHistory||[]).some(x=>x.id===r.id)&&!(current.progressDeletedIds||[]).includes(r.id)).map(record=>({contactId:c.id,record})):[];});
 if(missing.some(x=>x.record.date!=='2026-11-21'))throw Error('Unexpected recovery date');
 fs.writeFileSync(dir+'/missing.json',JSON.stringify(missing),{mode:0o600});console.log(JSON.stringify({recoverable:missing.length,beforeRecords:row.data.reduce((n,c)=>n+(c.progressHistory||[]).length,0)}));
 if(!process.argv.includes('--apply'))return;
 for(const m of missing){const{error}=await client.rpc('save_followup_v1',{p_app_id:env.VITE_APP_ID,p_contact_id:m.contactId,p_kind:'add',p_record:m.record});if(error)throw error;}
 console.log('Missing follow-ups restored individually; other data preserved.');
})().catch(e=>{console.error(e.message);process.exitCode=1;});
