async (page) => {
 const contacts=[1,2].map(i=>({id:'c'+i,remarkName:'示例客户',nickname:'示例客户',wxid:'',remarkInfo:'',tags:[],addedAt:1,dealProducts:[],intentProducts:[],policies:[],followUpStatus:'idle',progressHistory:[]}));
 const s={contacts,renewal:{policies:[],settings:{email:'',time:'09:00',enabled:false},imports:[]},writes:0,fail:false};page._design=s;
 await page.route('**/api/renewal-email',r=>r.fulfill({json:{configured:false}}));
 await page.route(/https:\/\/.*\.supabase\.co\/rest\/v1\//,async route=>{
  const req=route.request(),u=new URL(req.url()),type=u.searchParams.get('data_type')||'';
  const row=(data_type,data)=>({id:'test-id',app_id:'app_yp9dq7mofjm',data_type,data,updated_at:'2026-11-22T01:00:00Z'});
  if(req.method()==='GET')return route.fulfill({json:type.startsWith('in.')?[row('contacts',s.contacts),row('renewal_v1',s.renewal)]:type==='eq.contacts'?row('contacts',s.contacts):type==='eq.renewal_v1'?row('renewal_v1',s.renewal):row('categories',[])});
  if(u.pathname.endsWith('/rpc/commit_mingya_import_v2')){if(s.fail)return route.fulfill({status:500,json:{message:'fixture failure'}});const b=req.postDataJSON();s.contacts=b.p_contacts;s.renewal=b.p_renewal;s.writes++;return route.fulfill({json:'2026-11-22T01:00:01Z'});}
  if(req.method()==='PATCH'&&type==='eq.contacts')s.contacts=req.postDataJSON().data;
  return route.fulfill({status:200,json:[]});
 });
 await page.setViewportSize({width:1304,height:880});await page.goto('http://127.0.0.1:3012/');
 await page.getByRole('button',{name:'添加 / 导入',exact:true}).click();await page.getByRole('button',{name:'明亚采集',exact:true}).click();
 await page.screenshot({path:'/Users/apple/Downloads/AI PROGRAM/insurance-mingya-detail-fix/output/design-entry-desktop.png'});
 return {entry:await page.locator('[class*="max-w-5xl"]').innerText(),hasOldPolicyUpload:await page.getByText('选择表格',{exact:true}).count()};
}
