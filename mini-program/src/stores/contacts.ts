import { defineStore } from 'pinia';
import { ref, computed } from 'vue';
import { Contact, NewContact, Policy, ProgressRecord } from '../types';
import {
  loadContactsFromStorage,
  saveContactsToStorage,
  loadFromCloud,
  saveToCloud,
  subscribeToDataChanges,
  isSupabaseConfigured,
  loadLegacyContactsTable
} from '../services/supabaseService';

const CLOSED_CUSTOMER_TAG = '成交客户';

// 获取保单分类
const getPolicyCategory = (name: string): string | null => {
  if (!name) return null;
  const n = name;
  if (n.includes('重疾') || n.includes('重大疾病') || n.includes('癌') || n.includes('百病') || n.includes('恶性肿瘤')) return '重疾险';
  if (n.includes('年金') || n.includes('养老') || n.includes('退休') || n.includes('教育')) return '养老金';
  if (n.includes('医疗') || n.includes('住院') || n.includes('医保') || n.includes('门诊')) return '医疗险';
  if (n.includes('寿') || n.includes('增额') || n.includes('两全') || n.includes('储蓄') || n.includes('分红') || n.includes('万能')) return '储蓄险';
  if (n.includes('意外')) return '意外险';
  if (n.includes('车')) return '车险';
  return '其他保险';
};

// 自动应用标签
const applyAutoTags = (contact: Contact): Contact => {
  const newTagsSet = new Set(contact.tags);
  let changed = false;

  const hasPolicies = contact.policies && contact.policies.length > 0;
  if (hasPolicies && !newTagsSet.has(CLOSED_CUSTOMER_TAG)) {
    newTagsSet.add(CLOSED_CUSTOMER_TAG);
    changed = true;
  }

  if (changed) {
    return {
      ...contact,
      tags: Array.from(newTagsSet)
    };
  }
  return contact;
};

const generateId = () => Math.random().toString(36).substr(2, 9);

export const useContactsStore = defineStore('contacts', () => {
  // State
  const contacts = ref<Contact[]>([]);
  const isLoaded = ref(false);
  const selectedTags = ref<Set<string>>(new Set());
  const selectedContactIds = ref<Set<string>>(new Set());
  const followUpFilter = ref<'idle' | 'following' | 'contacted' | null>(null);

  // Getters
  const allTags = computed(() => {
    return Array.from(new Set(contacts.value.flatMap(c => c.tags))).sort();
  });

  const filteredContacts = computed(() => {
    return contacts.value.filter(contact => {
      // 标签筛选
      const matchesTag = selectedTags.value.size === 0 || contact.tags.some(tag => selectedTags.value.has(tag));
      // 跟进状态筛选
      const matchesStatus = followUpFilter.value === null || contact.followUpStatus === followUpFilter.value;
      return matchesTag && matchesStatus;
    });
  });

  const followingCount = computed(() => {
    return contacts.value.filter(c => c.followUpStatus === 'following').length;
  });

  const policyCount = computed(() => {
    return contacts.value.filter(c => c.policies && c.policies.length > 0).length;
  });

  const selectedCount = computed(() => selectedContactIds.value.size);

  // Actions
  const loadData = async () => {
    console.log('开始加载数据...');

    // 优先从云端加载
    if (isSupabaseConfigured()) {
      try {
        const cloudData = await loadFromCloud('contacts');
        if (cloudData && Array.isArray(cloudData) && cloudData.length > 0) {
          console.log('从云端加载成功，联系人数量:', cloudData.length);
          const migratedData = cloudData.map((c: Contact) => {
            const baseContact: Contact = {
              ...c,
              dealProducts: Array.isArray(c.dealProducts) ? c.dealProducts : (c.dealProducts ? [c.dealProducts] : []),
              intentProducts: Array.isArray(c.intentProducts) ? c.intentProducts : [],
              policies: c.policies || []
            };
            return applyAutoTags(baseContact);
          });
          contacts.value = migratedData;
          saveContactsToStorage(migratedData);
          isLoaded.value = true;
          return;
        }

        // 兼容旧版
        const legacyRows = await loadLegacyContactsTable();
        if (legacyRows && Array.isArray(legacyRows) && legacyRows.length > 0) {
          const migratedData = legacyRows.map((r: any) => {
            const baseContact: Contact = {
              id: String(r.id),
              wxid: r.wxid || '',
              nickname: r.nickname || '',
              remarkName: r.remark_name || r.remarkName || r.nickname || '',
              remarkInfo: r.remark_info || r.remarkInfo || '',
              tags: Array.isArray(r.tags) ? r.tags : [],
              avatarUrl: r.avatar_url || r.avatarUrl,
              addedAt: Number(r.added_at || r.addedAt || Date.now()),
              lastDate: r.last_date || r.lastDate,
              progressHistory: Array.isArray(r.progress_history) ? r.progress_history : (r.progressHistory || []),
              progress: r.progress || undefined,
              dealProducts: Array.isArray(r.deal_products) ? r.deal_products : (r.dealProducts ? (Array.isArray(r.dealProducts) ? r.dealProducts : [r.dealProducts]) : []),
              intentProducts: Array.isArray(r.intent_products) ? r.intent_products : (r.intentProducts || []),
              followUpStatus: r.follow_up_status || r.followUpStatus,
              policies: []
            };
            return applyAutoTags(baseContact);
          });
          contacts.value = migratedData;
          saveContactsToStorage(migratedData);
          await saveToCloud('contacts', migratedData);
          isLoaded.value = true;
          return;
        }
      } catch (e) {
        console.error('从云端加载失败:', e);
      }
    }

    // 从本地加载
    const localData = loadContactsFromStorage();
    if (localData.length > 0) {
      contacts.value = localData;
      isLoaded.value = true;
      // 同步到云端
      if (isSupabaseConfigured()) {
        await saveToCloud('contacts', localData);
      }
      return;
    }

    isLoaded.value = true;
  };

  const saveData = async () => {
    if (!isLoaded.value) return;

    saveContactsToStorage(contacts.value);

    if (isSupabaseConfigured()) {
      await saveToCloud('contacts', contacts.value);
    }
  };

  const addContact = (newContactData: NewContact) => {
    const tags = newContactData.tags && newContactData.tags.length > 0 ? newContactData.tags : ['潜在客户'];
    const contact: Contact = {
      ...newContactData,
      tags,
      id: generateId(),
      addedAt: Date.now(),
      followUpStatus: 'following',
      policies: newContactData.policies || [],
      dealProducts: newContactData.dealProducts || [],
      intentProducts: newContactData.intentProducts || []
    };
    contacts.value.unshift(applyAutoTags(contact));
    saveData();
  };

  const updateContact = (id: string, updates: Partial<Contact>) => {
    const index = contacts.value.findIndex(c => c.id === id);
    if (index !== -1) {
      const updated = { ...contacts.value[index], ...updates };
      contacts.value[index] = applyAutoTags(updated);
      saveData();
    }
  };

  const deleteContact = (id: string) => {
    contacts.value = contacts.value.filter(c => c.id !== id);
    selectedContactIds.value.delete(id);
    saveData();
  };

  const addPolicy = (contactId: string, policy: Policy) => {
    const index = contacts.value.findIndex(c => c.id === contactId);
    if (index !== -1) {
      const contact = contacts.value[index];
      const currentPolicies = [...(contact.policies || []), policy];
      const currentTags = new Set(contact.tags);
      const currentDealProducts = new Set(contact.dealProducts);

      const category = getPolicyCategory(policy.productName);
      if (category) currentTags.add(category);
      currentDealProducts.add(policy.productName);

      const updatedContact: Contact = {
        ...contact,
        policies: currentPolicies,
        tags: Array.from(currentTags),
        dealProducts: Array.from(currentDealProducts)
      };
      contacts.value[index] = applyAutoTags(updatedContact);
      saveData();
    }
  };

  const deletePolicy = (contactId: string, policyId: string) => {
    const index = contacts.value.findIndex(c => c.id === contactId);
    if (index !== -1) {
      const contact = contacts.value[index];
      const deletedPolicy = (contact.policies || []).find(p => p.id === policyId);
      const updatedPolicies = (contact.policies || []).filter(p => p.id !== policyId);

      const updatedDealProducts = deletedPolicy?.productName
        ? contact.dealProducts?.filter(product => {
            return updatedPolicies.some(p => p.productName === product);
          })
        : contact.dealProducts;

      const updatedContact: Contact = {
        ...contact,
        policies: updatedPolicies,
        dealProducts: updatedDealProducts || []
      };
      contacts.value[index] = applyAutoTags(updatedContact);
      saveData();
    }
  };

  const addProgress = (contactId: string, record: ProgressRecord) => {
    const index = contacts.value.findIndex(c => c.id === contactId);
    if (index !== -1) {
      const contact = contacts.value[index];
      const updatedHistory = [record, ...(contact.progressHistory || [])];
      contacts.value[index] = {
        ...contact,
        progressHistory: updatedHistory,
        lastDate: record.date,
        followUpStatus: 'following'
      };
      saveData();
    }
  };

  const updateProgress = (contactId: string, recordId: string, updates: Partial<ProgressRecord>) => {
    const index = contacts.value.findIndex(c => c.id === contactId);
    if (index !== -1) {
      const contact = contacts.value[index];
      const updatedHistory = (contact.progressHistory || []).map(r =>
        r.id === recordId ? { ...r, ...updates } : r
      );
      contacts.value[index] = { ...contact, progressHistory: updatedHistory };
      saveData();
    }
  };

  const deleteProgress = (contactId: string, recordId: string) => {
    const index = contacts.value.findIndex(c => c.id === contactId);
    if (index !== -1) {
      const contact = contacts.value[index];
      const updatedHistory = (contact.progressHistory || []).filter(p => p.id !== recordId);
      contacts.value[index] = { ...contact, progressHistory: updatedHistory };
      saveData();
    }
  };

  const toggleTag = (tag: string) => {
    if (selectedTags.value.has(tag)) {
      selectedTags.value.delete(tag);
    } else {
      selectedTags.value.add(tag);
    }
  };

  const clearTags = () => {
    selectedTags.value.clear();
  };

  const addTagToContact = (contactId: string, tag: string) => {
    const index = contacts.value.findIndex(c => c.id === contactId);
    if (index !== -1) {
      const contact = contacts.value[index];
      if (!contact.tags.includes(tag)) {
        contacts.value[index] = { ...contact, tags: [...contact.tags, tag] };
        saveData();
      }
    }
  };

  const removeTagFromContact = (contactId: string, tag: string) => {
    const index = contacts.value.findIndex(c => c.id === contactId);
    if (index !== -1) {
      const contact = contacts.value[index];
      contacts.value[index] = { ...contact, tags: contact.tags.filter(t => t !== tag) };
      saveData();
    }
  };

  const batchAddTags = (tagNames: string[]) => {
    selectedContactIds.value.forEach(contactId => {
      const index = contacts.value.findIndex(c => c.id === contactId);
      if (index !== -1) {
        const contact = contacts.value[index];
        const currentTags = new Set(contact.tags);
        tagNames.forEach(tag => currentTags.add(tag));
        contacts.value[index] = { ...contact, tags: Array.from(currentTags) };
      }
    });
    saveData();
    selectedContactIds.value.clear();
  };

  const batchRemoveTags = (tagNames: string[]) => {
    selectedContactIds.value.forEach(contactId => {
      const index = contacts.value.findIndex(c => c.id === contactId);
      if (index !== -1) {
        const contact = contacts.value[index];
        contacts.value[index] = {
          ...contact,
          tags: contact.tags.filter(t => !tagNames.includes(t))
        };
      }
    });
    saveData();
    selectedContactIds.value.clear();
  };

  const batchDeleteContacts = () => {
    contacts.value = contacts.value.filter(c => !selectedContactIds.value.has(c.id));
    selectedContactIds.value.clear();
    saveData();
  };

  const toggleSelectContact = (id: string) => {
    if (selectedContactIds.value.has(id)) {
      selectedContactIds.value.delete(id);
    } else {
      selectedContactIds.value.add(id);
    }
  };

  const selectAllContacts = () => {
    filteredContacts.value.forEach(c => selectedContactIds.value.add(c.id));
  };

  const deselectAllContacts = () => {
    selectedContactIds.value.clear();
  };

  const updateFollowUpStatus = (contactId: string, status: 'idle' | 'following' | 'contacted') => {
    const index = contacts.value.findIndex(c => c.id === contactId);
    if (index !== -1) {
      const updated = { ...contacts.value[index], followUpStatus: status };
      contacts.value[index] = applyAutoTags(updated);
      saveData();
    }
  };

  const batchUpdateStatus = (status: 'idle' | 'following' | 'contacted') => {
    selectedContactIds.value.forEach(contactId => {
      const index = contacts.value.findIndex(c => c.id === contactId);
      if (index !== -1) {
        const updated = { ...contacts.value[index], followUpStatus: status };
        contacts.value[index] = applyAutoTags(updated);
      }
    });
    saveData();
    selectedContactIds.value.clear();
  };

  const renameTag = (oldTag: string, newTag: string) => {
    contacts.value = contacts.value.map(contact => ({
      ...contact,
      tags: contact.tags.map(t => t === oldTag ? newTag : t)
    }));
    if (selectedTags.value.has(oldTag)) {
      selectedTags.value.delete(oldTag);
      selectedTags.value.add(newTag);
    }
    saveData();
  };

  const deleteTag = (tag: string) => {
    contacts.value = contacts.value.map(contact => ({
      ...contact,
      tags: contact.tags.filter(t => t !== tag)
    }));
    selectedTags.value.delete(tag);
    saveData();
  };

  return {
    contacts,
    isLoaded,
    selectedTags,
    selectedContactIds,
    followUpFilter,
    allTags,
    filteredContacts,
    followingCount,
    policyCount,
    selectedCount,
    loadData,
    saveData,
    addContact,
    updateContact,
    deleteContact,
    addPolicy,
    deletePolicy,
    addProgress,
    updateProgress,
    deleteProgress,
    toggleTag,
    clearTags,
    addTagToContact,
    removeTagFromContact,
    batchAddTags,
    batchRemoveTags,
    batchDeleteContacts,
    toggleSelectContact,
    selectAllContacts,
    deselectAllContacts,
    updateFollowUpStatus,
    batchUpdateStatus,
    renameTag,
    deleteTag
  };
});
