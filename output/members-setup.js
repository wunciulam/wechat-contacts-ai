async(page)=>{
 const contact={id:'c1',remarkName:'示例客户',nickname:'示例客户',wxid:'',remarkInfo:'保留备注',tags:['重要'],addedAt:1,dealProducts:[],intentProducts:[],policies:[],followUpStatus:'following',categoryIds:['a','b'],progressHistory:[{id:'r1',date:'2026-11-23',content:'共享跟进记录',completed:false}]};
 const s={contacts:[contact],categories:[{id:'a',name:'招募',color:'#f59e0b',icon:'UserPlus',order:0},{id:'b',name:'团队成员进度',color:'#ef4444',icon:'UserPlus',order:1},{id:'c',name:'办身份',color:'#8b5cf6',icon:'UserPlus',order:2}],fail:false,requests:[]};page._members=s;
 await page.route('**/api/renewal-email',r=>r.fulfill({json:{configured:false}}));
 await page.route(/https:\/\/.*\.supabase\.co\/rest\/v1\//,async route=>{
  const req=route.request(),u=new URL(req.url()),type=u.searchParams.get('data_type')||'',b=req.method()==='GET'?null:req.postDataJSON();
  const row=(data_type,data)=>({id:'test',app_id:'app_yp9dq7mofjm',data_type,data,updated_at:'2026-11-23T01:00:00Z'});
  if(req.method()==='GET')return route.fulfill({json:type==='eq.contacts'?row('contacts',s.contacts):type==='eq.categories'?row('categories',s.categories):row('renewal_v1',{policies:[],settings:{},imports:[]})});
  if(u.pathname.endsWith('/rpc/save_contact_category_v1')){
   s.requests.push(b);await new Promise(r=>setTimeout(r,250));if(s.fail)return route.fulfill({status:500,json:{message:'分类保存失败，请重试。'}});
   let c=s.contacts.find(c=>b.p_contact_id?c.id===b.p_contact_id:c.remarkName.replace(/\s/g,'')===b.p_name.replace(/\s/g,''));if(!c){c={...contact,id:'c'+(s.contacts.length+1),remarkName:b.p_name,nickname:b.p_name,progressHistory:[],categoryIds:[]};s.contacts.push(c);}
   let ids=c.categoryIds.filter(id=>id!==b.p_source);if(b.p_target&&b.p_target!=='__uncategorized__'&&!ids.includes(b.p_target)&&!b.p_remove)ids.push(b.p_target);c.categoryIds=ids;c.followUpStatus=b.p_remove&&!ids.length?'idle':'following';return route.fulfill({json:c});
  }
  if(req.method()==='PATCH'&&type==='eq.contacts')s.contacts=b.data;return route.fulfill({json:[]});
 });
 await page.setViewportSize({width:1304,height:880});await page.goto('http://127.0.0.1:3016/');await page.getByRole('button',{name:/跟进工作台/}).click();return {body:(await page.locator('body').innerText()).slice(-1000)};
}
