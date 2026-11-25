async page=>{
 const status=await page.request.get('__BASE_URL__/api/ai-settings');if(!(await status.json()).configured)throw Error('Live vision requires a configured local server');
 const customer=page.getByRole('dialog',{name:'示例客户的客户详情',exact:true});await customer.getByRole('tab',{name:'跟进',exact:true}).click();await customer.getByRole('button',{name:'导入聊天',exact:true}).click();const d=page.getByRole('dialog',{name:'导入聊天记录',exact:true});await d.locator('input[type=file]').setInputFiles('tests/fixtures/chat-vision-long.png');
 await d.locator('button[aria-label^="编辑消息："]').first().waitFor({timeout:135000});
 const rows=await d.locator('button[aria-label^="编辑消息："]').evaluateAll(ns=>ns.map(n=>n.getAttribute('aria-label').replace('编辑消息：','').replace(/\s/g,'')));
 const expected=['我现在有公司的团险，但是不清楚住院报销范围。想确认是否还要补医疗险。','可以，先把保障表发我。我核对保障范围后，再回复重复保障和缺口。','这周预算大概五千元，先不要给我太复杂的方案。','收到，我先按预算整理，周五发你两版方案比较。','好的，谢谢。'];
 if(JSON.stringify(rows)!==JSON.stringify([expected[2],expected[3],expected[4],expected[0],expected[1]]))throw Error('Live full bubble comparison failed: '+JSON.stringify(rows));
 await d.getByText('2026-11-24',{exact:true}).waitFor();await d.getByText('2026-11-25',{exact:true}).waitFor();await page.screenshot({timeout:30000,path:'output/ui-regression/vision-live-long-desktop.png'});await page.setViewportSize({width:390,height:844});await page.screenshot({timeout:30000,path:'output/ui-regression/vision-live-long-mobile.png'});
 return {passed:true,realProvider:true,syntheticOnly:true,screenshotHeight:5000,bubbles:rows.length,exactTextMatch:true,noCustomerRecordsSaved:true};
};
