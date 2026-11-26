async(page)=>{
 await page.setViewportSize({width:1304,height:880});await page.getByRole('button',{name:'添加 / 导入',exact:true}).click();await page.getByRole('button',{name:'明亚采集',exact:true}).click();await page.getByRole('button',{name:'导入采集文件',exact:true}).click();
 const d=page.getByRole('dialog');await d.locator('input[type=file]').setInputFiles('/Users/apple/Downloads/AI PROGRAM/insurance-mingya-detail-fix/output/filter-mixed.json');await d.getByText('已过滤 2 份终止或撤单保单。',{exact:true}).waitFor();
 const mixed=await d.innerText();await d.getByRole('button',{name:'更换文件',exact:true}).click();await d.locator('input[type=file]').setInputFiles('/Users/apple/Downloads/AI PROGRAM/insurance-mingya-detail-fix/output/filter-all.json');await d.getByText('已过滤 2 份终止或撤单保单。',{exact:true}).waitFor();
 if(!await d.getByRole('button',{name:'确认合并导入',exact:true}).isDisabled())throw Error('empty import enabled');
 await page.screenshot({path:'/Users/apple/Downloads/AI PROGRAM/insurance-mingya-detail-fix/output/filter-desktop.png'});
 return {mixed,allFilteredBlocked:true,requests:page._follow.requests.filter(r=>r.path.includes('commit'))};
}
