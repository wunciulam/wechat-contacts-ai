async(page)=>{
 // Reload fixtures with stored profile values to verify display and persistence.
 const c=page._follow.contacts[0];c.idCard='TEST-ID-001-X';c.phoneNumber='13800000000';c.birthday='1990-01-01';c.address='示例地址 A座';await page.reload();await page.getByRole('heading',{name:'示例客户',exact:true}).click();
 const d=page.getByRole('dialog',{name:'编辑联系人资料',exact:true});
 for(const [label,value] of [['证件号',c.idCard],['手机号',c.phoneNumber],['生日',c.birthday],['地址',c.address]])if(await d.getByLabel(label,{exact:true}).inputValue()!==value)throw Error('missing profile field '+label);
 await page.screenshot({animations:'disabled',path:'output/ui-regression/contact-basics-desktop.png'});
 await d.getByLabel('地址',{exact:true}).fill('手动修改后的地址 B座');await d.getByRole('button',{name:'保存',exact:true}).click();await d.waitFor({state:'hidden'});await page.reload();await page.getByRole('heading',{name:'示例客户',exact:true}).click();if(await d.getByLabel('地址',{exact:true}).inputValue()!=='手动修改后的地址 B座')throw Error('profile address not persisted');if(page._follow.contacts[0].progressHistory.length!==1||page._follow.contacts[0].policies.length!==6)throw Error('profile save changed records');
 await page.setViewportSize({width:390,height:844});await d.getByLabel('证件号',{exact:true}).scrollIntoViewIfNeeded();const address=await d.getByLabel('地址',{exact:true}).boundingBox();if(address.x<0||address.x+address.width>390)throw Error('mobile address overflow');await page.screenshot({animations:'disabled',path:'output/ui-regression/contact-basics-mobile.png'});await d.getByRole('button',{name:'取消',exact:true}).click();
 return {passed:true,storedFieldsDisplayed:true,addressPersistedAfterReload:true,historyAndPoliciesPreserved:true,mobileFits:true};
}
