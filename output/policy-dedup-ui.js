async(page)=>{await page.unrouteAll({behavior:"wait"});
 const base={company:'示例公司',productName:'示例产品',applicant:'示例客户',insured:'示例客户',status:'正式保单',effectiveDate:'2024-08-26',paymentFrequency:'期交-年',paymentYears:'10年',payments:[],applicantId:'c1'};
 const policies=[{...base,id:'j1',policyNumber:'537037199',premium:'20000'},{...base,id:'j2',policyNumber:'000000537037199',premium:'20000',mingya:{key:'index:j',mappingVersion:2,capturedAt:'2026-11-21',nextPayDate:'2027-08-26',nextPremium:'20000',nextPremiumIsReference:true}},{...base,id:'a1',policyNumber:'10490006601088366512',premium:'242'},{...base,id:'a2',policyNumber:'10490006601088366512',premium:'242',mingya:{key:'index:a',mappingVersion:2,capturedAt:'2026-11-21'}},{...base,id:'r',policyNumber:'R1',premium:'10464'},{...base,id:'t',policyNumber:'T1',premium:'12000'}];
 const c={id:'c1',remarkName:'示例客户',nickname:'示例客户',wxid:'',remarkInfo:'保留备注',tags:['成交客户'],addedAt:1,dealProducts:[],intentProducts:[],policies,followUpStatus:'following',progressHistory:[{id:'r0',date:'2026-11-20',content:'原有记录',completed:false}]};
 const s={contacts:[c],renewal:{policies,settings:{email:'',time:'09:00',enabled:false},imports:[]},fail:false,profileFail:false,delay:600,requests:[]};page._follow=s;
 await page.route('**/api/renewal-email',r=>r.fulfill({json:{configured:false}}));
 await page.route(/https:\/\/.*\.supabase\.co\/rest\/v1\//,async route=>{
  const req=route.request(),u=new URL(req.url()),type=u.searchParams.get('data_type')||'';
  const row=(data_type,data)=>({id:'test',app_id:'app_yp9dq7mofjm',data_type,data,updated_at:'2026-11-22T01:00:00Z'});
  if(req.method()==='GET')return route.fulfill({json:type.startsWith('in.')?[row('contacts',s.contacts),row('renewal_v1',s.renewal)]:type==='eq.contacts'?row('contacts',s.contacts):type==='eq.renewal_v1'?row('renewal_v1',s.renewal):row('categories',[])});
  s.requests.push({path:u.pathname,bytes:Buffer.byteLength(req.postData()||'')});const b=req.postDataJSON();
  if(u.pathname.endsWith('/rpc/delete_selected_policies_v1')){
   await new Promise(r=>setTimeout(r,500));s.deletes ||= [];s.deletes.push(b);
   if(s.fail)return route.fulfill({status:500,json:{message:'测试删除失败，请重试。'}});
   const ids=b.p_policy_ids;s.renewal.policies=s.renewal.policies.filter(p=>!ids.includes(p.id));s.contacts=s.contacts.map(c=>({...c,policies:c.policies.filter(p=>!ids.includes(p.id))}));return route.fulfill({json:{deletedIds:ids}});
  }
  if(u.pathname.endsWith('/rpc/save_followup_v1')){
   await new Promise(r=>setTimeout(r,s.delay));if(s.fail)return route.fulfill({status:500,json:{message:'测试保存失败，输入已保留'}});
   let c=s.contacts.find(c=>c.id===b.p_contact_id);if(!c){c={...b.p_new_contact,progressHistory:[]};s.contacts.push(c);}
   const record={...b.p_record,updatedAt:'2026-11-22T04:00:00.000Z'};
   if(b.p_kind==='delete')c.progressHistory=c.progressHistory.filter(r=>r.id!==record.id);
   else if(b.p_kind==='edit')c.progressHistory=c.progressHistory.map(r=>r.id===record.id?record:r);
   else if(!c.progressHistory.some(r=>r.id===record.id))c.progressHistory.unshift(record);
   c.lastDate=record.date;c.followUpStatus='following';return route.fulfill({json:c});
  }
  if(u.pathname.endsWith('/rpc/save_customer_profile_v1')){
   if(s.profileFail)return route.fulfill({status:409,json:{message:'客户资料已在另一页面修改，请刷新后重试'}});
   let index=s.contacts.findIndex(c=>c.id===b.p_contact.id);const before=s.contacts[index];const c=before?{...b.p_contact,progressHistory:before.progressHistory}:b.p_contact;
   if(index<0)s.contacts.push(c);else s.contacts[index]=c;return route.fulfill({json:c});
  }
  if(req.method()==='PATCH'&&type==='eq.contacts')s.contacts=b.data;
  if(req.method()==='POST'&&Array.isArray(b))return route.fulfill({json:b.filter(x=>['contacts','renewal_v1'].includes(x.data_type)).map(x=>({data_type:x.data_type,data:x.data}))});
  return route.fulfill({json:[]});
 });
 await page.setViewportSize({width:1304,height:880});await page.goto('http://127.0.0.1:3018/');await page.getByRole('button',{name:/保单管理/}).click();await page.getByText('示例客户',{exact:true}).first().click();const rows=await page.locator('tbody tr').count();if(rows!==4)throw Error('aliases resurrected '+rows);await page.getByText('¥ 42,706.00',{exact:true}).waitFor();await page.getByRole('button',{name:'修改标签',exact:true}).click();const summary=page.locator('[data-contact-policy-table]');await summary.locator('tbody tr').nth(3).waitFor();if(await summary.locator('tbody tr').count()!==4)throw Error('summary duplicate');await page.screenshot({animations:'disabled',path:'/Users/apple/Downloads/AI PROGRAM/insurance-mingya-detail-fix/output/policy-dedup-desktop.png'});return {rawPolicies:s.renewal.policies.length,visiblePolicies:rows,summaryRows:4,premiumTotal:42706};
}
