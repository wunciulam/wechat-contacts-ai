async(page)=>{
 await page.reload();await page.getByRole('button',{name:/跟进工作台/}).click();
 const s=page._members,col=id=>page.locator('[data-category-id="'+id+'"]');
 if(await page.locator('[data-contact-id="c1"]').count()!==2)throw Error('two columns not shown');
 await page.getByRole('button',{name:'添加联系人到办身份',exact:true}).click();await col('c').getByRole('textbox').fill('示例客户');
 s.fail=true;await col('c').getByRole('button',{name:'示 示例客户',exact:true}).click();await col('c').getByRole('alert').waitFor();
 if(s.contacts.length!==1||await col('c').getByRole('textbox').inputValue()!=='示例客户')throw Error('failure discarded input');
 s.fail=false;await col('c').getByRole('button',{name:'示 示例客户',exact:true}).click();await col('c').locator('[data-contact-id="c1"]').waitFor();
 if(s.contacts.length!==1||s.contacts[0].categoryIds.length!==3)throw Error('add duplicated identity');
 await col('a').locator('[data-contact-id="c1"]').hover();await col('a').getByRole('button',{name:'移出此分类',exact:true}).click();await col('a').locator('[data-contact-id="c1"]').waitFor({state:'hidden'});
 if(!s.contacts[0].categoryIds.includes('b')||!s.contacts[0].categoryIds.includes('c'))throw Error('remove lost other column');
 const from=await col('b').locator('[data-contact-id="c1"]').boundingBox(),to=await col('a').boundingBox();
 await page.mouse.move(from.x+60,from.y+20);await page.mouse.down();await page.mouse.move(from.x+80,from.y+20,{steps:3});await page.mouse.move(to.x+80,to.y+160,{steps:20});await page.mouse.up();await col('a').locator('[data-contact-id="c1"]').waitFor();await col('b').locator('[data-contact-id="c1"]').waitFor({state:'hidden'});
 if(!s.contacts[0].categoryIds.includes('c')||s.contacts[0].categoryIds.includes('b'))throw Error('drag erased unrelated membership');
 await page.screenshot({path:'/Users/apple/Downloads/AI PROGRAM/insurance-mingya-detail-fix/output/members-desktop.png'});
 await col('a').locator('[data-contact-id="c1"]').click();await page.getByText('编辑联系人资料',{exact:true}).waitFor();const history=await page.getByText('共享跟进记录',{exact:true}).count();await page.getByRole('button',{name:'取消',exact:true}).click();
 await page.reload();await page.getByRole('button',{name:/跟进工作台/}).click();if(await page.locator('[data-contact-id="c1"]').count()!==2)throw Error('refresh');
 await page.setViewportSize({width:390,height:844});await page.screenshot({path:'/Users/apple/Downloads/AI PROGRAM/insurance-mingya-detail-fix/output/members-mobile.png'});
 const overflow=await page.evaluate(()=>document.documentElement.scrollWidth>innerWidth);if(overflow)throw Error('whole-page overflow');
 const scroller=col('a').locator('..').locator('..');const x=await scroller.evaluate(e=>{e.scrollLeft=400;return e.scrollLeft;});
 return {contacts:s.contacts.length,memberships:s.contacts[0].categoryIds,followups:s.contacts[0].progressHistory.length,historyOpened:history>0,failedInputPreserved:true,drag:'source only moved',refresh:true,mobileOverflow:overflow,horizontalScroll:x};
}
