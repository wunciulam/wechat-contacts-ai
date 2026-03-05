
import { createClient } from '@supabase/supabase-js';

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL || '';
const supabaseKey = import.meta.env.VITE_SUPABASE_ANON_KEY || '';
const configuredAppId = import.meta.env.VITE_APP_ID || '';

const APP_ID_STORAGE_KEY = 'wechat_app_id';

export const supabase = createClient(supabaseUrl, supabaseKey);

export const isSupabaseConfigured = () => {
  return !!(supabaseUrl && supabaseKey);
};

const generateAppId = () => `app_${Math.random().toString(36).slice(2, 17)}`;

const getStoredAppId = (): string | null => {
  try {
    return localStorage.getItem(APP_ID_STORAGE_KEY);
  } catch {
    return null;
  }
};

const setStoredAppId = (appId: string) => {
  try {
    localStorage.setItem(APP_ID_STORAGE_KEY, appId);
  } catch {
    // ignore
  }
};

/**
 * 注意：
 * - localStorage/IndexedDB 都是“按域名+端口”隔离的；换端口/域名会像“数据没了”
 * - 云端 app_data 又按 app_id 分区；如果 app_id 丢失（清缓存/换浏览器/换设备），也会读不到旧数据
 *
 * 解决：
 * - 配置 VITE_APP_ID（推荐）让不同设备/域名访问同一份云端数据
 * - 或者在第一次读取时自动探测已有 app_id（仅在你自己的 Supabase 项目里使用）
 */
const resolveAppIdForWrite = (): string => {
  if (configuredAppId) return configuredAppId;
  const stored = getStoredAppId();
  if (stored) return stored;
  const fresh = generateAppId();
  setStoredAppId(fresh);
  return fresh;
};

const resolveAppIdForRead = async (dataType: string): Promise<string> => {
  if (configuredAppId) return configuredAppId;
  const stored = getStoredAppId();
  if (stored) return stored;

  // 尝试从云端找回旧 app_id（比如清理了本地存储/换了域名/换了端口）
  try {
    const { data, error } = await supabase
      .from('app_data')
      .select('app_id, updated_at')
      .eq('data_type', dataType)
      .order('updated_at', { ascending: false })
      .limit(1)
      .maybeSingle();

    if (!error && data?.app_id) {
      setStoredAppId(data.app_id);
      return data.app_id;
    }
  } catch {
    // ignore and create a new one
  }

  const fresh = generateAppId();
  setStoredAppId(fresh);
  return fresh;
};

export const saveToCloud = async (dataType: string, data: any): Promise<boolean> => {
  if (!isSupabaseConfigured()) {
    console.log('Supabase 未配置，跳过云端同步');
    return false;
  }

  try {
    const appId = resolveAppIdForWrite();
    const { error } = await supabase
      .from('app_data')
      .upsert({ 
        app_id: appId, 
        data_type: dataType, 
        data: data,
        updated_at: new Date().toISOString()
      }, { onConflict: 'app_id,data_type' });
    
    if (error) {
      console.error('云端保存失败:', error);
      return false;
    }
    return true;
  } catch (e) {
    console.error('云端同步异常:', e);
    return false;
  }
};

export const loadFromCloud = async (dataType: string): Promise<any | null> => {
  if (!isSupabaseConfigured()) {
    console.log('Supabase 未配置，跳过云端加载');
    return null;
  }

  try {
    const appId = await resolveAppIdForRead(dataType);
    const { data, error } = await supabase
      .from('app_data')
      .select('data')
      .eq('app_id', appId)
      .eq('data_type', dataType)
      .single();
    
    if (error) {
      if (error.code === 'PGRST116') {
        return null;
      }
      console.error('云端加载失败:', error);
      return null;
    }
    return data?.data;
  } catch (e) {
    console.error('云端加载异常:', e);
    return null;
  }
};

/**
 * 旧版兼容：早期版本可能把联系人直接存进 contacts 表。
 * 当 app_data 没有 contacts 数据时，可用它来恢复/迁移。
 */
export const loadLegacyContactsTable = async (): Promise<any[]> => {
  if (!isSupabaseConfigured()) return [];
  try {
    const { data, error } = await supabase
      .from('contacts')
      .select('*')
      .order('added_at', { ascending: false });
    if (error) return [];
    return data || [];
  } catch {
    return [];
  }
};

export const getLastSyncTime = async (): Promise<string | null> => {
  if (!isSupabaseConfigured()) {
    return null;
  }

  try {
    const appId = await resolveAppIdForRead('contacts');
    const { data, error } = await supabase
      .from('app_data')
      .select('updated_at')
      .eq('app_id', appId)
      .eq('data_type', 'contacts')
      .single();
    
    if (error || !data) return null;
    return data.updated_at;
  } catch {
    return null;
  }
};
