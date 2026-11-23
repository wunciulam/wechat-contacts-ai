export function excludedPolicyImport(status:unknown):boolean {
  const value=String(status??'').trim();
  return ['17','22'].includes(value)||/终止/.test(value)||/撤单/.test(value)&&!/撤单中|撤单失败/.test(value);
}
// Verified against Mingya's policy-list status choices, not order/risk statuses.
export function mingyaStatusLabel(value:unknown):string {
  const status=String(value??'').trim();
  if(/[\u4e00-\u9fff]/.test(status))return status;
  return ({'16':'正式保单','17':'终止保单','18':'中止保单','21':'撤单中','22':'已撤单'} as Record<string,string>)[status]||`明亚状态（${status||'未知'}）`;
}
