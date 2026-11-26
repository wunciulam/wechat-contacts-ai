async(page)=>{
 const errors=[];page.on('pageerror',e=>errors.push(e.message));const d=page.getByRole('dialog',{name:'编辑联系人资料',exact:true});await d.getByRole('button',{name:'添加保单',exact:true}).click();
 const date=d.getByLabel('生效日期',{exact:true});await date.waitFor();const popup=d.getByRole('button',{name:'选择生效日期',exact:true});await popup.click();const calendar=page.getByRole('dialog',{name:'选择日期',exact:true});await calendar.waitFor();
 await calendar.getByRole('gridcell',{name:'2026-11-23',exact:true}).click();if(await date.inputValue()!=='2026-11-23')throw Error('calendar did not commit real value '+await date.inputValue());
 await popup.click();await page.keyboard.press('Escape');if(await calendar.count()||!await d.isVisible())throw Error('Escape closed parent or left calendar');
 const status=d.getByRole('combobox',{name:'状态',exact:true});await status.click();await page.getByRole('option',{name:'待生效',exact:true}).click();if(await status.innerText()!=='待生效')throw Error('select value');
 const sizes={date:await date.locator('..').evaluate(e=>e.getBoundingClientRect().height),select:await status.evaluate(e=>e.getBoundingClientRect().height)};
 await popup.click();const bounds=await calendar.boundingBox();if(bounds.x<0||bounds.y<0||bounds.x+bounds.width>1304||bounds.y+bounds.height>880)throw Error('calendar clipping');
 await page.screenshot({animations:'disabled',path:'/Users/apple/Downloads/AI PROGRAM/insurance-mingya-detail-fix/output/ui-calendar-desktop.png'});await page.keyboard.press('Escape');
 return {value:await date.inputValue(),status:await status.innerText(),sizes,calendarInsideViewport:true,errors};
}
