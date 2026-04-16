import React, { useState, useEffect } from 'react';
import Sidebar from './components/Sidebar';
import { Menu, Users, ClipboardList, FileText, Cloud, CloudOff } from 'lucide-react';
import { ContactList } from './components/ContactList';
import FollowUpDashboard from './components/FollowUpDashboard';
import PolicyDashboard from './components/PolicyDashboard'; // New Component
import ImportModal from './components/ImportModal';
import BatchTagModal from './components/BatchTagModal';
import ConfirmModal from './components/ConfirmModal';
import QuickFollowUpModal from './components/QuickFollowUpModal';
import ManualPolicyModal from './components/ManualPolicyModal';
import CategoryBoard from './components/CategoryBoard';
import CategoryManager from './components/CategoryManager';
import { Contact, NewContact, ProgressRecord, ExtractedTableData, Policy, Category } from './types';
import { saveToCloud, loadFromCloud, isSupabaseConfigured, loadLegacyContactsTable, subscribeToDataChanges, broadcastDataChange } from './services/supabaseService';

const CATEGORIES_STORAGE_KEY = 'wechat-categories';

// 默认类目
const DEFAULT_CATEGORIES: Category[] = [
  { id: 'cat_default_1', name: '潜在客户', color: '#F59E0B', icon: 'UserPlus', order: 0, createdAt: Date.now(), updatedAt: Date.now() },
  { id: 'cat_default_2', name: '重点跟进', color: '#EF4444', icon: 'Star', order: 1, createdAt: Date.now(), updatedAt: Date.now() },
  { id: 'cat_default_3', name: '已成交', color: '#10B981', icon: 'CheckCircle', order: 2, createdAt: Date.now(), updatedAt: Date.now() },
];

const FOLLOW_UP_TAG = '跟进中';
const CONTACTED_TAG = '沟通过';
const CLOSED_CUSTOMER_TAG = '成交客户';

// Helper function to categorize policies based on product name
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

/**
 * Helper to automatically apply tags based on business rules:
 * Only auto-apply "成交客户" tag for contacts with policies.
 * Other tags are managed manually by users.
 */
const applyAutoTags = (contact: Contact): Contact => {
  let newTagsSet = new Set(contact.tags);
  let changed = false;
  
  // Only auto-apply "成交客户" tag for policy records
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

const App: React.FC = () => {
  const [contacts, setContacts] = useState<Contact[]>([]);
  const [selectedTags, setSelectedTags] = useState<Set<string>>(new Set());
  const [isLoaded, setIsLoaded] = useState(false);
  const [currentView, setCurrentView] = useState<'contacts' | 'followups' | 'policies'>('contacts');
  const [isMobileSidebarOpen, setIsMobileSidebarOpen] = useState(false);
  
  // 跟进状态筛选
  const [followUpFilter, setFollowUpFilter] = useState<'idle' | 'following' | 'contacted' | null>(null);

  // 类目状态
  const [categories, setCategories] = useState<Category[]>([]);
  const [categoryFilter, setCategoryFilter] = useState<string | null>(null);
  const [isCategoryManagerOpen, setIsCategoryManagerOpen] = useState(false);
  
  // Modals
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingContact, setEditingContact] = useState<Contact | null>(null);
  
  // Quick Follow Up Modal
  const [isQuickFollowUpOpen, setIsQuickFollowUpOpen] = useState(false);
  const [quickFollowUpContactId, setQuickFollowUpContactId] = useState<string | undefined>(undefined);
  const [editingRecord, setEditingRecord] = useState<{contactId: string, record: ProgressRecord} | null>(null);

  // Manual Policy Modal
  const [isManualPolicyOpen, setIsManualPolicyOpen] = useState(false);

  // Selection & Batch Ops
  const [selectedContactIds, setSelectedContactIds] = useState<Set<string>>(new Set());
  const [batchModalState, setBatchModalState] = useState<{
    isOpen: boolean;
    mode: 'add' | 'remove';
  }>({ isOpen: false, mode: 'add' });

  // Confirmation Modal State
  const [confirmModal, setConfirmModal] = useState<{
    isOpen: boolean;
    title: string;
    message: string;
    onConfirm: () => void;
    onCancel: () => void;
    isDestructive?: boolean;
  }>({ isOpen: false, title: '', message: '', onConfirm: () => {}, onCancel: () => {} });

  // Debug: capture runtime style system + navigation state
  useEffect(() => {
    try {
      const rootStyles = getComputedStyle(document.documentElement);
      const bodyStyles = getComputedStyle(document.body);
      const primary600 = rootStyles.getPropertyValue('--color-primary-600')?.trim();
      const bodyBg = bodyStyles.backgroundColor;

      // Detect whether .btn/.btn-primary rules are actually active
      const probe = document.createElement('button');
      probe.className = 'btn btn-primary';
      probe.style.position = 'absolute';
      probe.style.left = '-9999px';
      probe.textContent = 'probe';
      document.body.appendChild(probe);
      const probeStyles = getComputedStyle(probe);
      const probeBg = probeStyles.backgroundColor;
      const probeMinH = probeStyles.minHeight;
      probe.remove();

      console.log('Style system check:', { origin: window.location.origin, bodyBg, primary600, probeBg, probeMinH });
    } catch (e) {
      console.error('Style system check failed:', e);
    }
  }, []);

  useEffect(() => {
    console.log('Navigation state:', { currentView, selectedTagsCount: selectedTags.size, contactsCount: contacts.length, selectedContactIdsCount: selectedContactIds.size, isLoaded });
  }, [currentView, selectedTags, contacts.length, selectedContactIds, isLoaded]);

  // 1. Load Data - 优先从云端加载
  useEffect(() => {
    const loadData = async () => {
      console.log('Supabase配置状态:', isSupabaseConfigured());
      
      // 优先从云端加载
      if (isSupabaseConfigured()) {
        try {
          console.log('正在从云端加载数据...');
          const cloudData = await loadFromCloud('contacts');
          if (cloudData && Array.isArray(cloudData) && cloudData.length > 0) {
            console.log('从云端加载成功，联系人数量:', cloudData.length);
            const migratedData = cloudData.map(c => {
              const baseContact: Contact = {
                ...c,
                dealProducts: Array.isArray(c.dealProducts) ? c.dealProducts : (c.dealProducts ? [c.dealProducts] : []),
                intentProducts: Array.isArray(c.intentProducts) ? c.intentProducts : [],
                policies: c.policies || []
              };
              return applyAutoTags(baseContact);
            });
            setContacts(migratedData);
            localStorage.setItem('wechat-contacts', JSON.stringify(migratedData));
            localStorage.setItem('wechat-contacts-backup', JSON.stringify(migratedData));
            setIsLoaded(true);
            console.log('从云端加载成功，联系人数量:', cloudData.length);
            return;
          } else {
            console.log('云端没有数据');
          }

          // 兼容旧版：如果 app_data 没数据，尝试从 contacts 表恢复
          console.log('尝试从旧版 contacts 表恢复...');
          const legacyRows = await loadLegacyContactsTable();
          if (legacyRows && Array.isArray(legacyRows) && legacyRows.length > 0) {
            const migratedData = legacyRows.map((r: any) => {
              const baseContact: Contact = {
                id: String(r.id),
                wxid: r.wxid || '',
                nickname: r.nickname || '',
                remarkName: r.remark_name || r.remarkName || r.nickname || '',
                remarkInfo: r.remark_info || r.remarkInfo || '',
                tags: Array.isArray(r.tags) ? r.tags : (r.tags ? (Array.isArray(r.tags) ? r.tags : []) : []),
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

            console.log('旧版 contacts 表恢复成功，联系人数量:', migratedData.length);
            setContacts(migratedData);
            localStorage.setItem('wechat-contacts', JSON.stringify(migratedData));
            localStorage.setItem('wechat-contacts-backup', JSON.stringify(migratedData));

            // 写回新同步表，避免下次再丢
            await saveToCloud('contacts', migratedData);
            setIsLoaded(true);
            console.log('旧版 contacts 表恢复成功，联系人数量:', migratedData.length);
            return;
          } else {
            console.log('旧版 contacts 表也没有数据');
          }
        } catch (e) {
          console.error('从云端加载失败:', e);
        }
      }

      // 云端没有数据，从本地存储加载
      const saved = localStorage.getItem('wechat-contacts');
      if (saved) {
        try {
          const parsedData = JSON.parse(saved);
          if (Array.isArray(parsedData) && parsedData.length > 0) {
            console.log('从本地存储加载，联系人数量:', parsedData.length);
            const migratedData = parsedData.map(c => {
              const baseContact: Contact = {
                ...c,
                dealProducts: Array.isArray(c.dealProducts) ? c.dealProducts : (c.dealProducts ? [c.dealProducts] : []),
                intentProducts: Array.isArray(c.intentProducts) ? c.intentProducts : [],
                policies: c.policies || []
              };
              return applyAutoTags(baseContact);
            });
            setContacts(migratedData);
            
            // 同步到云端备份
            if (isSupabaseConfigured() && migratedData.length > 0) {
              console.log('正在同步到云端...');
              await saveToCloud('contacts', migratedData);
            }
            setIsLoaded(true);
            console.log('从本地存储加载，联系人数量:', parsedData.length);
            return;
          }
        } catch (e) {
          console.error('本地数据解析失败:', e);
        }
      }

      // 尝试从备份恢复
      const backup = localStorage.getItem('wechat-contacts-backup');
      if (backup) {
        try {
          const parsedData = JSON.parse(backup);
          if (Array.isArray(parsedData) && parsedData.length > 0) {
            console.log('从备份恢复数据...');
            setContacts(parsedData);
            localStorage.setItem('wechat-contacts', JSON.stringify(parsedData));
            setIsLoaded(true);
            console.log('从备份恢复数据...');
            return;
          }
        } catch (e) {
          console.error('备份恢复失败:', e);
        }
      }

      setIsLoaded(true);
      console.log('没有找到任何数据');
    };

    loadData();
  }, []);

  // 2. Save Data - 强制保存到云端
  useEffect(() => {
    if (isLoaded && contacts.length > 0) {
      // 保存到本地
      localStorage.setItem('wechat-contacts', JSON.stringify(contacts));
      localStorage.setItem('wechat-contacts-backup', JSON.stringify(contacts));
      
      // 强制保存到云端
      if (isSupabaseConfigured()) {
        console.log('正在强制保存到云端，联系人数量:', contacts.length);
        saveToCloud('contacts', contacts).then(success => {
          console.log('云端保存结果:', success ? '成功' : '失败');
        }).catch(e => console.log('云端同步失败:', e));
      }
    }
  }, [contacts, isLoaded]);

  // 3. 订阅实时数据变化（暂时禁用，调试用）
  useEffect(() => {
    // console.log('⏸️ 实时订阅已禁用');
    return () => {};
  }, []);

  // 4. 加载类目数据 - 从云端同步
  useEffect(() => {
    const loadCategories = async () => {
      // 优先从云端加载
      if (isSupabaseConfigured()) {
        try {
          const cloudCategories = await loadFromCloud('categories');
          if (cloudCategories && Array.isArray(cloudCategories) && cloudCategories.length > 0) {
            console.log('从云端加载类目数据，数量:', cloudCategories.length);
            setCategories(cloudCategories);
            // 同步到本地
            localStorage.setItem(CATEGORIES_STORAGE_KEY, JSON.stringify(cloudCategories));
            return;
          }
        } catch (e) {
          console.error('从云端加载类目失败:', e);
        }
      }

      // 云端没有数据，从本地存储加载
      const saved = localStorage.getItem(CATEGORIES_STORAGE_KEY);
      if (saved) {
        try {
          const parsed = JSON.parse(saved);
          if (Array.isArray(parsed) && parsed.length > 0) {
            console.log('从本地存储加载类目数据，数量:', parsed.length);
            setCategories(parsed);
            return;
          }
        } catch (e) {
          console.error('类目数据解析失败:', e);
        }
      }
      
      // 使用默认值
      console.log('使用默认类目');
      setCategories(DEFAULT_CATEGORIES);
    };
    loadCategories();
  }, []);

  // 5. 保存类目数据 - 同步到云端
  useEffect(() => {
    if (categories.length > 0) {
      localStorage.setItem(CATEGORIES_STORAGE_KEY, JSON.stringify(categories));
      
      // 同步到云端
      if (isSupabaseConfigured()) {
        console.log('正在保存类目到云端，数量:', categories.length);
        saveToCloud('categories', categories).catch(e => {
          console.error('保存类目到云端失败:', e);
        });
      }
    }
  }, [categories]);

  // Derived State
  const allTags = Array.from(new Set(contacts.flatMap(c => c.tags))).sort();

  // --- Actions ---

  const handleToggleTag = (tag: string | null) => {
    if (tag === null) {
      setSelectedTags(new Set());
      return;
    }
    
    setSelectedTags(prev => {
      const newSet = new Set(prev);
      if (newSet.has(tag)) {
        newSet.delete(tag);
      } else {
        newSet.add(tag);
      }
      return newSet;
    });
  };

  const handleToggleAllTags = (select: boolean) => {
    if (select) {
      setSelectedTags(new Set(allTags));
    } else {
      setSelectedTags(new Set());
    }
  };

  const handleSaveContact = (newContactDataArray: NewContact[]) => {
    if (editingContact && newContactDataArray.length === 1) {
      const newContactData = newContactDataArray[0];
      setContacts(prev => prev.map(c => {
        if (c.id === editingContact.id) {
            const updated = { ...c, ...newContactData };
            return applyAutoTags(updated);
        }
        return c;
      }));
      setEditingContact(null);
    } else {
      const newContacts: Contact[] = newContactDataArray.map(data => {
        // 手动录入新客户时，如果没有其他标签，自动添加"潜在客户"
        const tags = data.tags && data.tags.length > 0 ? data.tags : ['潜在客户'];
        const c: Contact = {
          ...data,
          tags,
          id: generateId(),
          addedAt: Date.now(),
          followUpStatus: 'following',
          policies: data.policies || []
        };
        return applyAutoTags(c);
      });
      setContacts(prev => [...newContacts, ...prev]);
    }
  };

  const handleManualAddPolicy = (contactId: string, policy: Policy) => {
    setContacts(prev => prev.map(c => {
        if (c.id === contactId) {
            const currentPolicies = [...(c.policies || []), policy];
            const currentTags = new Set(c.tags);
            const currentDealProducts = new Set(c.dealProducts);

            // Auto-tagging based on category
            const category = getPolicyCategory(policy.productName);
            if (category) currentTags.add(category);
            currentDealProducts.add(policy.productName);

            const updatedContact: Contact = {
                ...c,
                policies: currentPolicies,
                tags: Array.from(currentTags),
                dealProducts: Array.from(currentDealProducts)
            };
            
            return applyAutoTags(updatedContact);
        }
        return c;
    }));
  };
  
  const handleDeletePolicy = (contactId: string, policyId: string) => {
    setContacts(prev => prev.map(c => {
        if (c.id === contactId) {
            const deletedPolicy = (c.policies || []).find(p => p.id === policyId);
            const updatedPolicies = (c.policies || []).filter(p => p.id !== policyId);
            
            // 同步更新 dealProducts - 检查删除的保单产品是否还有其他保单在使用
            const updatedDealProducts = deletedPolicy?.productName 
                ? c.dealProducts?.filter(product => {
                    // 如果还有其他保单使用这个产品名称，保留它
                    return updatedPolicies.some(p => p.productName === product);
                  })
                : c.dealProducts;
            
            const updatedContact: Contact = {
                ...c,
                policies: updatedPolicies,
                dealProducts: updatedDealProducts || []
            };
            return applyAutoTags(updatedContact);
        }
        return c;
    }));
  };
  
  const handleTableDataSave = (data: ExtractedTableData) => {
      let updatedContacts = [...contacts];
      let newContactsCount = 0;
      let updatedContactsCount = 0;
      let newPoliciesCount = 0;

      const processCustomerItem = (item: any) => {
          if (!item.customerName && !item.idCard) return;

          // 按证件号优先匹配，其次手机号，最后姓名
          const existingIndex = updatedContacts.findIndex(c => 
              (item.idCard && c.idCard === item.idCard) ||
              (item.phoneNumber && c.phoneNumber === item.phoneNumber) ||
              (item.customerName && (c.remarkName === item.customerName || c.nickname === item.customerName))
          );

          if (existingIndex >= 0) {
              // 存在则增量更新（保留已有数据，仅补充空字段）
              const existing = updatedContacts[existingIndex];
              updatedContacts[existingIndex] = {
                  ...existing,
                  phoneNumber: item.phoneNumber || existing.phoneNumber,
                  idCard: item.idCard || existing.idCard,
                  address: item.address || existing.address,
                  bankAccount: item.bankAccount || existing.bankAccount,
              };
              if (item.phoneNumber || item.idCard) {
                  updatedContactsCount++;
              }
          } else {
              // 不存在则新增
              updatedContacts.push({
                  id: generateId(),
                  wxid: '',
                  nickname: item.customerName || '',
                  remarkName: item.customerName || '未知客户',
                  remarkInfo: 'Excel表格导入客户',
                  tags: ['表格导入'],
                  addedAt: Date.now(),
                  dealProducts: [],
                  intentProducts: [],
                  policies: [],
                  phoneNumber: item.phoneNumber || '',
                  idCard: item.idCard || '',
                  address: item.address || '',
                  bankAccount: item.bankAccount || ''
              });
              newContactsCount++;
          }
      };

      const processPolicyItem = (item: any) => {
          if (!item.policyNumber && !item.applicantName) return;
           
          // 按证件号或手机号匹配客户
          let ownerIndex = updatedContacts.findIndex(c => 
               (item.phoneNumber && c.phoneNumber === item.phoneNumber) ||
               (c.idCard && item.idCard && c.idCard === item.idCard) ||
               (c.remarkName === item.applicantName || c.nickname === item.applicantName)
          );

          const newPolicy: Policy = {
               id: generateId(),
               policyNumber: String(item.policyNumber || ''),
               productName: String(item.productName || '未知产品'),
               company: String(item.company || ''),
               premium: String(item.premium || '0'),
               effectiveDate: String(item.effectiveDate || ''),
               status: String(item.status || '有效'),
               applicant: String(item.applicantName || ''),
               insured: String(item.insuredName || ''),
               paymentYears: String(item.paymentYears || ''),
               insuranceType: String(item.insuranceType || ''),
               coverage: String(item.coverage || '')
          };

          if (ownerIndex >= 0) {
               const contact = updatedContacts[ownerIndex];
               const policies = contact.policies || [];
               // 按保单号去重
               const policyExists = policies.some(p => p.policyNumber === newPolicy.policyNumber);
               
               const currentTags = new Set(contact.tags);
               const currentDealProducts = new Set(contact.dealProducts);
               
               if (newPolicy.productName && newPolicy.productName !== '未知产品') {
                   const category = getPolicyCategory(newPolicy.productName);
                   if (category) currentTags.add(category);
                   currentDealProducts.add(newPolicy.productName);
               }

               if (!policyExists && newPolicy.policyNumber) {
                   updatedContacts[ownerIndex] = {
                       ...contact,
                       policies: [...policies, newPolicy],
                       tags: Array.from(currentTags),
                       dealProducts: Array.from(currentDealProducts)
                   };
                   newPoliciesCount++;
               } else if (!policyExists && !newPolicy.policyNumber) {
                   // 无保单号但有关联客户，也添加
                   updatedContacts[ownerIndex] = {
                       ...contact,
                       policies: [...policies, newPolicy],
                       tags: Array.from(currentTags),
                       dealProducts: Array.from(currentDealProducts)
                   };
                   newPoliciesCount++;
               }
          } else {
               // 未找到对应客户，创建新客户+保单
               const category = getPolicyCategory(item.productName);
                const newTags = [CLOSED_CUSTOMER_TAG];
               if (category) newTags.push(category);

                updatedContacts.push({
                    id: generateId(),
                    wxid: '',
                    nickname: item.applicantName || '未知投保人',
                    remarkName: item.applicantName || '未知投保人',
                    remarkInfo: 'Excel表格导入-保单自动创建',
                    tags: newTags,
                    addedAt: Date.now(),
                    dealProducts: item.productName && item.productName !== '未知产品' ? [item.productName] : [],
                    intentProducts: [],
                    policies: [newPolicy],
                    phoneNumber: item.phoneNumber || '',
                    idCard: item.idCard || ''
                });
               newContactsCount++;
               newPoliciesCount++;
           }
      };

      if (data.type === 'customer') {
          data.items.forEach(processCustomerItem);
      } else if (data.type === 'policy') {
          data.items.forEach(processPolicyItem);
      } else if (data.type === 'mixed') {
          data.items.forEach(item => {
              if (item._rowType === 'customer') {
                  processCustomerItem(item);
              } else if (item._rowType === 'policy') {
                  processPolicyItem(item);
              } else {
                  if (item.policyNumber) {
                      processPolicyItem(item);
                  } else if (item.customerName) {
                      processCustomerItem(item);
                  }
              }
          });
      }

      setContacts(updatedContacts.map(applyAutoTags));
      alert(`导入完成！\n新增联系人: ${newContactsCount}\n更新联系人: ${updatedContactsCount}\n新增保单: ${newPoliciesCount}`);
  };

  const handleQuickAddProgress = (
    contactId: string | null, 
    date: string, 
    content: string, 
    newStatus: 'following' | 'contacted',
    newContactName?: string,
    existingRecordId?: string,
    completed?: boolean
  ) => {
    if (contactId) {
      setContacts(prev => prev.map(c => {
        if (c.id === contactId) {
           let updatedHistory;
           if (existingRecordId) {
              // 编辑现有记录：保持当前状态不变
              updatedHistory = (c.progressHistory || []).map(r => 
                 r.id === existingRecordId ? { ...r, date, content, completed: completed ?? r.completed } : r
              );
              const updated = {
                ...c,
                progressHistory: updatedHistory,
                lastDate: date
              };
              return updated;
           } else {
              // 添加新记录：自动设为跟进中
              const newRecord: ProgressRecord = {
                id: generateId(),
                date: date,
                content: content,
                completed: completed ?? false
              };
              updatedHistory = [newRecord, ...(c.progressHistory || [])];
              const updated = {
                ...c,
                progressHistory: updatedHistory,
                lastDate: date,
                followUpStatus: 'following'  // 自动设为跟进中
              };
              return updated;
           }
        }
        return c;
      }));
    } else if (newContactName) {
      // 创建新联系人并添加跟进记录
      const newRecord: ProgressRecord = {
         id: generateId(),
         date: date,
         content: content,
         completed: completed ?? false
      };
      const newContact: Contact = {
        id: generateId(),
        addedAt: Date.now(),
        wxid: '',
        nickname: newContactName,
        remarkName: newContactName,
        remarkInfo: '快速创建',
        tags: [],
        dealProducts: [],
        intentProducts: [],
        progressHistory: [newRecord],
        lastDate: date,
        followUpStatus: 'following',  // 自动设为跟进中
        policies: []
      };
      setContacts(prev => [newContact, ...prev]);
    }
  };

  const handleToggleProgress = (contactId: string, progressId: string) => {
      setContacts(prev => prev.map(c => {
          if (c.id === contactId) {
              const updatedHistory = (c.progressHistory || []).map(p => 
                  p.id === progressId ? { ...p, completed: !p.completed } : p
              );
              return { ...c, progressHistory: updatedHistory };
          }
          return c;
      }));
  };

  const handleDeleteProgress = (contactId: string, progressId: string) => {
      setContacts(prev => prev.map(c => {
          if (c.id === contactId) {
              const newProgressHistory = c.progressHistory?.filter(p => p.id !== progressId);
              const hasRemainingRecords = (newProgressHistory && newProgressHistory.length > 0) || c.progress;
              const updatedContact = {
                  ...c,
                  progressHistory: newProgressHistory
              };
              return applyAutoTags(updatedContact);
          }
          return c;
      }));
  };

  const handleDeleteContact = (id: string) => {
    setConfirmModal({
      isOpen: true,
      title: '删除联系人',
      message: '确定要删除这位联系人吗？此操作无法撤销。',
      isDestructive: true,
      onConfirm: () => {
        const updatedContacts = contacts.filter(c => c.id !== id);
        setContacts(updatedContacts);
        localStorage.setItem('wechat-contacts', JSON.stringify(updatedContacts));
        localStorage.setItem('wechat-contacts-backup', JSON.stringify(updatedContacts));
        if (isSupabaseConfigured() && updatedContacts.length > 0) {
          saveToCloud('contacts', updatedContacts);
        }
        if (selectedContactIds.has(id)) {
            const newSet = new Set(selectedContactIds);
            newSet.delete(id);
            setSelectedContactIds(newSet);
        }
        setConfirmModal(prev => ({ ...prev, isOpen: false }));
      },
      onCancel: () => setConfirmModal(prev => ({ ...prev, isOpen: false }))
    });
  };

  const handleRenameTag = (oldTag: string, newTag: string) => {
    setContacts(prev => prev.map(contact => ({
      ...contact,
      tags: contact.tags.map(t => t === oldTag ? newTag : t)
    })));
    if (selectedTags.has(oldTag)) {
       const newSet = new Set(selectedTags);
       newSet.delete(oldTag);
       newSet.add(newTag);
       setSelectedTags(newSet);
    }
  };

  const handleDeleteTag = (tagToDelete: string) => {
    setConfirmModal({
      isOpen: true,
      title: '删除标签',
      message: `确定要删除标签 "${tagToDelete}" 吗？此操作将从所有联系人中移除该标签。`,
      isDestructive: true,
      onConfirm: () => {
        setContacts(prev => prev.map(contact => ({
          ...contact,
          tags: contact.tags.filter(t => t !== tagToDelete)
        })));
        if (selectedTags.has(tagToDelete)) {
            const newSet = new Set(selectedTags);
            newSet.delete(tagToDelete);
            setSelectedTags(newSet);
        }
        setConfirmModal(prev => ({ ...prev, isOpen: false }));
      },
      onCancel: () => setConfirmModal(prev => ({ ...prev, isOpen: false }))
    });
  };

  const handleBatchDeleteTags = (tagsToDelete: string[]) => {
    setConfirmModal({
      isOpen: true,
      title: '批量删除标签',
      message: `确定要删除选中的 ${tagsToDelete.length} 个标签吗？此操作将从所有联系人中移除这些标签。`,
      isDestructive: true,
      onConfirm: () => {
        const tagsSet = new Set(tagsToDelete);
        setContacts(prev => prev.map(contact => ({
          ...contact,
          tags: contact.tags.filter(t => !tagsSet.has(t))
        })));
        
        setSelectedTags(prev => {
            const newSet = new Set(prev);
            tagsToDelete.forEach(t => newSet.delete(t));
            return newSet;
        });

        setConfirmModal(prev => ({ ...prev, isOpen: false }));
      },
      onCancel: () => setConfirmModal(prev => ({ ...prev, isOpen: false }))
    });
  };

  const handleRemoveTagFromContact = (contactId: string, tag: string) => {
      setContacts(prev => prev.map(c => 
          c.id === contactId ? { ...c, tags: c.tags.filter(t => t !== tag) } : c
      ));
  };

  const handleToggleSelect = (id: string) => {
    setSelectedContactIds(prev => {
      const newSet = new Set(prev);
      if (newSet.has(id)) {
        newSet.delete(id);
      } else {
        newSet.add(id);
      }
      return newSet;
    });
  };

  const handleSelectAll = (ids: string[]) => {
    setSelectedContactIds(new Set(ids));
  };

  const handleDeselectAll = () => {
    setSelectedContactIds(new Set());
  };

  const handleBatchConfirm = (tags: string[]) => {
    setContacts(prev => prev.map(contact => {
      if (selectedContactIds.has(contact.id)) {
        const currentTags = new Set(contact.tags);
        if (batchModalState.mode === 'add') {
          tags.forEach(t => currentTags.add(t));
        } else {
          tags.forEach(t => currentTags.delete(t));
        }
        return { ...contact, tags: Array.from(currentTags) };
      }
      return contact;
    }));
    handleDeselectAll();
  };

  const handleBatchDelete = () => {
      setConfirmModal({
         isOpen: true,
         title: '批量删除',
         message: `确定要删除选中的 ${selectedContactIds.size} 位联系人吗？此操作无法撤销。`,
         isDestructive: true,
         onConfirm: () => {
            const updatedContacts = contacts.filter(c => !selectedContactIds.has(c.id));
            setContacts(updatedContacts);
            localStorage.setItem('wechat-contacts', JSON.stringify(updatedContacts));
            localStorage.setItem('wechat-contacts-backup', JSON.stringify(updatedContacts));
            if (isSupabaseConfigured() && updatedContacts.length > 0) {
              saveToCloud('contacts', updatedContacts);
            }
            handleDeselectAll();
            setConfirmModal(prev => ({ ...prev, isOpen: false }));
         },
         onCancel: () => setConfirmModal(prev => ({ ...prev, isOpen: false }))
      });
  };

  const handleUpdateStatus = (contactId: string, newStatus: 'idle' | 'following' | 'contacted') => {
      setContacts(prev => prev.map(c => {
          if (c.id === contactId) {
              const updatedContact = { ...c, followUpStatus: newStatus };
              return applyAutoTags(updatedContact);
          }
          return c;
      }));
  };

  const handleBatchUpdateStatus = (ids: string[], newStatus: 'idle' | 'following' | 'contacted') => {
      setContacts(prev => prev.map(c => {
          if (ids.includes(c.id)) {
              const updatedContact = { ...c, followUpStatus: newStatus };
              return applyAutoTags(updatedContact);
          }
          return c;
      }));
  };

  // 类目相关处理函数
  const handleAddCategory = (category: Omit<Category, 'id' | 'createdAt' | 'updatedAt'>) => {
    const newCategory: Category = {
      ...category,
      id: generateId(),
      createdAt: Date.now(),
      updatedAt: Date.now()
    };
    setCategories(prev => [...prev, newCategory]);
  };

  const handleUpdateCategory = (id: string, updates: Partial<Category>) => {
    setCategories(prev => prev.map(c =>
      c.id === id ? { ...c, ...updates, updatedAt: Date.now() } : c
    ));
  };

  const handleDeleteCategory = (id: string) => {
    // 删除类目时，将该类目下的联系人移到"无类目"
    setContacts(prev => prev.map(c =>
      c.categoryId === id ? { ...c, categoryId: undefined } : c
    ));
    setCategories(prev => prev.filter(c => c.id !== id));
  };

  const handleMoveContactToCategory = (contactId: string, newCategoryId: string | null) => {
    setContacts(prev => prev.map(c =>
      c.id === contactId ? { ...c, categoryId: newCategoryId || undefined } : c
    ));
  };

  const handleAddContactToCategory = (categoryId: string | null, contactName: string) => {
    console.log('添加联系人:', contactName, '到类目:', categoryId);
    console.log('当前联系人总数:', contacts.length);
    
    // 先搜索库中是否已存在同名联系人
    const existingContact = contacts.find(
      c => c.remarkName === contactName || c.nickname === contactName
    );

    console.log('查找结果:', existingContact ? '找到已有联系人' : '未找到，将创建新的');

    if (existingContact) {
      // 如果已存在，更新其状态为跟进中，并设置类目
      console.log('更新已有联系人:', existingContact.id, existingContact.remarkName);
      setContacts(prev => 
        prev.map(c => 
          c.id === existingContact.id 
            ? { ...c, followUpStatus: 'following' as const, categoryId: categoryId || undefined }
            : c
        )
      );
    } else {
      // 如果不存在，创建新联系人
      console.log('创建新联系人:', contactName);
      const newContact: Contact = {
        id: generateId(),
        wxid: '',
        nickname: contactName,
        remarkName: contactName,
        remarkInfo: '',
        tags: [],
        addedAt: Date.now(),
        dealProducts: [],
        intentProducts: [],
        policies: [],
        followUpStatus: 'following',
        categoryId: categoryId || undefined
      };
      setContacts(prev => [newContact, ...prev]);
    }
  };

  const handleAddExistingContactToCategory = (categoryId: string | null, contactId: string) => {
    console.log('添加已有联系人:', contactId, '到类目:', categoryId);
    setContacts(prev =>
      prev.map(c =>
        c.id === contactId
          ? { ...c, followUpStatus: 'following' as const, categoryId: categoryId || undefined }
          : c
      )
    );
  };

  const handleReorderCategories = (newCategories: Category[]) => {
    setCategories(newCategories);
  };

  const renderContent = () => {
      switch (currentView) {
          case 'contacts':
              return (
                  <ContactList 
                    contacts={contacts} 
                    onEdit={(contact) => {
                      setEditingContact(contact);
                      setIsModalOpen(true);
                    }}
                    onDelete={handleDeleteContact}
                    filterTags={selectedTags}
                    followUpFilter={followUpFilter}
                    selectedIds={selectedContactIds}
                    onToggleSelect={handleToggleSelect}
                    onSelectAll={handleSelectAll}
                    onDeselectAll={handleDeselectAll}
                    onBatchAddTag={() => setBatchModalState({ isOpen: true, mode: 'add' })}
                    onBatchRemoveTag={() => setBatchModalState({ isOpen: true, mode: 'remove' })}
                    onBatchDelete={handleBatchDelete}
                    onRemoveTagFromContact={handleRemoveTagFromContact}
                    onClearTags={() => setSelectedTags(new Set())}
                    onUpdateStatus={handleUpdateStatus}
                    onBatchUpdateStatus={handleBatchUpdateStatus}
                  />
              );
          case 'followups':
              return (
                  <CategoryBoard
                     contacts={contacts.filter(c => c.followUpStatus === 'following')}
                     categories={categories}
                     filterTags={selectedTags}
                     followUpFilter={followUpFilter}
                     categoryFilter={categoryFilter}
                     onContactClick={(contact) => {
                         setEditingContact(contact);
                         setIsModalOpen(true);
                     }}
                     onContactMove={handleMoveContactToCategory}
                     onCategoryFilter={setCategoryFilter}
                     onOpenCategoryManager={() => setIsCategoryManagerOpen(true)}
                     onAddContact={handleAddContactToCategory}
                     onAddExistingContact={handleAddExistingContactToCategory}
                     allContacts={contacts}
                     onReorderCategories={handleReorderCategories}
                  />
              );
          case 'policies':
              return (
                  <PolicyDashboard 
                     contacts={contacts}
                     filterTags={selectedTags}
                    followUpFilter={followUpFilter}
                     onEditContact={(contact) => {
                         setEditingContact(contact);
                         setIsModalOpen(true);
                     }}
                     onAddPolicy={() => setIsManualPolicyOpen(true)}
                     onBatchDeleteContacts={(ids) => {
                        setContacts(prev => prev.filter(c => !ids.includes(c.id)));
                     }}
                     onDeletePolicy={handleDeletePolicy}
                   />
               );
          default:
              return null;
      }
  };

  return (
    <div className="flex flex-col md:flex-row h-screen w-full bg-white overflow-hidden font-sans">
      <Sidebar 
        tags={allTags}
        selectedTags={selectedTags}
        onSelectTag={handleToggleTag}
        followUpFilter={followUpFilter}
        onFollowUpFilter={setFollowUpFilter}
        onAddNew={() => {
          setEditingContact(null);
          setIsModalOpen(true);
        }}
        onDeleteTag={handleDeleteTag}
        onRenameTag={handleRenameTag}
        onBatchDeleteTags={handleBatchDeleteTags}
        onToggleAllTags={handleToggleAllTags}
        totalContacts={contacts.length}
        followUpCount={contacts.filter(c => c.followUpStatus === 'following').length}
        policyCount={contacts.filter(c => c.policies && c.policies.length > 0).length}
        currentView={currentView}
        onChangeView={setCurrentView}
        isMobileOpen={isMobileSidebarOpen}
        onCloseMobile={() => setIsMobileSidebarOpen(false)}
      />

      <div className="flex-1 h-full overflow-hidden relative flex flex-col">
        {/* Mobile Header */}
        <div className="md:hidden h-14 bg-white border-b border-gray-100 flex items-center px-4 shrink-0 z-20">
          <button
            onClick={() => setIsMobileSidebarOpen(true)}
            className="p-2 -ml-2 text-gray-500 hover:text-gray-900"
          >
            <Menu size={24} />
          </button>
          <span className="ml-2 font-semibold text-gray-900">
            {currentView === 'contacts'
              ? `客户管理 (${contacts.length})`
              : currentView === 'followups'
                ? `跟进记录 (${contacts.filter(c => (c.progressHistory && c.progressHistory.length > 0) || c.progress).length})`
                : `保单管理 (${contacts.filter(c => c.policies && c.policies.length > 0).length})`}
          </span>
        </div>

        <div className="flex-1 h-full overflow-hidden relative">
          {renderContent()}
        </div>

        {/* Mobile Bottom Navigation */}
        <div className="md:hidden h-16 bg-white border-t border-gray-100 flex items-center justify-around px-2 shrink-0 z-20 pb-safe">
          <button
            onClick={() => setCurrentView('contacts')}
            className={`flex flex-col items-center gap-0.5 px-3 py-1.5 rounded-md transition-all ${currentView === 'contacts' ? 'text-gray-900 bg-gray-100' : 'text-gray-400'}`}
          >
            <Users size={18} />
            <span className="text-[9px] font-medium">联系人</span>
          </button>
          <button 
            onClick={() => setCurrentView('followups')}
            className={`flex flex-col items-center gap-0.5 px-3 py-1.5 rounded-md transition-all ${currentView === 'followups' ? 'text-gray-900 bg-gray-100' : 'text-gray-400'}`}
          >
            <ClipboardList size={18} />
            <span className="text-[9px] font-medium">工作台</span>
          </button>
          <button 
            onClick={() => setIsMobileSidebarOpen(true)}
            className="flex flex-col items-center gap-0.5 px-3 py-1.5 rounded-md transition-all text-gray-400"
          >
            <Menu size={18} />
            <span className="text-[9px] font-medium">更多</span>
          </button>
        </div>
      </div>

      <ImportModal 
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        onSave={handleSaveContact}
        onTableSave={handleTableDataSave}
        initialData={editingContact}
        allTags={allTags}
        onDelete={handleDeleteContact}
      />
      
      <BatchTagModal
        isOpen={batchModalState.isOpen}
        mode={batchModalState.mode}
        onClose={() => setBatchModalState(prev => ({ ...prev, isOpen: false }))}
        onConfirm={handleBatchConfirm}
        existingTags={allTags}
        selectedCount={selectedContactIds.size}
      />

      <ConfirmModal 
        {...confirmModal}
      />
      
      <QuickFollowUpModal
         isOpen={isQuickFollowUpOpen}
         onClose={() => {
             setIsQuickFollowUpOpen(false);
             setEditingRecord(null);
         }}
         contacts={contacts}
         onSave={handleQuickAddProgress}
         initialContactId={quickFollowUpContactId}
         initialRecord={editingRecord?.record}
      />

      <ManualPolicyModal
        isOpen={isManualPolicyOpen}
        onClose={() => setIsManualPolicyOpen(false)}
        contacts={contacts}
        onSave={handleManualAddPolicy}
      />

      <CategoryManager
        isOpen={isCategoryManagerOpen}
        onClose={() => setIsCategoryManagerOpen(false)}
        categories={categories}
        onAdd={handleAddCategory}
        onUpdate={handleUpdateCategory}
        onDelete={handleDeleteCategory}
      />
    </div>
  );
};

export default App;