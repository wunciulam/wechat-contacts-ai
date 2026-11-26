async(page)=>{
 await page.getByRole('button',{name:'取消',exact:true}).click();await page.getByRole('button',{name:/保单管理/}).click();await page.getByText('示例客户',{exact:true}).first().click();
 const t=page.locator('table').first();const wrap=t.locator('..');
 const before=await t.locator('tbody tr').first().locator('td').last().evaluate(e=>e.getBoundingClientRect().right);
 const stats=await t.evaluate(e=>({width:e.getBoundingClientRect().width,statuses:[...e.querySelectorAll('tbody tr')].map(r=>({text:r.children[7].textContent,color:getComputedStyle(r.children[7].firstElementChild).backgroundColor,nowrap:getComputedStyle(r.children[7].firstElementChild).whiteSpace})),amounts:[...e.querySelectorAll('td')].filter(td=>td.textContent.includes('8,235.00')).map(td=>td.getBoundingClientRect().width)}));
 await page.screenshot({path:'/Users/apple/Downloads/AI PROGRAM/insurance-mingya-detail-fix/output/policy-table-desktop-left.png'});
 await wrap.evaluate(e=>e.scrollLeft=e.scrollWidth-e.clientWidth);const after=await t.locator('tbody tr').first().locator('td').last().evaluate(e=>e.getBoundingClientRect().right);
 await page.screenshot({path:'/Users/apple/Downloads/AI PROGRAM/insurance-mingya-detail-fix/output/policy-table-desktop-right.png'});
 await page.setViewportSize({width:390,height:844});await wrap.evaluate(e=>e.scrollLeft=e.scrollWidth-e.clientWidth);await page.screenshot({path:'/Users/apple/Downloads/AI PROGRAM/insurance-mingya-detail-fix/output/policy-table-mobile.png'});
 return {stats,actionFixed:Math.abs(before-after)<1,mobileOverflow:await page.evaluate(()=>document.documentElement.scrollWidth>innerWidth),recordCount:page._follow.contacts[0].progressHistory.length};
}
