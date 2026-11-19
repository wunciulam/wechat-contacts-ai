import { supabase } from './supabaseService';
import { emptyData, type RenewalData } from './renewal';

// Share the successful snapshot across workspace mounts in this browser session.
let snapshot: RenewalData | undefined;
let loadedAt = 0;
let pending: Promise<RenewalData> | undefined;
const listeners = new Set<(data: RenewalData) => void>();

export function getRenewalSnapshot() {
  return snapshot;
}

export function hasFreshRenewalSnapshot() {
  return Boolean(snapshot && Date.now() - loadedAt < 30_000);
}

export function rememberRenewalSnapshot(data: RenewalData) {
  snapshot = data;
  loadedAt = Date.now();
  listeners.forEach(listener => listener(data));
}

export function subscribeRenewalSnapshot(listener: (data: RenewalData) => void) {
  listeners.add(listener);
  return () => { listeners.delete(listener); };
}

export function loadRenewalSnapshot(force = false): Promise<RenewalData> {
  if (pending) return pending;
  if (!force && hasFreshRenewalSnapshot()) return Promise.resolve(snapshot!);

  const request = async () => {
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 8_000);
    try {
      const appId = import.meta.env.VITE_APP_ID;
      if (!appId) throw new Error('缺少保单数据连接配置');
      const { data: row, error } = await supabase.from('app_data')
        .select('data').eq('app_id', appId).eq('data_type', 'renewal_v1')
        .abortSignal(controller.signal).maybeSingle();
      if (error) throw error;
      const data = row?.data ?? { ...emptyData, policies: [], imports: [] };
      if (!Array.isArray(data.policies) || !Array.isArray(data.imports) || !data.settings) {
        throw new Error('续期数据格式异常');
      }
      rememberRenewalSnapshot(data);
      return data;
    } finally {
      clearTimeout(timeout);
    }
  };
  pending = request().finally(() => { pending = undefined; });
  return pending;
}
