async (page) => {
 await page.reload();
 await page.setViewportSize({width:1304,height:880});
 await page.getByRole('button',{name:'添加 / 导入',exact:true}).click();await page.getByRole('button',{name:'明亚采集',exact:true}).click();
 await page.screenshot({path:'/Users/apple/Downloads/AI PROGRAM/insurance-mingya-detail-fix/output/design-entry-desktop.png'});
 const entryOld=await page.getByText('选择表格',{exact:true}).count();
 await page.getByRole('button',{name:'导入采集文件',exact:true}).click();
 const empty=await page.getByRole('dialog').innerText();await page.getByRole('dialog').getByRole('button',{name:'取消',exact:true}).click();
 await page.getByRole('button',{name:/保单管理/}).click();
 await page.getByRole('button',{name:'录入保单',exact:true}).click();
 const d=page.getByRole('dialog');const title='新录入详细保障测试保单';
 for(const [label,val] of [['产品名称',title],['保单号','MANUAL-001'],['投保单号','APPLY-001'],['保险公司','测试保险公司'],['单期保费','4491'],['生效日期','2009-05-19'],['缴费期间','15年'],['缴费结束日期（不含当天）','2023-05-19'],['保障期间','至80周岁'],['保障到期日','2073-05-18'],['保额','60000'],['险种类型','两全']])await d.getByLabel(new RegExp('^'+label.replace(/[()（）]/g,'\\$&'))).fill(val);
 await d.getByLabel(/^投保人/).selectOption('c1');await d.getByLabel('缴费方式',{exact:true}).selectOption('期交-年');
 const fieldCount=await d.locator('input,select').count();await page.screenshot({path:'/Users/apple/Downloads/AI PROGRAM/insurance-mingya-detail-fix/output/design-manual-desktop.png'});
 await page.setViewportSize({width:390,height:844});await d.getByLabel('保障到期日',{exact:true}).scrollIntoViewIfNeeded();
 await page.screenshot({path:'/Users/apple/Downloads/AI PROGRAM/insurance-mingya-detail-fix/output/design-manual-mobile.png'});
 const fixed=await d.evaluate(el=>({header:el.querySelector('header').getBoundingClientRect().top,save:el.querySelector('button.btn-primary').getBoundingClientRect().bottom,overflow:document.documentElement.scrollWidth>innerWidth}));
 await d.getByRole('button',{name:'保存保单',exact:true}).click();await d.waitFor({state:'hidden'});
 await page.getByRole('button',{name:title,exact:true}).click();
 const detail=page.getByRole('dialog');const text=await detail.innerText();
 await detail.getByRole('button',{name:'编辑资料',exact:true}).click();const detailFieldCount=await detail.locator('input,select').count();
 return {entryOld,empty,fieldCount,detailFieldCount,fixed,detailIncludes:['APPLY-001','4491','15年','至80周岁','2073-05-18','两全'].map(v=>[v,text.includes(v)||text.includes('4,491.00')&&v==='4491']),saved:page._design.contacts[0].policies.find(p=>p.policyNumber==='MANUAL-001')};
}
