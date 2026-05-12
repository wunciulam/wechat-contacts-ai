// 本地存储封装 - 适配 uni-app
const APP_ID_STORAGE_KEY = 'wechat_app_id';

export const storage = {
  // 获取存储的数据
  get<T>(key: string): T | null {
    try {
      const data = uni.getStorageSync(key);
      return data as T || null;
    } catch (e) {
      console.error('Storage get error:', e);
      return null;
    }
  },

  // 设置存储的数据
  set(key: string, value: any): boolean {
    try {
      uni.setStorageSync(key, value);
      return true;
    } catch (e) {
      console.error('Storage set error:', e);
      return false;
    }
  },

  // 移除存储的数据
  remove(key: string): boolean {
    try {
      uni.removeStorageSync(key);
      return true;
    } catch (e) {
      console.error('Storage remove error:', e);
      return false;
    }
  },

  // 清空所有存储
  clear(): boolean {
    try {
      uni.clearStorageSync();
      return true;
    } catch (e) {
      console.error('Storage clear error:', e);
      return false;
    }
  },

  // 获取 App ID
  getAppId(): string | null {
    return this.get<string>(APP_ID_STORAGE_KEY);
  },

  // 设置 App ID
  setAppId(appId: string): boolean {
    return this.set(APP_ID_STORAGE_KEY, appId);
  },

  // 生成 App ID
  generateAppId(): string {
    return `app_${Math.random().toString(36).slice(2, 17)}`;
  }
};

export default storage;
