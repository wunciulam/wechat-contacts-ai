async(page)=>{
 const s=page._follow,t=page.locator('[data-contact-policy-table]');await t.waitFor();if(await t.locator('tbody tr').count()!==3)throw Error('summary statuses');
 const statuses=await t.locator('tbody tr td:nth-child(4)').allTextContents();
 const width=await t.locator('th').last().evaluate(e=>e.getBoundingClientRect().width);if(Math.abs(width-72)>1)throw Error('action width '+width);
 const wrap=t.locator('..');await wrap.evaluate(e=>e.scrollLeft=e.scrollWidth-e.clientWidth);await page.screenshot({animations:'disabled',path:'/Users/apple/Downloads/AI PROGRAM/insurance-mingya-detail-fix/output/contact-policies-desktop.png'});
 await page.getByRole('button',{name:'管理保单',exact:true}).click();await page.getByText('编辑联系人资料',{exact:true}).waitFor({state:'hidden'});
 const table=page.locator('table').first();await page.getByRole('checkbox',{name:'全选示例客户的保单'}).waitFor();if(await table.locator('tbody tr').count()!==3||await page.getByRole('heading',{name:'其他客户',exact:true}).count())throw Error('scope or expansion');
 await page.getByRole('button',{name:'修改标签',exact:true}).click();await page.locator('#contact-description').fill('保存客户不清空隐藏保单');await page.getByRole('button',{name:'保存',exact:true}).click();await page.getByText('编辑联系人资料',{exact:true}).waitFor({state:'hidden'});if(s.contacts[0].policies.length!==6)throw Error('profile dropped hidden policies');
 await page.getByRole('checkbox',{name:'全选示例客户的保单'}).check();await page.getByRole('button',{name:'删除所选',exact:true}).click();await page.getByRole('button',{name:'确认删除',exact:true}).click();await page.getByRole('dialog').waitFor({state:'hidden'});
 await page.getByText('该客户暂无可展示保单',{exact:true}).waitFor();if(s.contacts[0].policies.length!==3||s.contacts[0].progressHistory.length!==1)throw Error('delete hidden data');
 await page.getByRole('button',{name:'全部保单',exact:true}).click();await page.getByRole('heading',{name:'其他客户',exact:true}).waitFor();if(await page.getByRole('heading',{name:'仅终止客户',exact:true}).count())throw Error('terminal-only visible');
 await page.setViewportSize({width:390,height:844});await page.getByRole('button',{name:'联系人',exact:true}).click();await page.getByRole('heading',{name:'其他客户',exact:true}).click();const mt=page.locator('[data-contact-policy-table]');await mt.waitFor();await mt.locator('..').evaluate(e=>e.scrollLeft=e.scrollWidth-e.clientWidth);await page.screenshot({animations:'disabled',path:'/Users/apple/Downloads/AI PROGRAM/insurance-mingya-detail-fix/output/contact-policies-mobile.png'});
 const mobileWidth=await mt.locator('th').last().evaluate(e=>e.getBoundingClientRect().width);if(Math.abs(mobileWidth-72)>1||await page.evaluate(()=>document.documentElement.scrollWidth>innerWidth))throw Error('mobile width');
 await page.getByRole('button',{name:'管理保单',exact:true}).click();await page.getByRole('checkbox',{name:'全选其他客户的保单'}).waitFor();
 return {statuses,actionWidth:width,mobileWidth,scopeAutoExpanded:true,deletedVisibleOnly:true,hiddenPreserved:s.contacts[0].policies.length,followups:s.contacts[0].progressHistory.length,mobileNavigation:true};
}
