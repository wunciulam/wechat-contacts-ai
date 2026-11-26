async(page)=>{
 await page.unrouteAll({behavior:'wait'});await page.setViewportSize({width:1304,height:880});await page.goto('https://insurance-rose-seven.vercel.app/');await page.getByRole('button',{name:/保单管理/}).click();await page.getByRole('button',{name:'修改标签',exact:true}).first().click();
 const t=page.locator('[data-contact-policy-table]');await t.waitFor();const states=(await t.locator('tbody tr td:nth-child(4)').allTextContents()).map(s=>s.trim());
 if(states.some(s=>/终止/.test(s)||(/撤单/.test(s)&&!/撤单中|撤单失败/.test(s))))throw Error('ended policy visible');
 const width=await t.locator('th').last().evaluate(e=>e.getBoundingClientRect().width);if(Math.abs(width-72)>1)throw Error('width');const rows=states.length;
 await page.getByRole('button',{name:'管理保单',exact:true}).click();await page.getByRole('button',{name:'全部保单',exact:true}).waitFor();await page.getByRole('checkbox',{name:/全选.+的保单/}).waitFor();
 return {origin:new URL(page.url()).origin,summaryRows:rows,endedVisible:0,actionWidth:width,scopeAutoExpanded:true,customers:await page.getByRole('button',{name:'修改标签',exact:true}).count()};
}
