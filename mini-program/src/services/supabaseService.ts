import { createClient } from '@supabase/supabase-js';
import { Contact } from '../types';
import storage from './storage';

// 从环境变量或硬编码获取配置
const supabaseUrl = 'https://ulgqiixqaxxgodyowrep.supabase.co';
const supabaseKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InVsZ3FpaXhxYXh4Z29keW93cmVwIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzE3MTEwNDcsImV4cCI6MjA4NzI4NzA0N30.ZgxdR2MwwzBSzhXCkk0JPJdnijKr-qouxOG0aQ1S8Xg';

export const supabase = createClient(supabaseUrl, supabaseKey);

export const isSupabaseConfigured = () => {
  return !!(supabaseUrl && supabaseKey);
};

const resolveAppIdForWrite = (): string => {
  const stored = storage.getAppId();
  if (stored) return stored;
  const fresh = storage.generateAppId();
  storage.setAppId(fresh);
  return fresh;
};

const resolveAppIdForRead = async (dataType: string): Promise<string> => {
  const stored = storage.getAppId();
  if (stored) return stored;

  // 尝试从云端找回旧 app_id
  try {
    const { data, error } = await supabase
      .from('app_data')
      .select('app_id, updated_at')
      .eq('data_type', dataType)
      .order('updated_at', { ascending: false })
      .limit(1)
      .maybeSingle();

    if (!error && data?.app_id) {
      storage.setAppId(data.app_id);
      return data.app_id;
    }
  } catch {
    // ignore
  }

  const fresh = storage.generateAppId();
  storage.setAppId(fresh);
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
      // 更新现有记录
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
      // 插入新记录
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

// 旧版兼容
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

// 订阅实时数据变化
export const subscribeToDataChanges = async (callback: DataChangeCallback): Promise<() => void> => {
  if (!isSupabaseConfigured()) {
    console.log('Supabase 未配置，无法订阅实时变化');
    return () => {};
  }

  callbacks.add(callback);

  if (!isSubscribed) {
    isSubscribed = true;

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
            callbacks.forEach(cb => cb(newRow.data_type, newRow.data));
          }
        }
      )
      .subscribe((status) => {
        if (status === 'SUBSCRIBED') {
          console.log('✅ 已订阅实时数据变化');
        } else if (status === 'CHANNEL_ERROR') {
          console.error('❌ 订阅通道出错');
          isSubscribed = false;
          channels.clear();
        } else {
          console.log('📡 订阅状态:', status);
        }
      });

    channels.set('main', channel);
  }

  return () => {
    callbacks.delete(callback);
    if (callbacks.size === 0) {
      channels.forEach((channel, key) => {
        supabase.removeChannel(channel);
        channels.delete(key);
      });
      isSubscribed = false;
    }
  };
};

// 手动触发数据刷新
export const broadcastDataChange = (dataType: string, data: any) => {
  callbacks.forEach(cb => cb(dataType, data));
};

// 本地数据操作
export const CONTACTS_STORAGE_KEY = 'wechat-contacts';
export const CONTACTS_BACKUP_KEY = 'wechat-contacts-backup';

export const loadContactsFromStorage = (): Contact[] => {
  const data = storage.get<Contact[]>(CONTACTS_STORAGE_KEY);
  return data || [];
};

export const saveContactsToStorage = (contacts: Contact[]): boolean => {
  const result = storage.set(CONTACTS_STORAGE_KEY, contacts);
  storage.set(CONTACTS_BACKUP_KEY, contacts);
  return result;
};
