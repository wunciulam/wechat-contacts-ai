async(page)=>{
 await page.unrouteAll({behavior:'wait'});await page.setViewportSize({width:1304,height:880});await page.goto('https://insurance-rose-seven.vercel.app/');await page.getByRole('button',{name:/跟进工作台/}).click();
 const cards=page.locator('[data-contact-id]').filter({has:page.getByRole('heading',{name:'郭子豪',exact:true})});await cards.first().waitFor();
 const ids=await cards.evaluateAll(es=>es.map(e=>e.dataset.contactId));const columns=await cards.evaluateAll(es=>es.map(e=>e.closest('[data-category-id]').dataset.categoryId));
 if(ids.length!==2||new Set(ids).size!==1)throw Error('live membership mismatch');
 await page.getByRole('button',{name:/全部联系人/}).click();const one=await page.getByRole('heading',{name:'郭子豪',exact:true}).count();if(one!==1)throw Error('duplicate contact on live list');
 return {origin:new URL(page.url()).origin,listEntries:one,categoryCards:ids.length,sharedIdentity:new Set(ids).size===1,distinctCategories:new Set(columns).size};
}
