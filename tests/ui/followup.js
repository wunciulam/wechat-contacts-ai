async (page) => {

  const customer=page.getByRole('dialog',{name:'示例客户的客户详情',exact:true});
  await customer.getByRole('tab',{name:'跟进',exact:true}).click();
  await customer.getByRole('button',{name:'写跟进',exact:true}).click();
  const d=page.getByRole('dialog',{name:'写跟进',exact:true}),content=d.getByLabel('沟通结果',{exact:true});
  await content.fill('回归检查：保留输入并重试');page._follow.fail=true;
  const save=d.getByRole('button',{name:'保存结果',exact:true});await save.click();
  await d.getByRole('alert').filter({hasText:'测试保存失败'}).waitFor();
  if(await content.inputValue()!=='回归检查：保留输入并重试')throw Error('failed save cleared input');
  page._follow.fail=false;await save.click();await d.waitFor({state:'hidden'});
  await customer.getByText('回归检查：保留输入并重试',{exact:true}).waitFor();
  await page.reload();await page.getByRole('heading',{name:'示例客户',exact:true}).click();
  await customer.getByRole('tab',{name:'跟进',exact:true}).click();
  await customer.getByText('回归检查：保留输入并重试',{exact:true}).waitFor();
  await page.screenshot({timeout:30000,animations:'disabled',path:'output/ui-regression/followup-saved.png'});
  return {passed:true,failedInputRetained:true,retryPersistedAfterReload:true};
};
