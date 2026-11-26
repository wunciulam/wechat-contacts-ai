async(page)=>{
 const s=page._follow, table=page.locator('table').first(),all=page.getByRole('checkbox',{name:'全选示例客户的保单'});
 await all.check();if(await page.getByRole('checkbox',{checked:true}).count()!==4)throw Error('select all');
 await page.getByRole('checkbox',{name:'选择保单P7X26310921000000004682-2',exact:true}).uncheck();if(!await all.evaluate(e=>e.indeterminate))throw Error('indeterminate');
 await page.getByRole('button',{name:'删除所选',exact:true}).click();await page.getByRole('button',{name:'取消',exact:true}).click();if(s.deletes?.length)throw Error('cancel wrote');
 s.fail=true;await page.getByRole('button',{name:'删除所选',exact:true}).click();await page.getByRole('button',{name:'确认删除',exact:true}).click();await page.getByRole('alert').waitFor();
 if(s.contacts[0].policies.length!==3)throw Error('failure mutated');
 await page.screenshot({path:'/Users/apple/Downloads/AI PROGRAM/insurance-mingya-detail-fix/output/batch-error-desktop.png'});
 s.fail=false;await page.getByRole('button',{name:'确认删除',exact:true}).click();await page.getByRole('dialog').waitFor({state:'hidden'});
 if(s.contacts[0].policies.length!==1||s.contacts[0].progressHistory.length!==1||s.deletes[0].p_request_id!==s.deletes[1].p_request_id)throw Error('delete/retry');
 const separator=page.getByRole('separator',{name:'调整操作列宽度'}),b=await separator.boundingBox();
 await page.mouse.move(b.x+4,b.y+10);await page.mouse.down();await page.mouse.move(b.x-96,b.y+10,{steps:10});await page.mouse.up();
 const w=Number(await separator.getAttribute('aria-valuenow'));if(w!==228)throw Error('drag '+w);
 const wrap=table.locator('..'),right=await table.locator('th').last().evaluate(e=>e.getBoundingClientRect().right);await wrap.evaluate(e=>e.scrollLeft=e.scrollWidth-e.clientWidth);if(Math.abs(right-await table.locator('th').last().evaluate(e=>e.getBoundingClientRect().right))>1)throw Error('sticky');
 await page.screenshot({path:'/Users/apple/Downloads/AI PROGRAM/insurance-mingya-detail-fix/output/batch-desktop.png'});
 await page.reload();await page.getByRole('button',{name:/保单管理/}).click();await page.getByText('示例客户',{exact:true}).first().click();
 if(Number(await separator.getAttribute('aria-valuenow'))!==228||await table.locator('tbody tr').count()!==1)throw Error('refresh');
 await page.setViewportSize({width:390,height:844});await separator.waitFor();await table.locator('..').evaluate(e=>e.scrollLeft=e.scrollWidth-e.clientWidth);
 if(Number(await separator.getAttribute('aria-valuenow'))!==160||await page.evaluate(()=>document.documentElement.scrollWidth>innerWidth))throw Error('mobile width');
 await page.screenshot({path:'/Users/apple/Downloads/AI PROGRAM/insurance-mingya-detail-fix/output/batch-mobile.png'});
 await page.getByRole('checkbox',{name:'全选示例客户的保单'}).check();await page.getByRole('button',{name:'删除所选',exact:true}).click();await page.screenshot({path:'/Users/apple/Downloads/AI PROGRAM/insurance-mingya-detail-fix/output/batch-confirm-mobile.png'});await page.getByRole('button',{name:'取消',exact:true}).click();
 return {selection:'all/partial/cancel passed',retrySameRequest:true,remainingPolicies:s.contacts[0].policies.length,preservedFollowups:s.contacts[0].progressHistory.length,dragWidth:w,mobileWidth:160,refreshPersisted:true};
}
