async (page) => {
 await page.getByText('示例客户',{exact:true}).first().click();
 await page.getByRole('button',{name:'新录入详细保障测试保单',exact:true}).click();
 const d=page.getByRole('dialog');const text=await d.innerText();
 await d.getByRole('button',{name:'编辑资料',exact:true}).click();const labels=await d.locator('label').allTextContents();
 const controls=await d.locator('input,select').evaluateAll(els=>els.map(e=>({name:e.labels[0]?.textContent,height:e.getBoundingClientRect().height,font:getComputedStyle(e).fontSize})));
 await page.setViewportSize({width:1304,height:880});await d.locator('.overflow-y-auto').evaluate(e=>e.scrollTop=0);
 await page.screenshot({path:'/Users/apple/Downloads/AI PROGRAM/insurance-mingya-detail-fix/output/design-shared-fields-desktop.png'});
 await d.getByRole('button',{name:'取消',exact:true}).click();await d.getByRole('button',{name:'关闭',exact:true}).click();
 await page.getByRole('button',{name:/测试用长名称两全/}).first().click();await page.getByRole('dialog').getByRole('button',{name:'明亚采集详情',exact:true}).click();
 const source=page.getByRole('dialog').last();await page.screenshot({path:'/Users/apple/Downloads/AI PROGRAM/insurance-mingya-detail-fix/output/design-source-detail-desktop.png'});
 const sourceText=await source.innerText();await page.keyboard.press('Escape');const remainingDialogs=await page.locator('dialog[open]').count();
 return {detailMatches:['APPLY-001','4,491.00','15年','至80周岁','2073-05-18','两全'].map(v=>[v,text.includes(v)]),labels,controls,remainingDialogs,sourceIncludes:sourceText.includes('¥ 12,000,000.00'),errors:await page.getByRole('alert').allTextContents()};
}
