import React, { useState } from 'react';
import { Contact } from '../types';
import { Search, Tag, User, Edit2, Trash2, CheckSquare, Square, ShoppingBag, X, LayoutGrid, List, ChevronRight, Target, ChevronDown, ChevronUp, Copy, Check, Briefcase } from 'lucide-react';

interface ContactListProps {
  contacts: Contact[];
  onEdit: (contact: Contact) => void;
  onDelete: (id: string) => void;
  filterTags: Set<string>;
  selectedIds: Set<string>;
  onToggleSelect: (id: string) => void;
  onSelectAll: (ids: string[]) => void;
  onDeselectAll: () => void;
  onBatchAddTag: () => void;
  onBatchRemoveTag: () => void;
  onBatchDelete: () => void;
  onRemoveTagFromContact: (contactId: string, tag: string) => void;
  onClearTags: () => void;
}

export const ContactList: React.FC<ContactListProps> = ({ 
  contacts, 
  onEdit, 
  onDelete, 
  filterTags,
  selectedIds,
  onToggleSelect,
  onSelectAll,
  onDeselectAll,
  onBatchAddTag,
  onBatchRemoveTag,
  onBatchDelete,
  onRemoveTagFromContact,
  onClearTags
}) => {
  const [searchTerm, setSearchTerm] = useState('');
  const [viewMode, setViewMode] = useState<'grid' | 'list'>('grid');
  const [expandedRemarkIds, setExpandedRemarkIds] = useState<Set<string>>(new Set());
  const [copiedWxid, setCopiedWxid] = useState<string | null>(null);

  const toggleRemarkExpand = (id: string, e: React.MouseEvent) => {
    e.stopPropagation();
    setExpandedRemarkIds(prev => {
      const newSet = new Set(prev);
      if (newSet.has(id)) {
        newSet.delete(id);
      } else {
        newSet.add(id);
      }
      return newSet;
    });
  };

  const handleCopyWxid = (e: React.MouseEvent, wxid: string) => {
    e.stopPropagation();
    navigator.clipboard.writeText(wxid);
    setCopiedWxid(wxid);
    setTimeout(() => setCopiedWxid(null), 2000);
  };

  const handleClearFilters = () => {
    setSearchTerm('');
    onClearTags();
  };

  const filteredContacts = contacts.filter(contact => {
    // Search including progress history
    const progressText = contact.progressHistory?.map(p => p.content).join(' ') || contact.progress || '';
    const dealProductsText = contact.dealProducts?.join(' ') || '';
    const intentProductsText = contact.intentProducts?.join(' ') || '';

    const matchesSearch = 
      (contact.nickname && contact.nickname.toLowerCase().includes(searchTerm.toLowerCase())) ||
      (contact.remarkName && contact.remarkName.toLowerCase().includes(searchTerm.toLowerCase())) ||
      (contact.wxid && contact.wxid.toLowerCase().includes(searchTerm.toLowerCase())) ||
      (contact.remarkInfo && contact.remarkInfo.toLowerCase().includes(searchTerm.toLowerCase())) ||
      (dealProductsText.toLowerCase().includes(searchTerm.toLowerCase())) ||
      (intentProductsText.toLowerCase().includes(searchTerm.toLowerCase())) ||
      (progressText.toLowerCase().includes(searchTerm.toLowerCase()));
    
    // Multi-tag logic: OR logic
    const matchesTag = filterTags.size === 0 || contact.tags.some(tag => filterTags.has(tag));
    
    return matchesSearch && matchesTag;
  });

  const allSelected = filteredContacts.length > 0 && filteredContacts.every(c => selectedIds.has(c.id));
  const isSelectionMode = selectedIds.size > 0;

  const handleSelectAllClick = () => {
    if (allSelected) {
      onDeselectAll();
    } else {
      onSelectAll(filteredContacts.map(c => c.id));
    }
  };

  return (
    <div className="flex-1 h-full w-full overflow-hidden flex flex-col bg-slate-50/50 relative animate-in fade-in zoom-in-95 duration-200">
      {/* Header / Search - Glassmorphism */}
      <div className="sticky top-0 z-20 shrink-0 backdrop-blur-xl bg-white/70 border-b border-white/20 shadow-sm">
        <div className="p-4 md:p-6 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
          <div className="flex items-center gap-4">
             {/* Global Select All */}
             <button 
               onClick={handleSelectAllClick}
               className="group flex items-center justify-center w-10 h-10 rounded-xl hover:bg-white/50 hover:shadow-sm transition-all text-slate-400 hover:text-emerald-600"
               title={allSelected ? "取消全选" : "全选当前列表"}
             >
               {allSelected ? <CheckSquare size={22} className="text-emerald-500 drop-shadow-sm"/> : <Square size={22} />}
             </button>
             
             <div>
              <h2 className="text-lg md:text-2xl font-bold text-slate-800 flex items-center gap-2 md:gap-3 tracking-tight">
                {filterTags.size > 0 ? `筛选: ${filterTags.size} 个标签` : '通讯录'}
                {isSelectionMode && (
                  <span className="text-[10px] md:text-xs font-bold text-emerald-600 bg-emerald-100/50 border border-emerald-100 px-2 py-0.5 md:px-2.5 rounded-full animate-in fade-in zoom-in">
                    已选 {selectedIds.size}
                  </span>
                )}
              </h2>
              <p className="text-[10px] md:text-xs font-medium text-slate-400 mt-0.5">
                Total {filteredContacts.length} Contacts
              </p>
            </div>
          </div>
          
          <div className="flex items-center gap-3 w-full sm:w-auto">
            {/* View Toggle */}
            <div className="hidden sm:flex bg-slate-100/80 rounded-xl p-1 border border-slate-200/50">
              <button
                onClick={() => setViewMode('grid')}
                className={`p-2 rounded-lg transition-all duration-200 ${viewMode === 'grid' ? 'bg-white shadow-sm text-emerald-600' : 'text-slate-400 hover:text-slate-600'}`}
              >
                <LayoutGrid size={18} />
              </button>
              <button
                onClick={() => setViewMode('list')}
                className={`p-2 rounded-lg transition-all duration-200 ${viewMode === 'list' ? 'bg-white shadow-sm text-emerald-600' : 'text-slate-400 hover:text-slate-600'}`}
              >
                <List size={18} />
              </button>
            </div>

            {/* Search Bar */}
            <div className="relative flex-1 sm:w-80 group">
              <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400 group-focus-within:text-emerald-500 transition-colors" size={18} />
              <input
                type="text"
                placeholder="搜索昵称、备注、产品、进展..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="w-full pl-11 pr-4 py-2 md:py-2.5 rounded-xl border border-transparent bg-slate-100/80 hover:bg-slate-100 focus:bg-white focus:outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500 transition-all placeholder:text-slate-400 text-xs md:text-sm font-medium"
              />
            </div>
          </div>
        </div>
      </div>

      {/* List Content */}
      <div className="flex-1 overflow-y-auto p-6 pb-28 w-full custom-scrollbar">
        {filteredContacts.length === 0 ? (
          <div className="h-full flex flex-col items-center justify-center text-slate-300">
            <div className="w-24 h-24 bg-slate-100 rounded-full flex items-center justify-center mb-6">
               <User size={48} className="text-slate-300" />
            </div>
            <p className="text-xl font-semibold text-slate-500">未找到联系人</p>
            <p className="text-sm mt-2 max-w-xs text-center">尝试更改搜索关键词或标签筛选条件。</p>
            
            {(searchTerm || filterTags.size > 0) && (
              <button 
                onClick={handleClearFilters}
                className="mt-6 px-5 py-2 bg-white border border-slate-200 shadow-sm text-slate-600 text-sm font-medium rounded-xl hover:bg-slate-50 hover:text-slate-800 hover:border-slate-300 transition-all active:scale-95 flex items-center gap-2"
              >
                <X size={16} />
                清除筛选与搜索
              </button>
            )}
          </div>
        ) : (
          <>
            {viewMode === 'grid' ? (
              // MODERN GRID VIEW
              <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-6">
                {filteredContacts.map(contact => {
                  const isSelected = selectedIds.has(contact.id);
                  const latestProgress = contact.progressHistory && contact.progressHistory.length > 0 
                      ? contact.progressHistory[0] 
                      : (contact.progress ? { content: contact.progress, date: '' } : null);
                  const isRemarkExpanded = expandedRemarkIds.has(contact.id);
                  const hasLongRemark = contact.remarkInfo && contact.remarkInfo.length > 20;

                  return (
                    <div 
                      key={contact.id} 
                      className={`relative bg-white rounded-2xl shadow-sm border transition-all duration-300 flex flex-col group cursor-pointer hover:shadow-xl hover:-translate-y-1 ${
                        isSelected 
                          ? 'border-emerald-500 ring-2 ring-emerald-500/20 shadow-md' 
                          : 'border-slate-100 hover:border-emerald-100'
                      }`}
                      onClick={() => onEdit(contact)}
                    >
                      {/* Selection Box */}
                      <div 
                        className="absolute top-4 right-4 z-20"
                        onClick={(e) => {
                          e.stopPropagation();
                          onToggleSelect(contact.id);
                        }}
                      >
                         <div className={`transition-all duration-200 transform hover:scale-110 ${isSelected ? 'text-emerald-500' : 'text-slate-200 hover:text-emerald-300'}`}>
                            {isSelected ? <CheckSquare size={22} className="drop-shadow-sm" /> : <Square size={22} />}
                         </div>
                      </div>

                      {/* Card Header (Basic Info + Tags) */}
                      <div className="p-4 md:p-6 pb-4 flex items-start gap-4">
                        <div className="w-12 h-12 md:w-14 md:h-14 rounded-2xl bg-gradient-to-br from-slate-100 to-slate-200 flex items-center justify-center text-slate-600 font-bold text-lg md:text-xl shrink-0 shadow-inner">
                          {contact.remarkName ? contact.remarkName[0] : (contact.nickname ? contact.nickname[0] : '?')}
                        </div>
                        <div className="flex-1 min-w-0 pr-8 pt-0.5">
                          <h3 className="font-bold text-slate-800 truncate text-base md:text-lg leading-tight">
                              {contact.remarkName || contact.nickname || "未知名称"}
                          </h3>
                         
                          {contact.remarkName && contact.nickname && contact.nickname !== contact.remarkName && (
                            <p className="text-xs font-medium text-slate-400 truncate mt-1">
                              {contact.nickname}
                            </p>
                          )}
                          
                          {contact.wxid && (
                             <div 
                               className="mt-2 flex items-center group/wxid cursor-pointer w-fit"
                               onClick={(e) => handleCopyWxid(e, contact.wxid)}
                               title="点击复制微信号"
                             >
                               <span className="text-[10px] font-mono text-slate-400 bg-slate-50 border border-slate-100 px-1.5 py-0.5 rounded-md truncate max-w-full group-hover/wxid:bg-emerald-50 group-hover/wxid:text-emerald-600 group-hover/wxid:border-emerald-200 transition-colors">
                                 {contact.wxid}
                               </span>
                               <div className="ml-1.5 w-4 flex justify-center">
                                  {copiedWxid === contact.wxid ? (
                                      <Check size={10} className="text-emerald-500 animate-in fade-in zoom-in" />
                                  ) : (
                                      <Copy size={10} className="text-slate-300 opacity-0 group-hover/wxid:opacity-100 transition-opacity" />
                                  )}
                               </div>
                             </div>
                          )}

                          {/* Tags moved to Header */}
                          {contact.tags.length > 0 && (
                            <div className="flex flex-wrap gap-1.5 mt-3">
                                {contact.tags.map(tag => (
                                  <span key={tag} className="group/tag inline-flex items-center gap-1 pl-2 pr-1 py-0.5 rounded-full text-[10px] font-bold bg-slate-100 text-slate-600 hover:bg-emerald-50 hover:text-emerald-700 transition-colors cursor-default border border-slate-200 hover:border-emerald-200">
                                    {tag}
                                    <button 
                                      onClick={(e) => {
                                        e.stopPropagation();
                                        onRemoveTagFromContact(contact.id, tag);
                                      }}
                                      className="ml-0.5 text-slate-300 hover:text-rose-500 hover:bg-rose-50 rounded-full p-0.5 transition-all"
                                    >
                                      <X size={10} strokeWidth={3} />
                                    </button>
                                  </span>
                                ))}
                            </div>
                          )}
                        </div>
                      </div>

                      {/* Business Dashboard Widget */}
                      <div className="px-4 md:px-6 pb-2">
                        <div className="bg-slate-50/80 rounded-xl p-3 border border-slate-100/50 flex flex-col gap-2.5">
                            {/* Date & Progress */}
                            <div className="flex items-start gap-2.5">
                                <div className="p-1 rounded bg-blue-50 text-blue-500 mt-0.5 shrink-0">
                                   <Briefcase size={12} strokeWidth={2.5}/>
                                </div>
                                <div className="min-w-0 flex-1">
                                   <div className="flex justify-between items-baseline mb-0.5">
                                      <span className="text-xs font-bold text-slate-700">最新进展</span>
                                      <span className="text-[10px] text-slate-400 font-medium">{contact.lastDate || ''}</span>
                                   </div>
                                   <p className="text-xs text-slate-600 line-clamp-2 leading-relaxed">
                                      {latestProgress ? latestProgress.content : <span className="text-slate-300 italic">无记录</span>}
                                   </p>
                                </div>
                            </div>
                            
                            {/* Products (Deal & Intent) */}
                            {(contact.dealProducts?.length > 0 || contact.intentProducts?.length > 0) && (
                              <div className="flex flex-col gap-2 pt-2 border-t border-slate-200/50">
                                  {contact.dealProducts?.length > 0 && (
                                     <div className="flex items-start gap-2.5">
                                        <div className="p-1 rounded bg-orange-50 text-orange-500 shrink-0 mt-0.5">
                                          <ShoppingBag size={12} strokeWidth={2.5}/>
                                        </div>
                                        <div className="flex flex-wrap gap-1">
                                          {contact.dealProducts.map(p => (
                                            <span key={p} className="text-[10px] font-medium px-1.5 py-0.5 bg-orange-50 border border-orange-100 text-orange-700 rounded-md">
                                              {p}
                                            </span>
                                          ))}
                                        </div>
                                     </div>
                                  )}
                                  
                                  {contact.intentProducts?.length > 0 && (
                                     <div className="flex items-start gap-2.5">
                                        <div className="p-1 rounded bg-blue-50 text-blue-500 shrink-0 mt-0.5">
                                          <Target size={12} strokeWidth={2.5}/>
                                        </div>
                                        <div className="flex flex-wrap gap-1">
                                          {contact.intentProducts.map(p => (
                                            <span key={p} className="text-[10px] font-medium px-1.5 py-0.5 bg-blue-50 border border-blue-100 text-blue-700 rounded-md">
                                              {p}
                                            </span>
                                          ))}
                                        </div>
                                     </div>
                                  )}
                              </div>
                            )}
                        </div>
                      </div>

                      {/* Footer: Remark Info (Expandable) */}
                      <div className="px-4 md:px-6 py-4 mt-auto">
                           {contact.remarkInfo ? (
                             <div className="relative group/remark">
                               <p className={`text-sm text-slate-600 italic pl-2 border-l-2 border-yellow-300/50 transition-all ${isRemarkExpanded ? '' : 'line-clamp-2'}`}>
                                 {contact.remarkInfo}
                               </p>
                               {hasLongRemark && (
                                 <button 
                                   onClick={(e) => toggleRemarkExpand(contact.id, e)}
                                   className="mt-1 flex items-center gap-1 text-[10px] font-bold text-slate-400 hover:text-blue-500 bg-white/80 backdrop-blur-sm px-2 py-0.5 rounded-full transition-colors"
                                 >
                                   {isRemarkExpanded ? (
                                     <>收起 <ChevronUp size={10} /></>
                                   ) : (
                                     <>展开 <ChevronDown size={10} /></>
                                   )}
                                 </button>
                               )}
                             </div>
                           ) : (
                             <div className="h-6"></div> // Spacer for cards without remark
                           )}
                      </div>
                      
                      {/* Action Buttons - Clean Floating */}
                      <div className="absolute top-4 right-12 flex gap-2 z-20 opacity-100 transition-opacity" onClick={(e) => e.stopPropagation()}>
                          <button 
                            onClick={() => onEdit(contact)}
                            className="p-1.5 text-slate-400 hover:text-blue-600 hover:bg-blue-50 rounded-lg transition-all active:scale-95"
                            title="编辑"
                          >
                            <Edit2 size={16} />
                          </button>
                          <button 
                            onClick={() => onDelete(contact.id)}
                            className="p-1.5 text-slate-400 hover:text-rose-600 hover:bg-rose-50 rounded-lg transition-all active:scale-95"
                            title="删除"
                          >
                            <Trash2 size={16} />
                          </button>
                       </div>
                    </div>
                  );
                })}
              </div>
            ) : (
              // MODERN LIST VIEW
              <div className="bg-white rounded-2xl shadow-sm border border-slate-200 overflow-hidden">
                <table className="w-full text-left border-collapse">
                  <thead>
                    <tr className="bg-slate-50/80 text-slate-400 text-xs font-bold uppercase tracking-wider border-b border-slate-100">
                      <th className="px-5 py-4 w-12 text-center">#</th>
                      <th className="px-5 py-4">联系人</th>
                      <th className="px-5 py-4 hidden md:table-cell">微信号</th>
                      <th className="px-5 py-4 w-[25%]">最新进展</th>
                      <th className="px-5 py-4 hidden lg:table-cell w-[15%]">业务信息</th>
                      <th className="px-5 py-4 hidden sm:table-cell">标签</th>
                      <th className="px-5 py-4 w-24 text-right">操作</th>
                    </tr>
                  </thead>
                  <tbody className="text-sm divide-y divide-slate-100">
                    {filteredContacts.map(contact => {
                      const isSelected = selectedIds.has(contact.id);
                      const latestProgress = contact.progressHistory && contact.progressHistory.length > 0 
                          ? contact.progressHistory[0] 
                          : (contact.progress ? { content: contact.progress, date: '' } : null);

                      return (
                        <tr 
                          key={contact.id} 
                          className={`group hover:bg-slate-50/80 transition-colors cursor-pointer ${isSelected ? 'bg-emerald-50/30' : ''}`}
                          onClick={() => onEdit(contact)}
                        >
                          <td className="px-5 py-4 text-center" onClick={(e) => e.stopPropagation()}>
                            <button 
                              onClick={() => onToggleSelect(contact.id)}
                              className={`transition-all hover:scale-110 ${isSelected ? 'text-emerald-500' : 'text-slate-200 group-hover:text-emerald-300'}`}
                            >
                               {isSelected ? <CheckSquare size={18} /> : <Square size={18} />}
                            </button>
                          </td>
                          <td className="px-5 py-4">
                            <div className="flex items-center gap-4">
                              <div className="w-9 h-9 rounded-xl bg-slate-100 flex items-center justify-center text-slate-600 font-bold text-xs shrink-0">
                                {contact.remarkName ? contact.remarkName[0] : (contact.nickname ? contact.nickname[0] : '?')}
                              </div>
                              <div className="flex flex-col">
                                <span className="font-bold text-slate-800">{contact.remarkName || contact.nickname}</span>
                                {contact.remarkName && contact.nickname && contact.remarkName !== contact.nickname && (
                                  <span className="text-xs text-slate-400">{contact.nickname}</span>
                                )}
                              </div>
                            </div>
                          </td>
                          <td className="px-5 py-4 hidden md:table-cell">
                            {contact.wxid ? (
                              <div 
                                className="inline-flex items-center gap-1.5 cursor-pointer group/wxid"
                                onClick={(e) => handleCopyWxid(e, contact.wxid)}
                              >
                                  <span className="font-mono text-xs text-slate-500 bg-slate-100/50 px-2 py-1 rounded-md group-hover/wxid:bg-emerald-50 group-hover/wxid:text-emerald-600 transition-colors">
                                      {contact.wxid}
                                  </span>
                                  <div className="w-3">
                                      {copiedWxid === contact.wxid ? (
                                          <Check size={10} className="text-emerald-500" />
                                      ) : (
                                          <Copy size={10} className="text-slate-300 opacity-0 group-hover/wxid:opacity-100 transition-opacity" />
                                      )}
                                  </div>
                              </div>
                            ) : (
                              <span className="text-slate-300">-</span>
                            )}
                          </td>
                          <td className="px-5 py-4">
                            {latestProgress ? (
                               <div className="max-w-xs" title={latestProgress.content}>
                                 <div className="text-slate-700 font-medium whitespace-normal break-words line-clamp-2">{latestProgress.content}</div>
                                 {latestProgress.date && <div className="text-xs text-slate-400 mt-0.5">{latestProgress.date}</div>}
                               </div>
                            ) : (
                              <span className="text-slate-300 text-xs italic">无记录</span>
                            )}
                          </td>
                          <td className="px-5 py-4 hidden lg:table-cell text-slate-600">
                             <div className="flex flex-col gap-1">
                                {contact.dealProducts?.length > 0 && (
                                   <div className="flex flex-wrap gap-1">
                                      {contact.dealProducts.slice(0, 2).map(p => (
                                        <span key={p} className="text-[10px] bg-orange-50 text-orange-700 px-1.5 rounded-md border border-orange-100 truncate max-w-[80px]">{p}</span>
                                      ))}
                                   </div>
                                )}
                                {contact.intentProducts?.length > 0 && (
                                   <div className="flex flex-wrap gap-1">
                                      {contact.intentProducts.slice(0, 2).map(p => (
                                        <span key={p} className="text-[10px] bg-blue-50 text-blue-700 px-1.5 rounded-md border border-blue-100 truncate max-w-[80px]">{p}</span>
                                      ))}
                                   </div>
                                )}
                                {(!contact.dealProducts?.length && !contact.intentProducts?.length) && <span className="text-slate-300">-</span>}
                             </div>
                          </td>
                          <td className="px-5 py-4 hidden sm:table-cell">
                            <div className="flex flex-wrap gap-1.5">
                              {contact.tags.slice(0, 3).map(tag => (
                                <span key={tag} className="inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-bold bg-slate-100 text-slate-500 border border-slate-200">
                                  {tag}
                                </span>
                              ))}
                              {contact.tags.length > 3 && (
                                <span className="text-xs text-slate-400 flex items-center bg-slate-50 px-1.5 rounded-full">+{contact.tags.length - 3}</span>
                              )}
                            </div>
                          </td>
                          <td className="px-5 py-4 text-right">
                             <div className="flex items-center justify-end gap-1" onClick={(e) => e.stopPropagation()}>
                                <button 
                                  onClick={() => onEdit(contact)}
                                  className="p-2 text-slate-400 hover:text-blue-600 hover:bg-blue-50 rounded-lg transition-colors"
                                >
                                  <ChevronRight size={16} />
                                </button>
                                <button 
                                  onClick={() => onDelete(contact.id)}
                                  className="p-2 text-slate-400 hover:text-rose-600 hover:bg-rose-50 rounded-lg transition-colors"
                                >
                                  <Trash2 size={16} />
                                </button>
                             </div>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            )}
          </>
        )}
      </div>

      {isSelectionMode && (
        <div className="fixed sm:absolute bottom-4 sm:bottom-8 left-4 sm:left-1/2 right-4 sm:right-auto sm:-translate-x-1/2 backdrop-blur-xl bg-white/90 shadow-2xl shadow-emerald-900/10 border border-white/20 ring-1 ring-slate-200 rounded-2xl px-2 py-2 flex items-center gap-1 sm:gap-2 animate-in slide-in-from-bottom-6 duration-300 z-50 overflow-x-auto no-scrollbar">
            <div className="px-3 sm:px-4 py-2 bg-slate-100 rounded-xl text-xs sm:text-sm font-bold text-slate-700 whitespace-nowrap">
                {selectedIds.size} 已选
            </div>
            
            <div className="w-px h-6 bg-slate-200 mx-1 sm:mx-2 shrink-0" />
            
            <button 
                onClick={onBatchAddTag}
                className="flex items-center gap-1.5 sm:gap-2 px-3 sm:px-4 py-2 sm:py-2.5 text-xs sm:text-sm font-semibold text-slate-600 hover:text-emerald-700 hover:bg-emerald-50 rounded-xl transition-all whitespace-nowrap"
            >
                <Tag size={14} className="sm:w-4 sm:h-4" />
                <span>加标签</span>
            </button>
            <button 
                onClick={onBatchRemoveTag}
                className="flex items-center gap-1.5 sm:gap-2 px-3 sm:px-4 py-2 sm:py-2.5 text-xs sm:text-sm font-semibold text-slate-600 hover:text-rose-600 hover:bg-rose-50 rounded-xl transition-all whitespace-nowrap"
            >
                <Tag size={14} className="sm:w-4 sm:h-4" />
                <span>减标签</span>
            </button>
            
            <div className="w-px h-6 bg-slate-200 mx-1 sm:mx-2 shrink-0" />
            
            <button 
                onClick={onBatchDelete}
                className="flex items-center gap-1.5 sm:gap-2 px-3 sm:px-4 py-2 sm:py-2.5 text-xs sm:text-sm font-bold text-rose-500 hover:text-rose-700 hover:bg-rose-50 rounded-xl transition-all whitespace-nowrap"
            >
                <Trash2 size={14} className="sm:w-4 sm:h-4" />
                <span>删除</span>
            </button>
            
            <button 
                onClick={onDeselectAll}
                className="ml-1 sm:ml-2 w-7 h-7 sm:w-8 sm:h-8 flex items-center justify-center rounded-full hover:bg-slate-100 text-slate-400 transition-colors shrink-0"
                title="关闭"
            >
                <X size={14} className="sm:w-4 sm:h-4" />
            </button>
        </div>
      )}
    </div>
  );
};