async (page) => {
 await page.setViewportSize({width:1304,height:880});await page.goto('https://insurance-rose-seven.vercel.app/');
 await page.getByRole('button',{name:'添加 / 导入',exact:true}).click();await page.getByRole('button',{name:'明亚采集',exact:true}).click();
 const entryOnly=await page.getByRole('button',{name:'导入采集文件',exact:true}).count()===1&&await page.getByText('选择表格',{exact:true}).count()===0;
 await page.getByRole('button',{name:'导入采集文件',exact:true}).click();const d=page.getByRole('dialog');
 const primary=await d.getByRole('button',{name:'选择文件',exact:true}).evaluate(e=>getComputedStyle(e).backgroundColor);
 await d.getByRole('button',{name:'取消',exact:true}).click();await page.getByRole('button',{name:/保单管理/}).click();await page.getByRole('button',{name:'录入保单',exact:true}).click();
 const f=page.getByRole('dialog');const fields=await f.locator('input,select').count();await page.setViewportSize({width:390,height:844});await f.locator('.overflow-y-auto').evaluate(e=>e.scrollTop=0);
 await page.screenshot({path:'/Users/apple/Downloads/AI PROGRAM/insurance-mingya-detail-fix/output/production-new-policy-mobile.png'});
 return {origin:new URL(page.url()).origin,entryOnly,primary,fields,overflow:await page.evaluate(()=>document.documentElement.scrollWidth>innerWidth),errors:await page.getByRole('alert').allTextContents()};
}
