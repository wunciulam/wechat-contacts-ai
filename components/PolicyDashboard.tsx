
import React, { useState, useMemo } from 'react';
import { Contact, Policy } from '../types';
import { Search, Shield, ChevronDown, Edit2, Plus, Trash2, CheckSquare, Square, X } from 'lucide-react';
import { PageHeader } from './PageHeader';

interface PolicyDashboardProps {
  contacts: Contact[];
  filterTags: Set<string>;
  followUpFilter: 'idle' | 'following' | 'contacted' | null;
  onEditContact: (contact: Contact) => void;
  onAddPolicy: () => void;
  onBatchDeleteContacts?: (ids: string[]) => void;
  onDeletePolicy?: (contactId: string, policyId: string) => void;
}

const PolicyDashboard: React.FC<PolicyDashboardProps> = ({ contacts, filterTags, followUpFilter, onEditContact, onAddPolicy, onBatchDeleteContacts, onDeletePolicy }) => {
  const [searchTerm, setSearchTerm] = useState('');
  const [expandedContactIds, setExpandedContactIds] = useState<Set<string>>(new Set());
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());

  const toggleExpand = (id: string) => {
    setExpandedContactIds(prev => {
      const newSet = new Set(prev);
      if (newSet.has(id)) newSet.delete(id);
      else newSet.add(id);
      return newSet;
    });
  };

  const toggleSelect = (id: string, e: React.MouseEvent) => {
    e.stopPropagation();
    setSelectedIds(prev => {
      const newSet = new Set(prev);
      if (newSet.has(id)) newSet.delete(id);
      else newSet.add(id);
      return newSet;
    });
  };

  const filteredContactsWithPolicies = useMemo(() => {
    let result = contacts.filter(c => c.policies && c.policies.length > 0);
    
    if (filterTags.size > 0) {
      result = result.filter(c => c.tags.some(tag => filterTags.has(tag)));
    }
    
    if (followUpFilter !== null) {
      result = result.filter(c => c.followUpStatus === followUpFilter);
    }
    
    if (searchTerm && searchTerm.trim()) {
      const lower = searchTerm.trim().toLowerCase();
      result = result.filter(c => {
        const matchesContact = (c.remarkName && c.remarkName.toLowerCase().includes(lower)) || 
                               (c.nickname && c.nickname.toLowerCase().includes(lower)) ||
                               (c.phoneNumber && String(c.phoneNumber).includes(lower));
        const matchesPolicy = c.policies?.some(p => 
          (p.policyNumber && p.policyNumber.toLowerCase().includes(lower)) || 
          (p.productName && p.productName.toLowerCase().includes(lower))
        );
        return matchesContact || matchesPolicy;
      });
    }
    
    return result;
  }, [contacts, searchTerm, filterTags, followUpFilter]);

  const allSelected = filteredContactsWithPolicies.length > 0 && filteredContactsWithPolicies.every(c => selectedIds.has(c.id));

  const handleSelectAll = () => {
    if (allSelected) setSelectedIds(new Set());
    else setSelectedIds(new Set(filteredContactsWithPolicies.map(c => c.id)));
  };

  const handleBatchDelete = () => {
    if (selectedIds.size > 0 && confirm(`确定要删除选中的 ${selectedIds.size} 位投保客户吗？此操作将彻底移除他们的所有资料。`)) {
      onBatchDeleteContacts?.(Array.from(selectedIds));
      setSelectedIds(new Set());
    }
  };

  const getTotals = (policies: Policy[]) => {
    const count = policies.length;
    let totalPremium = 0;
    policies.forEach(p => {
      // 只计算生效的保单（status 包含"有效"）
      if (p.status && p.status.includes('有效')) {
        const premiumStr = String(p.premium || '0');
        const val = parseFloat(premiumStr.replace(/[^0-9.]/g, ''));
        if (!isNaN(val)) totalPremium += val;
      }
    });
    return { count, totalPremium: totalPremium.toFixed(2) };
  };

  return (
<div className="flex-1 h-full w-full overflow-hidden flex flex-col bg-white relative">
      <div className="sticky top-0 z-20 shrink-0 bg-white border-b border-gray-100">
        <PageHeader
          title={filterTags.size > 0 ? `筛选: ${filterTags.size} 个标签` : '客户保单'}
          count={filteredContactsWithPolicies.length}
          selectedCount={selectedIds.size}
          allSelected={allSelected}
          onSelectAll={handleSelectAll}
          actionButton={
            <button onClick={onAddPolicy} className="btn btn-primary text-sm"><Plus size={16} /><span>录入保单</span></button>
          }
          searchBox={
            <div className="relative w-full sm:w-72">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 pointer-events-none" size={17} />
              <input 
                type="text" 
                placeholder="搜索客户、保单号、险种..." 
                value={searchTerm} 
                onChange={(e) => setSearchTerm(e.target.value)} 
                className="w-full pl-10 pr-4 py-2 text-sm bg-white border border-gray-200 rounded-md placeholder:text-gray-400 focus:bg-white focus:border-gray-400 focus:outline-none focus:ring-1 focus:ring-gray-200 transition-all min-h-[38px]" 
              />
            </div>
          }
        />
      </div>

      <div className="flex-1 overflow-y-auto p-4 md:p-6 pb-20 custom-scrollbar space-y-4 md:space-y-6">
        {filteredContactsWithPolicies.length === 0 ? (
          <div className="flex flex-col items-center justify-center h-full text-gray-300"><Shield size={64} className="mb-4 opacity-50" /><p className="text-lg font-medium">暂无保单数据</p><p className="text-sm mt-2 opacity-60">{filterTags.size > 0 ? '没有匹配选中标签的投保记录' : '当前没有任何投保记录'}</p></div>
        ) : (
          filteredContactsWithPolicies.map(contact => {
            const { count, totalPremium } = getTotals(contact.policies || []);
            const isExpanded = expandedContactIds.has(contact.id);
            const isSelected = selectedIds.has(contact.id);
            return (
              <div key={contact.id} className={`bg-white rounded-lg border transition-all duration-150 overflow-hidden hover:border-gray-200 ${isSelected ? 'border-gray-400' : 'border-gray-100'}`}>
                <div className="p-5 flex flex-col md:flex-row md:items-center justify-between gap-4 bg-white cursor-pointer hover:bg-gray-50" onClick={() => toggleExpand(contact.id)}>
                  <div className="flex items-start gap-4">
                    <button onClick={(e) => toggleSelect(contact.id, e)} className={`w-12 h-12 rounded-lg border flex items-center justify-center transition-all ${isSelected ? 'bg-gray-900 border-gray-900 text-white' : 'bg-gray-100 border-gray-200 text-gray-600 font-medium text-lg hover:border-gray-300'}`}>
                      {isSelected ? <CheckSquare size={20} /> : (contact.remarkName?.[0] || '?')}
                    </button>
                    <div>
                      <div className="flex items-center gap-2"><h3 className="text-lg font-medium text-gray-900">{contact.remarkName || contact.nickname}</h3><span className="text-xs text-gray-400 bg-gray-100 px-2 py-0.5 rounded-full font-mono">{contact.phoneNumber || '无手机号'}</span></div>
                      <div className="flex flex-wrap items-center gap-2 mt-2">
                        {contact.tags.map(tag => <span key={tag} className="inline-flex items-center px-2 py-0.5 rounded text-[10px] font-medium bg-gray-100 text-gray-600">{tag}</span>)}
                        <button onClick={(e) => { e.stopPropagation(); onEditContact(contact); }} className="text-[10px] text-gray-500 hover:bg-gray-100 px-2 py-0.5 rounded-md transition-colors flex items-center gap-1 font-medium"><Edit2 size={10} /> 修改标签</button>
                      </div>
                    </div>
                  </div>
                  <div className="flex items-center gap-6 md:justify-end border-t md:border-t-0 border-gray-100 pt-3 md:pt-0">
                    <div className="text-right"><div className="text-xs text-gray-400 font-medium">保单数量</div><div className="text-lg font-medium text-gray-700">{count} <span className="text-xs font-normal text-gray-400">份</span></div></div>
                    <div className="text-right pr-4 border-r border-gray-100"><div className="text-xs text-gray-400 font-medium">总保费</div><div className="text-lg font-medium text-gray-900 font-mono">¥ {totalPremium}</div></div>
                    <ChevronDown size={20} className={`text-gray-400 transition-transform ${isExpanded ? 'rotate-180 text-gray-900' : ''}`} />
                  </div>
                </div>
                {isExpanded && (
                  <div className="border-t border-gray-100 bg-gray-50 p-4 animate-in slide-in-from-top-2">
                    <div className="bg-white rounded-lg border border-gray-200 overflow-x-auto no-scrollbar">
                      <table className="w-full text-left text-sm min-w-[800px]">
                        <thead className="bg-gray-50 text-gray-500 font-medium text-[10px] uppercase tracking-wider border-b border-gray-200">
                          <tr className="divide-x divide-gray-100">
                            <th className="px-4 py-3">险种名称</th>
                            <th className="px-4 py-3">保单号</th>
                            <th className="px-4 py-3 text-right">保费</th>
                            <th className="px-4 py-3">缴费年限</th>
                            <th className="px-4 py-3">投保人/被保人</th>
                            <th className="px-4 py-3">生效日期</th>
                            <th className="px-4 py-3">状态</th>
                            <th className="px-4 py-3 text-right">操作</th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-gray-100">
                          {contact.policies?.map(policy => (
                            <tr key={policy.id} className="hover:bg-gray-50 transition-colors">
                              <td className="px-4 py-3 font-medium text-gray-700">{policy.productName}</td>
                              <td className="px-4 py-3 font-mono text-gray-500 text-xs">{policy.policyNumber}</td>
                              <td className="px-4 py-3 text-right font-mono font-medium text-gray-900">¥ {policy.premium}</td>
                              <td className="px-4 py-3 text-gray-500 text-xs">{policy.paymentYears || '-'}</td>
                              <td className="px-4 py-3 text-gray-600">{policy.applicant} / {policy.insured}</td>
                              <td className="px-4 py-3 text-gray-500 text-xs">{policy.effectiveDate}</td>
                              <td className="px-4 py-3">
                                <span className={`px-2 py-0.5 rounded text-[10px] font-medium ${policy.status.includes('有效') ? 'bg-gray-900 text-white' : 'bg-gray-100 text-gray-600'}`}>
                                  {policy.status}
                                </span>
                              </td>
                              <td className="px-4 py-3 text-right">
                                <button 
                                  onClick={(e) => { 
                                    e.stopPropagation(); 
                                    if (onDeletePolicy) onDeletePolicy(contact.id, policy.id); 
                                  }} 
                                  className="text-gray-400 hover:text-red-600 hover:bg-red-50 p-1.5 rounded-md transition-colors" 
                                  title="删除保单"
                                >
                                  <Trash2 size={14} />
                                </button>
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  </div>
                )}
              </div>
            );
          })
        )}
      </div>

      {selectedIds.size > 0 && (
        <div className="fixed sm:absolute bottom-4 sm:bottom-8 left-4 sm:left-1/2 right-4 sm:right-auto sm:-translate-x-1/2 bg-white shadow-lg border border-gray-200 rounded-lg px-2 py-2 flex items-center gap-2 animate-in slide-in-from-bottom-4 z-50 overflow-x-auto no-scrollbar">
            <div className="px-3 sm:px-4 py-2 bg-gray-900 rounded text-xs sm:text-sm font-medium text-white whitespace-nowrap">{selectedIds.size} 位客户</div>
            <button onClick={handleBatchDelete} className="flex items-center gap-1.5 sm:gap-2 px-4 sm:px-6 py-2 sm:py-2.5 text-xs sm:text-sm font-medium text-gray-600 hover:text-gray-900 hover:bg-red-50 rounded-md transition-all whitespace-nowrap"><Trash2 size={14} className="sm:w-4 sm:h-4" /><span>批量删除</span></button>
            <button onClick={() => setSelectedIds(new Set())} className="p-2 text-gray-400 hover:text-gray-900 shrink-0"><X size={18} className="sm:w-5 sm:h-5" /></button>
        </div>
      )}
    </div>
  );
};

export default PolicyDashboard;
