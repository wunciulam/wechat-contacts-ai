async(page)=>{
 await page.setViewportSize({width:1304,height:880});await page.reload();await page.getByRole('button',{name:/跟进工作台/}).click();await page.setViewportSize({width:390,height:844});
 const h=await page.getByRole('heading',{name:/跟进工作台/}).boundingBox(),btn=await page.getByRole('button',{name:'管理分类',exact:true}).boundingBox();if(Math.abs(h.y-btn.y)>20)throw Error('mobile toolbar wrapped');
 const scroller=page.locator('.overflow-x-auto.overflow-y-hidden').first();await scroller.evaluate(e=>e.scrollLeft=600);const x=await scroller.evaluate(e=>e.scrollLeft);if(x<=0)throw Error('board not horizontally scrollable');
 await page.screenshot({path:'/Users/apple/Downloads/AI PROGRAM/insurance-mingya-detail-fix/output/members-mobile-scrolled.png'});
 return {toolbarSingleRow:true,scrollLeft:x,overflow:await page.evaluate(()=>document.documentElement.scrollWidth>innerWidth)};
}
