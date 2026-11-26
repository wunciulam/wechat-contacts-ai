async (page) => {
 await page.getByRole('button',{name:'导入采集文件',exact:true}).click();
 await page.locator('dialog input[type=file]').setInputFiles('/Users/apple/Downloads/AI PROGRAM/insurance-mingya-detail-fix/output/design-fixture.json');
 const d=page.getByRole('dialog');await d.getByLabel('已有保单处理方式').waitFor();
 await d.getByText(/保单明细（/).click();
 await page.screenshot({path:'/Users/apple/Downloads/AI PROGRAM/insurance-mingya-detail-fix/output/design-preview-desktop.png'});
 const metrics=await d.evaluate(el=>{const s=el.querySelector('select');const b=el.querySelector('.btn-primary');const cs=getComputedStyle(s);return{dialogWidth:el.getBoundingClientRect().width,selectHeight:s.getBoundingClientRect().height,selectFont:cs.fontSize,selectRadius:cs.borderRadius,selectPadding:cs.paddingRight,primary:getComputedStyle(b).backgroundColor,header:el.querySelector('header').getBoundingClientRect().height};});
 const issue=d.getByRole('combobox').nth(1);await issue.selectOption('c1');
 await page.setViewportSize({width:390,height:844});await page.screenshot({path:'/Users/apple/Downloads/AI PROGRAM/insurance-mingya-detail-fix/output/design-preview-mobile.png'});
 const mobile=await d.evaluate(el=>{const body=el.querySelector('.overflow-y-auto');body.scrollTop=body.scrollHeight;const h=el.querySelector('header').getBoundingClientRect(),button=el.querySelector('.btn-primary').getBoundingClientRect();return{headerVisible:h.top>=0,saveVisible:button.bottom<innerHeight,overflow:document.documentElement.scrollWidth>innerWidth,margin:el.getBoundingClientRect().left};});
 page._design.fail=true;await d.getByRole('button',{name:'确认合并导入',exact:true}).click();await d.getByRole('alert').waitFor();const failure=await d.getByRole('alert').innerText();
 page._design.fail=false;await d.getByRole('button',{name:'确认合并导入',exact:true}).click();await d.getByText('已导入跟单仔',{exact:true}).waitFor();
 return {metrics,mobile,failure,writes:page._design.writes,coverage:page._design.renewal.policies[0].coveragePeriod,expiry:page._design.renewal.policies[0].expiryDate};
}
