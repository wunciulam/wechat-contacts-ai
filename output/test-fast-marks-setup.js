async (page) => {
 const payment={date:'2026-11-18',amount:'12000',status:'未缴费'};
 const policies=Array.from({length:702},(_,i)=>({id:'p'+i,policyNumber:'SAMPLE-'+i,productName:'测试保单'+i,applicant:'示例客户',insured:'示例客户',applicantId:'c1',insuredId:'c1',company:'示例公司',status:'正式保单',premium:'12000',effectiveDate:'2025-11-18',paymentFrequency:'期交-年',paymentYears:'10年',payments:[{...payment}]}));
 const s={contacts:[{id:'c1',remarkName:'示例客户',nickname:'示例客户',wxid:'',remarkInfo:'测试',tags:['成交客户'],addedAt:1,dealProducts:[],intentProducts:[],policies}],renewal:{policies,settings:{email:'',enabled:false,time:'09:00'},imports:[]},requests:[],delay:1500,fail:false};
 page._marks=s;
 await page.route('**/api/renewal-email',r=>r.fulfill({json:{configured:false}}));
 await page.route(/https:\/\/.*\.supabase\.co\/rest\/v1\//,async route=>{
  const req=route.request(),url=new URL(req.url());
  if(req.method()==='GET'){
   const type=url.searchParams.get('data_type')?.replace('eq.','');
   return route.fulfill({json:{id:'test',data:type==='contacts'?s.contacts:type==='renewal_v1'?s.renewal:[]}});
  }
  s.requests.push({url:url.pathname,method:req.method(),bytes:Buffer.byteLength(req.postData()||'')});
  if(url.pathname.endsWith('/rpc/mark_policy_installment_v1')){
   await new Promise(r=>setTimeout(r,s.delay));
   if(s.fail)return route.fulfill({status:409,json:{message:'这期缴费记录已变化，请刷新后重试',code:'PT409'}});
   const b=req.postDataJSON(),p=s.renewal.policies.find(x=>x.id===b.p_policy_id);
   let q=p.payments.find(x=>x.date===b.p_date); if(!q){q={...b.p_seed};p.payments.push(q);}
   if(b.p_kind==='contact')q.contactedAt=new Date().toISOString();else {q.status=b.p_target;q.confirmedAt=new Date().toISOString();q.paidAt='2026-11-21';}
   return route.fulfill({json:{payments:p.payments,renewed:false}});
  }
  return route.fulfill({status:200,json:[]});
 });
 await page.goto('http://127.0.0.1:3012/');
 await page.getByRole('button',{name:'保单管理',exact:false}).click();
 await page.getByRole('button',{name:/续期提醒/}).click();
 return {body:(await page.locator('body').innerText()).slice(0,1800),requests:s.requests};
}
