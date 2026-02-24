
import React, { useState, useMemo } from 'react';
import { Contact, Policy } from '../types';
import { Search, Shield, ChevronDown, Edit2, Plus, Trash2, CheckSquare, Square, X } from 'lucide-react';

interface PolicyDashboardProps {
  contacts: Contact[];
  filterTags: Set<string>;
  onEditContact: (contact: Contact) => void;
  onAddPolicy: () => void;
  onBatchDeleteContacts?: (ids: string[]) => void;
}

const PolicyDashboard: React.FC<PolicyDashboardProps> = ({ contacts, filterTags, onEditContact, onAddPolicy, onBatchDeleteContacts }) => {
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
    if (filterTags.size > 0) result = result.filter(c => c.tags.some(tag => filterTags.has(tag)));
    if (searchTerm) {
      const lower = searchTerm.toLowerCase();
      result = result.filter(c => {
        const matchesContact = (c.remarkName && c.remarkName.toLowerCase().includes(lower)) || 
                               (c.nickname && c.nickname.toLowerCase().includes(lower)) ||
                               (c.phoneNumber && c.phoneNumber.includes(lower));
        const matchesPolicy = c.policies?.some(p => p.policyNumber.toLowerCase().includes(lower) || p.productName.toLowerCase().includes(lower));
        return matchesContact || matchesPolicy;
      });
    }
    return result;
  }, [contacts, searchTerm, filterTags]);

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
      const premiumStr = String(p.premium || '0');
      const val = parseFloat(premiumStr.replace(/[^0-9.]/g, ''));
      if (!isNaN(val)) totalPremium += val;
    });
    return { count, totalPremium: totalPremium.toFixed(2) };
  };

  return (
    <div className="flex-1 h-full w-full overflow-hidden flex flex-col bg-slate-50/50 relative">
      <div className="sticky top-0 z-20 shrink-0 backdrop-blur-xl bg-white/70 border-b border-white/20 shadow-sm">
        <div className="p-4 md:p-6 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
          <div className="flex items-center gap-4">
             <button onClick={handleSelectAll} className="p-2 text-slate-400 hover:text-emerald-500 hover:bg-emerald-50 rounded-xl transition-all">
                {allSelected ? <CheckSquare size={22} className="text-emerald-500" /> : <Square size={22} />}
             </button>
             <div>
              <h2 className="text-lg md:text-2xl font-bold text-slate-800 flex items-center gap-2 md:gap-3 tracking-tight">
                保单管理
                {filterTags.size > 0 && <span className="text-[10px] md:text-xs font-bold text-emerald-600 bg-emerald-100/50 border border-emerald-100 px-2 py-0.5 rounded-full">筛选: {filterTags.size}</span>}
                <span className="text-[10px] md:text-xs font-bold text-slate-400 bg-slate-100 border border-slate-200 px-2 py-0.5 rounded-full ml-1">共 {filteredContactsWithPolicies.length}</span>
              </h2>
              <p className="text-[10px] md:text-xs font-medium text-slate-400 mt-0.5">Insurance Policy Dashboard</p>
            </div>
          </div>

          <div className="flex items-center gap-3 w-full sm:w-auto ml-auto">
            <button onClick={onAddPolicy} className="group bg-gradient-to-r from-emerald-500 to-teal-500 hover:from-emerald-400 hover:to-teal-400 text-white px-4 md:px-5 py-2 md:py-2.5 rounded-xl font-bold shadow-lg shadow-emerald-200 hover:shadow-emerald-300 active:scale-95 flex items-center gap-2 transition-all shrink-0 text-sm"><Plus size={18} /><span>录入保单</span></button>
            <div className="relative w-full sm:w-80 group"><Search className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400 group-focus-within:text-emerald-500 transition-colors" size={18} /><input type="text" placeholder="搜索客户、保单号、险种..." value={searchTerm} onChange={(e) => setSearchTerm(e.target.value)} className="w-full pl-11 pr-4 py-2 md:py-2.5 rounded-xl border-0 bg-slate-100/80 hover:bg-slate-100 focus:bg-white outline-none ring-emerald-500/20 focus:ring-2 transition-all text-xs md:text-sm font-medium" /></div>
          </div>
        </div>
      </div>

      <div className="flex-1 overflow-y-auto p-4 md:p-6 pb-20 custom-scrollbar space-y-4 md:space-y-6">
        {filteredContactsWithPolicies.length === 0 ? (
          <div className="flex flex-col items-center justify-center h-full text-slate-300"><Shield size={64} className="mb-4 opacity-50" /><p className="text-lg font-medium">暂无保单数据</p><p className="text-sm mt-2 opacity-60">{filterTags.size > 0 ? '没有匹配选中标签的投保记录' : '当前没有任何投保记录'}</p></div>
        ) : (
          filteredContactsWithPolicies.map(contact => {
            const { count, totalPremium } = getTotals(contact.policies || []);
            const isExpanded = expandedContactIds.has(contact.id);
            const isSelected = selectedIds.has(contact.id);
            return (
              <div key={contact.id} className={`bg-white rounded-2xl border transition-all duration-300 shadow-sm overflow-hidden hover:shadow-md ${isSelected ? 'border-emerald-500 ring-1 ring-emerald-500/20' : 'border-slate-100'}`}>
                <div className="p-5 flex flex-col md:flex-row md:items-center justify-between gap-4 bg-white cursor-pointer hover:bg-slate-50/50" onClick={() => toggleExpand(contact.id)}>
                  <div className="flex items-start gap-4">
                    <div onClick={(e) => toggleSelect(contact.id, e)} className={`w-12 h-12 rounded-xl border flex items-center justify-center transition-all ${isSelected ? 'bg-emerald-500 border-emerald-500 text-white' : 'bg-emerald-50 border-emerald-100 text-emerald-600 font-bold text-lg'}`}>
                      {isSelected ? <CheckSquare size={20} /> : (contact.remarkName?.[0] || '?')}
                    </div>
                    <div>
                      <div className="flex items-center gap-2"><h3 className="text-lg font-bold text-slate-800">{contact.remarkName || contact.nickname}</h3><span className="text-xs text-slate-400 bg-slate-100 px-2 py-0.5 rounded-full font-mono">{contact.phoneNumber || '无手机号'}</span></div>
                      <div className="flex flex-wrap items-center gap-2 mt-2">
                        {contact.tags.map(tag => <span key={tag} className="inline-flex items-center px-2 py-0.5 rounded-md text-[10px] font-bold bg-slate-50 text-slate-500 border border-slate-200">{tag}</span>)}
                        <button onClick={(e) => { e.stopPropagation(); onEditContact(contact); }} className="text-[10px] text-emerald-500 hover:bg-emerald-50 px-2 py-0.5 rounded-md transition-colors flex items-center gap-1 font-bold"><Edit2 size={10} /> 修改标签</button>
                      </div>
                    </div>
                  </div>
                  <div className="flex items-center gap-6 md:justify-end border-t md:border-t-0 border-slate-50 pt-3 md:pt-0">
                    <div className="text-right"><div className="text-xs text-slate-400 font-medium">保单数量</div><div className="text-lg font-bold text-slate-700">{count} <span className="text-xs font-normal text-slate-400">份</span></div></div>
                    <div className="text-right pr-4 border-r border-slate-100"><div className="text-xs text-slate-400 font-medium">总保费</div><div className="text-lg font-bold text-orange-500 font-mono">¥ {totalPremium}</div></div>
                    <ChevronDown size={20} className={`text-slate-400 transition-transform ${isExpanded ? 'rotate-180 text-emerald-500' : ''}`} />
                  </div>
                </div>
                {isExpanded && (
                  <div className="border-t border-slate-100 bg-slate-50/50 p-4 animate-in slide-in-from-top-2">
                    <div className="bg-white rounded-xl border border-slate-200 overflow-x-auto shadow-sm no-scrollbar">
                      <table className="w-full text-left text-sm min-w-[600px]"><thead className="bg-slate-50 text-slate-500 font-bold text-[10px] uppercase tracking-wider border-b border-slate-200"><tr className="divide-x divide-slate-100"><th className="px-4 py-3">险种名称</th><th className="px-4 py-3">保单号</th><th className="px-4 py-3 text-right">保费</th><th className="px-4 py-3">投保人/被保人</th><th className="px-4 py-3">生效日期</th><th className="px-4 py-3">状态</th></tr></thead><tbody className="divide-y divide-slate-100">{contact.policies?.map(policy => (<tr key={policy.id} className="hover:bg-slate-50/50 transition-colors"><td className="px-4 py-3 font-bold text-slate-700">{policy.productName}</td><td className="px-4 py-3 font-mono text-slate-500 text-xs">{policy.policyNumber}</td><td className="px-4 py-3 text-right font-mono font-bold text-orange-600">¥ {policy.premium}</td><td className="px-4 py-3 text-slate-600">{policy.applicant} / {policy.insured}</td><td className="px-4 py-3 text-slate-500 text-xs">{policy.effectiveDate}</td><td className="px-4 py-3"><span className={`px-2 py-0.5 rounded text-[10px] font-bold ${policy.status.includes('有效') ? 'bg-emerald-50 text-emerald-600' : 'bg-slate-100 text-slate-500'}`}>{policy.status}</span></td></tr>))}</tbody></table>
                    </div>
                  </div>
                )}
              </div>
            );
          })
        )}
      </div>

      {selectedIds.size > 0 && (
        <div className="fixed sm:absolute bottom-4 sm:bottom-8 left-4 sm:left-1/2 right-4 sm:right-auto sm:-translate-x-1/2 backdrop-blur-xl bg-white/95 shadow-2xl border border-slate-200 rounded-2xl px-2 py-2 flex items-center gap-2 animate-in slide-in-from-bottom-4 z-50 ring-1 ring-slate-900/5 overflow-x-auto no-scrollbar">
            <div className="px-3 sm:px-4 py-2 bg-emerald-50 rounded-xl text-xs sm:text-sm font-bold text-emerald-700 whitespace-nowrap">{selectedIds.size} 位客户</div>
            <button onClick={handleBatchDelete} className="flex items-center gap-1.5 sm:gap-2 px-4 sm:px-6 py-2 sm:py-2.5 text-xs sm:text-sm font-bold text-rose-500 hover:text-white hover:bg-rose-500 rounded-xl transition-all whitespace-nowrap"><Trash2 size={14} className="sm:w-4 sm:h-4" /><span>批量删除</span></button>
            <button onClick={() => setSelectedIds(new Set())} className="p-2 text-slate-400 hover:text-slate-600 shrink-0"><X size={18} className="sm:w-5 sm:h-5" /></button>
        </div>
      )}
    </div>
  );
};

export default PolicyDashboard;
