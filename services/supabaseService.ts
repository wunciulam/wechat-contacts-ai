
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
          const { eventType } = payload;
          const newRow = payload.new as {data_type?:string;data?:any};
          if (newRow && "data_type" in newRow && "data" in newRow && newRow.data_type && newRow.data) {
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

export interface ContactImportSnapshot {
  id: string;
  appId: string;
  revision: string;
  contacts: import('../types').Contact[];
  localVersion: string;
  renewalRevision: string | null;
  renewalData: import('./renewal').RenewalData;
}

export const readContactImportSnapshot = async (): Promise<Omit<ContactImportSnapshot, 'localVersion'>> => {
  const appId = configuredAppId || getStoredAppId();
  if (!appId) throw new Error('尚未确定当前数据空间，请先加载客户数据。');
  const {data,error}=await supabase.from('app_data').select('id,app_id,data_type,data,updated_at')
    .eq('app_id',appId).in('data_type',['contacts','renewal_v1']);
  const contacts=data?.find(row=>row.data_type==='contacts'),renewal=data?.find(row=>row.data_type==='renewal_v1');
  if(error||!contacts||!Array.isArray(contacts.data))throw new Error('无法读取当前云端客户，请检查网络后重试。');
  return {id:contacts.id,appId:contacts.app_id,revision:contacts.updated_at,contacts:contacts.data,
    renewalRevision:renewal?.updated_at||null,renewalData:renewal?.data||{policies:[],imports:[],settings:{email:'',time:'09:00',enabled:false}}};
};

export const commitContactImport = async (snapshot: ContactImportSnapshot, contacts: import('../types').Contact[], renewalData: import('./renewal').RenewalData): Promise<void> => {
  const appId=configuredAppId||getStoredAppId();
  if(!appId||snapshot.appId!==appId)throw new Error('数据空间已变化，请重新预览导入。');
  const {error}=await supabase.rpc('commit_mingya_import_v2',{
    p_app_id:appId,p_contact_id:snapshot.id,p_contact_revision:snapshot.revision,
    p_renewal_revision:snapshot.renewalRevision,p_contacts:contacts,p_renewal:renewalData
  });
  if(error?.code==='PT409')throw new Error('客户或续期记录已变化，请重新预览后导入。');
  if(error)throw new Error('导入未保存，请检查网络后重试。');
};

export const archiveMingyaCapture = async (snapshot: ContactImportSnapshot, payload: unknown): Promise<string> => {
  const appId = configuredAppId || getStoredAppId();
  if (!appId || appId !== snapshot.appId) throw new Error('数据空间已变化，请重新预览导入。');
  const raw=new TextEncoder().encode(JSON.stringify(payload));
  const digest=await crypto.subtle.digest('SHA-256',raw);
  const hash=Array.from(new Uint8Array(digest),b=>b.toString(16).padStart(2,'0')).join('');
  const compressed=new Uint8Array(await new Response(new Blob([raw]).stream().pipeThrough(new CompressionStream('gzip'))).arrayBuffer());
  let binary='';for(let i=0;i<compressed.length;i+=32768)binary+=String.fromCharCode(...compressed.subarray(i,i+32768));
  const {error}=await supabase.from('app_data').upsert([
    {app_id:snapshot.appId,data_type:`mingya_capture:${hash}`,data:{encoding:'gzip-base64',content:btoa(binary),sha256:hash},updated_at:new Date().toISOString()},
    {app_id:snapshot.appId,data_type:`contacts_backup:mingya:${hash}:${snapshot.revision}`,data:snapshot.contacts,updated_at:new Date().toISOString()},
    {app_id:snapshot.appId,data_type:`renewal_backup:mingya:${hash}:${snapshot.renewalRevision||'new'}`,data:snapshot.renewalData,updated_at:new Date().toISOString()}
  ],{onConflict:'app_id,data_type'});
  if(error)throw new Error('原始采集信息和导入前备份未保存成功，本次未修改客户。');
  return hash;
};

export const downloadMingyaCapture = async (hash: string): Promise<unknown> => {
  if(!/^[a-f0-9]{64}$/.test(hash))throw new Error('原始信息标识无效。');
  const appId=configuredAppId||getStoredAppId();if(!appId)throw new Error('数据空间未加载。');
  const {data,error}=await supabase.from('app_data').select('data').eq('app_id',appId).eq('data_type',`mingya_capture:${hash}`).single();
  if(error||data?.data?.encoding!=='gzip-base64')throw new Error('无法读取原始采集信息，请检查网络后重试。');
  const bytes=Uint8Array.from(atob(data.data.content),c=>c.charCodeAt(0));
  const raw=await new Response(new Blob([bytes]).stream().pipeThrough(new DecompressionStream('gzip'))).arrayBuffer();
  const digest=await crypto.subtle.digest('SHA-256',raw);
  if(Array.from(new Uint8Array(digest),b=>b.toString(16).padStart(2,'0')).join('')!==hash)throw new Error('原始信息校验失败。');
  return JSON.parse(new TextDecoder().decode(raw));
};
