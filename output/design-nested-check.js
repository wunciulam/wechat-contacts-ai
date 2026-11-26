async (page) => {
 await page.reload();await page.setViewportSize({width:1304,height:880});await page.getByRole('button',{name:/保单管理/}).click();await page.getByText('示例客户',{exact:true}).first().click();
 await page.getByRole('button',{name:/测试用长名称两全/}).first().click();await page.getByRole('dialog').getByRole('button',{name:'明亚采集详情',exact:true}).click();
 const before=await page.locator('dialog[open]').count();await page.keyboard.press('Escape');const after=await page.locator('dialog[open]').count();
 const focused=await page.evaluate(()=>document.activeElement?.textContent);
 await page.getByRole('dialog').getByRole('button',{name:'关闭',exact:true}).click();await page.getByRole('button',{name:'录入保单',exact:true}).click();
 const d=page.getByRole('dialog');await d.getByLabel(/^产品名称/).fill('未保存的测试保单');
 await page.evaluate(()=>{window._confirmMessages=[];window.confirm=message=>{window._confirmMessages.push(message);return false;};});await page.keyboard.press('Escape');const dirtyRetained=await d.isVisible();
 await page.evaluate(()=>{window.confirm=()=>true;});await d.getByRole('button',{name:'取消',exact:true}).click();
 return {before,after,focused,dirtyRetained,closed:await page.locator('dialog[open]').count()};
}
