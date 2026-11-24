async (page) => {
  const state = page._follow;
  const contact = state.contacts[0];
  const customer = page.getByRole('dialog', { name: '编辑联系人资料' });
  const dialog = page.getByRole('dialog', { name: '导入聊天记录' });
  const transcript = dialog.getByLabel('对话原文', { exact: true });
  const note = dialog.getByLabel('线下补充', { exact: true });
  const analysisRequests = [];
  let analysisFails = true;
  await page.route('**/api/chat-followup', async route => {
    analysisRequests.push(route.request().postDataJSON());
    if (analysisFails) return route.fulfill({ status: 503, json: { message: '测试分析暂不可用' } });
    return route.fulfill({ json: {
      summary: '客户希望确认现有保障，已约定发对比表。',
      stage: '比较方案',
      blocker: '现有保障范围待确认。',
      evidence: [1],
      nextAction: '核对现有保障后发对比表',
      dueDate: '2026-11-27',
    } });
  });
  await customer.getByRole('button', { name: '导入聊天', exact: true }).click();
  const render = async (height, rows) => Buffer.from(await page.evaluate(async ({height, rows}) => {
    const canvas = document.createElement('canvas');
    canvas.width = 780;
    canvas.height = height;
    const ctx = canvas.getContext('2d');
    ctx.fillStyle = '#ededed';
    ctx.fillRect(0, 0, 780, height);
    ctx.font = '38px PingFang SC, sans-serif';
    for (const { x, y, text, right } of rows) {
      ctx.fillStyle = right ? '#95ec69' : '#fff';
      ctx.fillRect(x - 18, y - 46, ctx.measureText(text).width + 36, 67);
      ctx.fillStyle = '#171717';
      ctx.fillText(text, x, y);
    }
    return canvas.toDataURL('image/png').split(',')[1];
  }, {height, rows}), 'base64');
  const client = { x: 104, y: 140, text: '我的医疗保险够用吗' };
  const reply = { x: 421, y: 252, text: '周五发你一份对比表', right: true };
  const long = await render(2970, [client, reply, { x: 88, y: 2500, text: '等我和家人先商量' }]);
  const files = dialog.locator('input[type="file"]');
  await files.setInputFiles({ name: 'long.png', mimeType: 'image/png', buffer: long });
  await dialog.getByRole('button', { name: '重新识别', exact: true }).waitFor({ timeout: 65000 });
  const longText = await transcript.inputValue();
  if (!longText.includes('医疗保险') || !longText.includes('对比表') || !longText.includes('先商量')) {
    throw Error('long OCR did not read text across tiles: ' + longText);
  }

  const first = await render(480, [client, reply]);
  const second = await render(430, [{ ...reply, y: 140 }, { x: 88, y: 252, text: '等我和家人先商量' }]);
  await dialog.getByRole('button', { name: '移除第 1 张截图' }).click();
  await files.setInputFiles([
    { name: 'one.png', mimeType: 'image/png', buffer: first },
    { name: 'two.png', mimeType: 'image/png', buffer: second },
  ]);
  await dialog.getByRole('button', { name: '下移第 1 张截图' }).click();
  await dialog.getByRole('button', { name: '上移第 2 张截图' }).click();
  await dialog.getByRole('button', { name: '识别文字', exact: true }).click();
  await dialog.getByRole('button', { name: '重新识别', exact: true }).waitFor({ timeout: 65000 });
  const recognized = await transcript.inputValue();
  if (!recognized.includes('客户：我的医疗保险') || !recognized.includes('我：周五发你一份对比表') ||
      (recognized.match(/对比表/g) || []).length !== 1 || !recognized.includes('先商量')) {
    throw Error('batch OCR sender/order/overlap: ' + recognized);
  }
  if (analysisRequests.length) throw Error('OCR called the analysis API');
  await dialog.getByRole('button', { name: '查看第 1 张截图' }).click();
  await dialog.getByRole('img', { name: 'one.png' }).waitFor();
  await page.screenshot({ animations: 'disabled', path: 'output/ui-regression/chat-ocr-desktop.png' });
  await dialog.getByRole('button', { name: '查看第 1 张截图' }).click();
  const corrected = recognized.replace('够用吗', '够用吗？');
  await transcript.fill(corrected);
  await note.fill('线下见面时说周五可以联系。手机号 13800000000。');
  await dialog.getByRole('button', { name: '分析下一步' }).click();
  await dialog.getByRole('alert').filter({ hasText: '测试分析暂不可用' }).waitFor();
  if (await transcript.inputValue() !== corrected) throw Error('analysis failure lost OCR text');
  analysisFails = false;
  await dialog.getByRole('button', { name: '分析下一步' }).click();
  await dialog.getByText('现有保障范围待确认。').waitFor();
  await dialog.getByText('查看依据', { exact: true }).click();
  if (!(await dialog.getByText(corrected.split('\n')[0], { exact: true }).isVisible())) throw Error('AI evidence did not point to original OCR text');
  const serialized = JSON.stringify(analysisRequests);
  if (serialized.includes('13800000000') || serialized.includes('base64') || !serialized.includes('原有记录')) {
    throw Error('analysis did not send redacted text and applicable history only');
  }

  await page.setViewportSize({ width: 390, height: 844 });
  const body = dialog.locator('[data-dialog-body]');
  await body.evaluate(el => { el.scrollTop = el.scrollHeight; });
  const scroll = await body.evaluate(el => el.scrollTop);
  const footer = await dialog.getByRole('button', { name: '保存记录与待办' }).boundingBox();
  const rect = await dialog.boundingBox();
  if (!scroll || !footer || footer.y + footer.height > 844 || !rect || rect.x < 0 || rect.x + rect.width > 390) {
    throw Error('mobile overflow or fixed footer missing');
  }
  await page.screenshot({ animations: 'disabled', path: 'output/ui-regression/chat-analysis-mobile.png' });
  await page.keyboard.press('Escape');
  await dialog.getByText('要放弃这次导入吗？').waitFor();
  await dialog.getByRole('button', { name: '继续编辑' }).click();
  state.fail = true;
  await dialog.getByRole('button', { name: '保存记录与待办' }).click();
  await dialog.getByRole('alert').filter({ hasText: '测试保存失败' }).waitFor();
  if (await transcript.inputValue() !== corrected) throw Error('save failure lost corrected input');
  await page.screenshot({ animations: 'disabled', path: 'output/ui-regression/chat-save-failed-mobile.png' });
  state.fail = false;
  await dialog.getByRole('button', { name: '保存记录与待办' }).click();
  await dialog.waitFor({ state: 'hidden' });
  if (contact.progressHistory.length !== 2) throw Error('expected one new followup');
  const saved = contact.progressHistory[0];
  if (saved.chat.transcript !== corrected || saved.chat.nextAction.dueDate !== '2026-11-27' ||
      JSON.stringify(saved).includes('.png') || JSON.stringify(saved).includes('base64')) throw Error('archive payload wrong');

  await page.reload();
  await page.getByRole('heading', { name: '示例客户', exact: true }).click();
  await customer.getByText('查看原话', { exact: true }).click();
  await customer.getByText(corrected.split('\n')[0], { exact: true }).waitFor();
  await page.screenshot({ animations: 'disabled', path: 'output/ui-regression/chat-history-mobile.png' });
  await customer.getByRole('button', { name: '取消', exact: true }).click();
  await page.getByRole('button', { name: '工作台', exact: true }).click();
  const task = page.getByRole('button', { name: '完成待办：核对现有保障后发对比表' });
  await task.waitFor();
  await task.click();
  await task.waitFor({ state: 'hidden' });
  if (!contact.progressHistory[0].completed || contact.progressHistory[0].chat.transcript !== corrected) {
    throw Error('completed task changed original record');
  }

  await page.getByRole('button', { name: '导入聊天', exact: true }).click();
  await dialog.getByRole('combobox').click();
  await dialog.getByRole('option', { name: '其他客户' }).waitFor();
  if (await dialog.getByRole('option', { name: '选择客户', exact: true }).count()) throw Error('placeholder duplicated as an option');
  await page.screenshot({ animations: 'disabled', path: 'output/ui-regression/chat-select-mobile.png' });
  await dialog.getByRole('option', { name: '其他客户' }).click();
  await note.fill('线下面谈，客户下周有空。');
  await dialog.getByRole('button', { name: '保存记录', exact: true }).click();
  await dialog.waitFor({ state: 'hidden' });
  const noteOnly = state.contacts[1].progressHistory[0];
  if (noteOnly.chat.note !== '线下面谈，客户下周有空。' || noteOnly.chat.nextAction || analysisRequests.length !== 2) {
    throw Error('offline note could not be archived without AI');
  }
  return { batchOCR: recognized, longOCR: longText, localOCR: true, evidence: true, failedSaveRetained: true, dateAndTask: true, offlineWithoutAI: true };
};
