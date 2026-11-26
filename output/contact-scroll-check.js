async(page)=>{
 const c={id:'c1',remarkName:'滚动测试客户',nickname:'滚动测试客户',wxid:'',remarkInfo:'描述',tags:['成交客户'],addedAt:1,dealProducts:[],intentProducts:['左侧内容末尾'],policies:Array.from({length:20},(_,i)=>({id:'p'+i,productName:'测试保单'+i,policyNumber:'P'+i,company:'示例公司',premium:'100',effectiveDate:'2026-01-01',applicant:'滚动测试客户',insured:'滚动测试客户',status:'正式保单'})),progressHistory:[{id:'r',date:'2026-11-21',content:'右侧跟进历史',completed:false}],followUpStatus:'following'};
 await page.route(/https:\/\/.*\.supabase\.co\/rest\/v1\//,async route=>{const req=route.request(),type=new URL(req.url()).searchParams.get('data_type');return route.fulfill({json:req.method()==='GET'?{id:'test',data:type==='eq.contacts'?[c]:[]}:[]});});
 const check=async(url,width,height)=>{
  await page.setViewportSize({width,height});await page.goto(url);await page.getByText('滚动测试客户',{exact:true}).first().click();
  const scroll=page.locator('[data-contact-scroll]');const body=await scroll.count()?scroll:page.locator('fieldset').first();
  const rect=await body.boundingBox();await page.mouse.move(rect.x+40,rect.y+100);await page.mouse.wheel(0,1800);
  await page.evaluate(()=>new Promise(r=>requestAnimationFrame(()=>requestAnimationFrame(r))));
  const top=await body.evaluate(e=>e.scrollTop);
  const header=await page.getByText('编辑联系人资料',{exact:true}).boundingBox();
  await page.mouse.wheel(0,20000);await page.evaluate(()=>new Promise(r=>requestAnimationFrame(()=>requestAnimationFrame(r))));
  const metrics=await body.evaluate(e=>({top:e.scrollTop,max:e.scrollHeight-e.clientHeight}));
  const footer=await page.getByRole('button',{name:'保存',exact:true}).boundingBox();
  return{top,...metrics,headerVisible:header.y>=0,saveVisible:footer.y+footer.height<=height,overflow:await page.evaluate(()=>document.documentElement.scrollWidth>innerWidth)};
 };
 const before=await check('https://insurance-rose-seven.vercel.app/',1304,880);
 const desktop=await check('http://127.0.0.1:3014/',1304,880);await page.screenshot({path:'/Users/apple/Downloads/AI PROGRAM/insurance-mingya-detail-fix/output/contact-scroll-desktop-bottom.png'});
 const mobile=await check('http://127.0.0.1:3014/',390,844);await page.screenshot({path:'/Users/apple/Downloads/AI PROGRAM/insurance-mingya-detail-fix/output/contact-scroll-mobile-bottom.png'});
 return{before,desktop,mobile};
}
