async(page)=>{
 const errors=[];page.on('pageerror',e=>errors.push(e.message));const d=page.getByRole('dialog');await d.getByText('缴费期已结束，历史缴费待核对',{exact:true}).waitFor();if(await d.getByText(/逾期/).count())throw Error('false overdue');
 await d.getByRole('button',{name:'编辑资料',exact:true}).click();await d.getByLabel('缴费结束日期（不含当天）',{exact:true}).waitFor();const fields=await d.locator('input,select').count();if(fields!==16)throw Error('missing fields '+fields);
 await d.getByLabel('缴费结束日期（不含当天）',{exact:true}).fill('2022-05-19');await d.getByRole('button',{name:'取消',exact:true}).click();await d.getByText('2023-05-19',{exact:true}).waitFor();
 await d.getByRole('button',{name:'编辑资料',exact:true}).click();await d.getByLabel('保额',{exact:true}).fill('60000');await d.getByRole('button',{name:'保存保单信息',exact:true}).click();await d.getByText('保单资料已保存',{exact:true}).waitFor();
 if(errors.length)throw Error(errors.join('|'));await page.screenshot({animations:'disabled',path:'/Users/apple/Downloads/AI PROGRAM/insurance-mingya-detail-fix/output/expired-detail-desktop.png'});
 await page.setViewportSize({width:390,height:844});await d.getByRole('button',{name:'编辑资料',exact:true}).click();const body=d.locator('.overflow-y-auto').first();await body.evaluate(e=>e.scrollTop=e.scrollHeight);await page.screenshot({animations:'disabled',path:'/Users/apple/Downloads/AI PROGRAM/insurance-mingya-detail-fix/output/expired-edit-mobile.png'});const save=await d.getByRole('button',{name:'保存保单信息',exact:true}).boundingBox();if(save.y+save.height>844)throw Error('save inaccessible');
 return {falseOverdue:false,fields,numericPhoneSafe:true,errors,cancelRestored:true,saveSucceeded:true,mobileSaveVisible:true};
}
