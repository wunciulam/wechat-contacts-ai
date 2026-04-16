
import { createClient } from '@supabase/supabase-js';

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL || '';
const supabaseKey = import.meta.env.VITE_SUPABASE_ANON_KEY || '';
const configuredAppId = import.meta.env.VITE_APP_ID || '';

const APP_ID_STORAGE_KEY = 'wechat_app_id';

console.log('🔧 Supabase 配置:', { 
  supabaseUrl: supabaseUrl ? supabaseUrl.substring(0, 30) + '...' : '未配置',
  supabaseKey: supabaseKey ? '已配置 (' + supabaseKey.length + ' 字符)' : '未配置',
  configuredAppId: configuredAppId || '未配置'
});

export const supabase = (supabaseUrl && supabaseKey) ? createClient(supabaseUrl, supabaseKey) : null as any;

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
    console.log('💾 正在保存到云端，appId:', appId, 'dataType:', dataType);
    
    // 先检查是否存在
    const { data: existing } = await supabase
      .from('app_data')
      .select('id')
      .eq('app_id', appId)
      .eq('data_type', dataType)
      .maybeSingle();
    
    let error;
    
    if (existing) {
      // 更新现有记录 - 这会触发 realtime
      const result = await supabase
        .from('app_data')
        .update({ 
          data: data,
          updated_at: new Date().toISOString()
        })
        .eq('app_id', appId)
        .eq('data_type', dataType)
        .select();
      error = result.error;
      console.log('📝 更新记录，影响行数:', result.data?.length || 0);
    } else {
      // 插入新记录 - 这会触发 realtime
      const result = await supabase
        .from('app_data')
        .insert({ 
          app_id: appId,
          data_type: dataType,
          data: data,
          updated_at: new Date().toISOString()
        })
        .select();
      error = result.error;
      console.log('📝 插入新记录，ID:', result.data?.[0]?.id);
    }
    
    if (error) {
      console.error('❌ 云端保存失败:', error);
      return false;
    }
    
    console.log('✅ 云端保存成功');
    return true;
  } catch (e) {
    console.error('❌ 云端同步异常:', e);
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

// 实时订阅回调类型
export type DataChangeCallback = (dataType: string, newData: any) => void;

// 存储所有活跃的 channel
const channels: Map<string, any> = new Map();
const callbacks: Set<DataChangeCallback> = new Set();
let isSubscribed = false;

/**
 * 订阅实时数据变化
 * 当云端数据变化时，自动通知所有订阅者
 */
export const subscribeToDataChanges = async (callback: DataChangeCallback): Promise<() => void> => {
  if (!isSupabaseConfigured()) {
    console.log('Supabase 未配置，无法订阅实时变化');
    return () => {};
  }

  callbacks.add(callback);

  // 如果还没有订阅，创建订阅
  if (!isSubscribed) {
    isSubscribed = true;
    
    // 异步获取 appId
    const appId = await resolveAppIdForRead('contacts');
    console.log('使用 appId 订阅实时变化:', appId);
    
    const channel = supabase
      .channel(`data-changes-${appId}`)
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'app_data',
          filter: `app_id=eq.${appId}`
        },
        (payload) => {
          console.log('📡 收到实时数据变化:', payload);
          const { new: newRow, eventType } = payload;
          if (newRow?.data_type && newRow?.data) {
            console.log('  └─ 数据类型:', newRow.data_type, '事件类型:', eventType);
            // 通知所有回调
            callbacks.forEach(cb => cb(newRow.data_type, newRow.data));
          }
        }
      )
      .subscribe((status) => {
        if (status === 'SUBSCRIBED') {
          console.log('✅ 已订阅实时数据变化');
        } else if (status === 'CHANNEL_ERROR') {
          console.error('❌ 订阅通道出错，尝试重新连接...');
          isSubscribed = false;
          channels.clear();
        } else {
          console.log('📡 订阅状态:', status);
        }
      });

    channels.set('main', channel);
  }

  // 返回取消订阅函数
  return () => {
    callbacks.delete(callback);
    if (callbacks.size === 0) {
      // 没有订阅者了，取消订阅
      channels.forEach((channel, key) => {
        supabase.removeChannel(channel);
        channels.delete(key);
      });
      isSubscribed = false;
    }
  };
};

/**
 * 手动触发数据刷新（用于写入数据后通知其他标签页）
 */
export const broadcastDataChange = (dataType: string, data: any) => {
  // 通知本地的所有回调
  callbacks.forEach(cb => cb(dataType, data));
  
  // 如果有 Supabase Realtime，它会自动广播给其他标签页
  // 这里不需要额外操作
};
