import { supabase } from "./supabaseService";
import { nextPayment as importNextPayment } from "./renewal";
import type { RenewalData } from "./renewal";
import type { Contact } from "../types";
const appId = import.meta.env.VITE_APP_ID;
// One PostgREST insert statement commits both rows together; rejected on any constraint failure.
export async function saveImport(data: RenewalData, contacts: Contact[]) {
  if (!appId) throw new Error("缺少固定数据标识，已阻止导入");
  const { data: savedRows, error } = await supabase.from("app_data").upsert(
    [
      {
        app_id: appId,
        data_type: "renewal_v1",
        data,
        updated_at: new Date().toISOString(),
      },
      {
        app_id: appId,
        data_type: "contacts",
        data: contacts,
        updated_at: new Date().toISOString(),
      },
    ],
    { onConflict: "app_id,data_type" },
  ).select("data_type,data");
  if (error) throw error;
  const saved=savedRows?.find(row=>row.data_type==='contacts')?.data;
  if(!Array.isArray(saved))throw new Error('未收到客户保存确认，请刷新核对。');
  return saved as Contact[];
}

export interface PolicyMarkResult { payments: import('./renewal').Payment[]; renewed?: boolean }
// Send only the selected installment; the database updates both projections atomically.
export async function savePolicyMark(policy: import('./renewal').ManagedPolicy, kind: string, date?: string): Promise<PolicyMarkResult> {
  if (!appId) throw new Error('缺少固定数据标识');
  const payment = policy.payments.find(p => p.date === date);
  const seed = payment || (date ? { ...importNextPayment(policy), date } : undefined);
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), 15000);
  try {
    const { data, error } = await supabase.rpc('mark_policy_installment_v1', {
      p_app_id: appId, p_policy_id: policy.id, p_kind: kind, p_date: date || null,
      p_expected: kind === 'renewal' ? Boolean(policy.renewed) : payment || null,
      p_seed: seed || null,
      p_target: kind === 'renewal' ? !policy.renewed : (payment?.status === '已缴费' ? '未缴费' : '已缴费'),
    }).abortSignal(controller.signal);
    if (error) throw new Error(error.message || '保存失败，请重试');
    return data;
  } catch (e) {
    if (controller.signal.aborted) throw new Error('保存超时，请刷新核对状态后重试。');
    throw e;
  } finally { clearTimeout(timeout); }
}
