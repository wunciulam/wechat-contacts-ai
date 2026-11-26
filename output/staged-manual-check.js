async (page) => {
 await page.setViewportSize({width:1304,height:880});await page.getByRole('button',{name:/保单管理/}).click();await page.getByRole('button',{name:'录入保单',exact:true}).click();
 const form=page.getByRole('dialog');
 for(const [label,value]of[['产品名称','线上验证新保单'],['保单号','MANUAL-STAGE'],['投保单号','STAGE-APPLY'],['保险公司','示例保险公司'],['缴费期间','10年'],['保障期间','至80周岁'],['保障到期日','2073-05-18']])await form.getByLabel(new RegExp('^'+label)).fill(value);
 await form.getByLabel(/^投保人/).selectOption('c1');await form.getByLabel('缴费方式',{exact:true}).selectOption('期交-年');
 const fields=await form.locator('input,select').count();const dimensions=await form.locator('input,select').evaluateAll(els=>[...new Set(els.map(e=>e.getBoundingClientRect().height))]);
 await page.setViewportSize({width:390,height:844});await form.getByRole('button',{name:'保存保单',exact:true}).click();await form.waitFor({state:'hidden'});
 await page.getByText('示例客户',{exact:true}).first().click();await page.getByRole('button',{name:'线上验证新保单',exact:true}).click();
 const text=await page.getByRole('dialog').innerText();return{origin:new URL(page.url()).origin,fields,dimensions,detail:['STAGE-APPLY','10年','至80周岁','2073-05-18'].every(v=>text.includes(v)),blankPremium:page._design.contacts[0].policies.find(p=>p.policyNumber==='MANUAL-STAGE').premium,errors:await page.getByRole('alert').allTextContents()};
}
