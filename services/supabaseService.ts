
import { createClient } from '@supabase/supabase-js';

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL || '';
const supabaseKey = import.meta.env.VITE_SUPABASE_ANON_KEY || '';

export const supabase = createClient(supabaseUrl, supabaseKey);

export const isSupabaseConfigured = () => {
  return !!(supabaseUrl && supabaseKey);
};

export const getAppId = () => {
  let appId = localStorage.getItem('wechat_app_id');
  if (!appId) {
    appId = 'app_' + Math.random().toString(36).substr(2, 15);
    localStorage.setItem('wechat_app_id', appId);
  }
  return appId;
};

export const saveToCloud = async (dataType: string, data: any): Promise<boolean> => {
  if (!isSupabaseConfigured()) {
    console.log('Supabase 未配置，跳过云端同步');
    return false;
  }

  try {
    const appId = getAppId();
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
    const appId = getAppId();
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

export const getLastSyncTime = async (): Promise<string | null> => {
  if (!isSupabaseConfigured()) {
    return null;
  }

  try {
    const appId = getAppId();
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
