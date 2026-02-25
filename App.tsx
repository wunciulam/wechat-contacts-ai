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
import ProductSpecModal from './components/ProductSpecModal';
import ManualPolicyModal from './components/ManualPolicyModal';
import { Contact, NewContact, ProgressRecord, ExtractedTableData, Policy } from './types';
import { saveToCloud, loadFromCloud, isSupabaseConfigured } from './services/supabaseService';

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
 * 1. followUpStatus is following -> Apply "跟进中"
 * 2. followUpStatus is contacted -> Apply "沟通过"
 * 3. Has policy records -> Apply "成交客户"
 */
const applyAutoTags = (contact: Contact): Contact => {
  let newTagsSet = new Set(contact.tags);
  let changed = false;
  
  // 1. Check followUpStatus
  if (contact.followUpStatus === 'contacted') {
      if (!newTagsSet.has(CONTACTED_TAG)) {
          newTagsSet.add(CONTACTED_TAG);
          newTagsSet.delete(FOLLOW_UP_TAG);
          changed = true;
      }
  } else if (contact.followUpStatus === 'following') {
      if (!newTagsSet.has(FOLLOW_UP_TAG)) {
          newTagsSet.add(FOLLOW_UP_TAG);
          newTagsSet.delete(CONTACTED_TAG);
          changed = true;
      }
  }

  // 2. Check for policy records
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
  
  // Modals
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isSpecModalOpen, setIsSpecModalOpen] = useState(false);
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

  // 1. Load Data
  useEffect(() => {
    const loadData = async () => {
      console.log('Supabase配置状态:', isSupabaseConfigured());
      
      // 优先从本地存储加载
      const saved = localStorage.getItem('wechat-contacts');
      if (saved) {
        try {
          const parsedData = JSON.parse(saved);
          if (Array.isArray(parsedData)) {
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
            setIsLoaded(true);
            
            // 后台尝试云端同步
            if (isSupabaseConfigured() && migratedData.length > 0) {
              console.log('正在同步到云端...');
              const success = await saveToCloud('contacts', migratedData);
              console.log('云端同步结果:', success ? '成功' : '失败');
            }
            return;
          }
        } catch (e) {
          console.error('本地数据解析失败:', e);
        }
      }

      // 本地没有数据，尝试从云端加载
      if (isSupabaseConfigured()) {
        try {
          const cloudData = await loadFromCloud('contacts');
          if (cloudData && Array.isArray(cloudData) && cloudData.length > 0) {
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
            setIsLoaded(true);
            return;
          }
        } catch (e) {
          console.log('从云端加载失败，使用本地数据');
        }
      }

      setIsLoaded(true);
    };

    loadData();
  }, []);

  // 2. Save Data
  useEffect(() => {
    if (isLoaded) {
      localStorage.setItem('wechat-contacts', JSON.stringify(contacts));
      // 自动同步到云端
      if (isSupabaseConfigured()) {
        console.log('正在保存并同步到云端, 联系人数量:', contacts.length);
        saveToCloud('contacts', contacts).then(success => {
          console.log('云端保存结果:', success ? '成功' : '失败');
        }).catch(e => console.log('云端同步失败:', e));
      }
    }
  }, [contacts, isLoaded]);

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
        const c: Contact = {
          ...data,
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
               insured: String(item.insuredName || '')
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
              updatedHistory = (c.progressHistory || []).map(r => 
                 r.id === existingRecordId ? { ...r, date, content, completed: completed ?? r.completed } : r
              );
           } else {
              const newRecord: ProgressRecord = {
                id: Date.now().toString(),
                date: date,
                content: content,
                completed: completed ?? false
              };
              updatedHistory = [newRecord, ...(c.progressHistory || [])];
           }
           
           const updated = {
             ...c,
             progressHistory: updatedHistory,
             lastDate: date,
             followUpStatus: newStatus
           };
           return applyAutoTags(updated);
        }
        return c;
      }));
    } else if (newContactName) {
      const newRecord: ProgressRecord = {
         id: Date.now().toString(),
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
        followUpStatus: newStatus,
        policies: []
      };
      setContacts(prev => [applyAutoTags(newContact), ...prev]);
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
              return {
                  ...c,
                  progressHistory: c.progressHistory?.filter(p => p.id !== progressId)
              };
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
        setContacts(prev => prev.filter(c => c.id !== id));
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
           setContacts(prev => prev.filter(c => !selectedContactIds.has(c.id)));
           handleDeselectAll();
           setConfirmModal(prev => ({ ...prev, isOpen: false }));
        },
        onCancel: () => setConfirmModal(prev => ({ ...prev, isOpen: false }))
     });
  };

  const handleUpdateStatus = (contactId: string, newStatus: 'following' | 'contacted') => {
      setContacts(prev => prev.map(c => {
          if (c.id === contactId) {
              const updatedContact = { ...c, followUpStatus: newStatus };
              // Tag behavior as requested:
              // If moved to contacted -> remove '跟进中', add '沟通过'
              // If moved to following -> remove '沟通过', add '跟进中'
              return applyAutoTags(updatedContact);
          }
          return c;
      }));
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
                    selectedIds={selectedContactIds}
                    onToggleSelect={handleToggleSelect}
                    onSelectAll={handleSelectAll}
                    onDeselectAll={handleDeselectAll}
                    onBatchAddTag={() => setBatchModalState({ isOpen: true, mode: 'add' })}
                    onBatchRemoveTag={() => setBatchModalState({ isOpen: true, mode: 'remove' })}
                    onBatchDelete={handleBatchDelete}
                    onRemoveTagFromContact={handleRemoveTagFromContact}
                    onClearTags={() => setSelectedTags(new Set())}
                  />
              );
          case 'followups':
              return (
                  <FollowUpDashboard 
                     contacts={contacts}
                     filterTags={selectedTags}
                     onAddProgress={(id) => {
                         setEditingRecord(null);
                         setQuickFollowUpContactId(id);
                         setIsQuickFollowUpOpen(true);
                     }}
                     onEditProgressRecord={(contactId, record) => {
                         setQuickFollowUpContactId(contactId);
                         setEditingRecord({ contactId, record });
                         setIsQuickFollowUpOpen(true);
                     }}
                     onEditContact={(contact) => {
                         setEditingContact(contact);
                         setIsModalOpen(true);
                     }}
                     onDeleteProgress={handleDeleteProgress}
                     onToggleProgress={handleToggleProgress}
                     onUpdateStatus={handleUpdateStatus}
                     onSaveQuickFollowUp={handleQuickAddProgress}
                  />
              );
          case 'policies':
              return (
                  <PolicyDashboard 
                     contacts={contacts}
                     filterTags={selectedTags}
                     onEditContact={(contact) => {
                         setEditingContact(contact);
                         setIsModalOpen(true);
                     }}
                     onAddPolicy={() => setIsManualPolicyOpen(true)}
                     onBatchDeleteContacts={(ids) => {
                        setContacts(prev => prev.filter(c => !ids.includes(c.id)));
                     }}
                  />
              );
          default:
              return null;
      }
  };

  return (
    <div className="flex flex-col md:flex-row h-screen w-full bg-gray-50 overflow-hidden font-sans">
      <Sidebar 
        tags={allTags}
        selectedTags={selectedTags}
        onSelectTag={handleToggleTag}
        onAddNew={() => {
          setEditingContact(null);
          setIsModalOpen(true);
        }}
        onDeleteTag={handleDeleteTag}
        onRenameTag={handleRenameTag}
        onBatchDeleteTags={handleBatchDeleteTags}
        onToggleAllTags={handleToggleAllTags}
        totalContacts={contacts.length}
        followUpCount={contacts.filter(c => c.followUpStatus === 'following' && (c.progressHistory?.length || c.progress)).length}
        policyCount={contacts.filter(c => c.policies && c.policies.length > 0).length}
        currentView={currentView}
        onChangeView={setCurrentView}
        onOpenSpecs={() => setIsSpecModalOpen(true)}
        isMobileOpen={isMobileSidebarOpen}
        onCloseMobile={() => setIsMobileSidebarOpen(false)}
      />

      <div className="flex-1 h-full overflow-hidden relative flex flex-col">
        {/* Mobile Header */}
        <div className="md:hidden h-14 bg-white border-b border-gray-200 flex items-center px-4 shrink-0 z-20">
          <button 
            onClick={() => setIsMobileSidebarOpen(true)}
            className="p-2 -ml-2 text-gray-500 hover:text-gray-700"
          >
            <Menu size={24} />
          </button>
          <span className="ml-2 font-semibold text-gray-900">
            {currentView === 'contacts' 
              ? `全部联系人 (${contacts.length})` 
              : currentView === 'followups' 
                ? `跟进工作台 (${contacts.filter(c => c.followUpStatus === 'following' && (c.progressHistory?.length || c.progress)).length})` 
                : `保单管理 (${contacts.filter(c => c.policies && c.policies.length > 0).length})`}
          </span>
        </div>

        <div className="flex-1 h-full overflow-hidden relative">
          {renderContent()}
        </div>

        {/* Mobile Bottom Navigation */}
        <div className="md:hidden h-16 bg-white border-t border-gray-200 flex items-center justify-around px-2 shrink-0 z-20 pb-safe">
          <button 
            onClick={() => setCurrentView('contacts')}
            className={`flex flex-col items-center gap-1 px-3 py-1 rounded-xl transition-all ${currentView === 'contacts' ? 'text-primary-600' : 'text-gray-400'}`}
          >
            <Users size={20} className={currentView === 'contacts' ? 'fill-primary-50/50' : ''} />
            <span className="text-[10px] font-bold">通讯录</span>
          </button>
          <button 
            onClick={() => setCurrentView('followups')}
            className={`flex flex-col items-center gap-1 px-3 py-1 rounded-xl transition-all ${currentView === 'followups' ? 'text-primary-600' : 'text-gray-400'}`}
          >
            <ClipboardList size={20} className={currentView === 'followups' ? 'fill-primary-50/50' : ''} />
            <span className="text-[10px] font-bold">工作台</span>
          </button>
          <button 
            onClick={() => setCurrentView('policies')}
            className={`flex flex-col items-center gap-1 px-3 py-1 rounded-xl transition-all ${currentView === 'policies' ? 'text-primary-600' : 'text-gray-400'}`}
          >
            <FileText size={20} className={currentView === 'policies' ? 'fill-primary-50/50' : ''} />
            <span className="text-[10px] font-bold">保单</span>
          </button>
          <button 
            onClick={() => setIsMobileSidebarOpen(true)}
            className={`flex flex-col items-center gap-1 px-3 py-1 rounded-xl transition-all text-gray-400`}
          >
            <Menu size={20} />
            <span className="text-[10px] font-bold">更多</span>
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

      <ProductSpecModal 
        isOpen={isSpecModalOpen}
        onClose={() => setIsSpecModalOpen(false)}
      />
    </div>
  );
};

export default App;