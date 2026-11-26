import React, { useState } from 'react';
import { Contact } from '../types';
import { Search, Tag, User, Edit2, Trash2, CheckSquare, Square, ShoppingBag, X, LayoutGrid, List, ChevronRight, Target, ChevronDown, ChevronUp, Copy, Check, Briefcase, Clock, CheckCircle2 } from 'lucide-react';
import { PageHeader } from './PageHeader';

const FOLLOW_UP_STATUS = [
  { value: 'following', label: '跟进中' },
  { value: 'contacted', label: '已沟通' },
  { value: 'idle', label: '暂未跟进' }
] as const;

interface ContactListProps {
  contacts: Contact[];
  onEdit: (contact: Contact) => void;
  onDelete: (id: string) => void;
  filterTags: Set<string>;
  followUpFilter: 'idle' | 'following' | 'contacted' | null;
  selectedIds: Set<string>;
  onToggleSelect: (id: string) => void;
  onSelectAll: (ids: string[]) => void;
  onDeselectAll: () => void;
  onBatchAddTag: () => void;
  onBatchRemoveTag: () => void;
  onBatchDelete: () => void;
  onRemoveTagFromContact: (contactId: string, tag: string) => void;
  onClearTags: () => void;
  onUpdateStatus?: (contactId: string, newStatus: 'following' | 'contacted' | 'idle') => void;
  onBatchUpdateStatus?: (ids: string[], newStatus: 'following' | 'contacted' | 'idle') => void;
}

export const ContactList: React.FC<ContactListProps> = ({
  contacts,
  onEdit,
  onDelete,
  filterTags,
  followUpFilter,
  selectedIds,
  onToggleSelect,
  onSelectAll,
  onDeselectAll,
  onBatchAddTag,
  onBatchRemoveTag,
  onBatchDelete,
  onRemoveTagFromContact,
  onClearTags,
  onUpdateStatus,
  onBatchUpdateStatus
}) => {
  const [searchTerm, setSearchTerm] = useState('');
  const [viewMode, setViewMode] = useState<'grid' | 'list'>('grid');
  const [expandedRemarkIds, setExpandedRemarkIds] = useState<Set<string>>(new Set());
  const [copiedWxid, setCopiedWxid] = useState<string | null>(null);
  const [localFollowUpFilter, setLocalFollowUpFilter] = useState<'idle' | 'following' | 'contacted' | null>(null);
  const [showBatchStatusMenu, setShowBatchStatusMenu] = useState(false);

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
    setLocalFollowUpFilter(null);
  };

  const handleFollowUpFilterChange = (value: 'idle' | 'following' | 'contacted' | null) => {
    setLocalFollowUpFilter(value);
  };

  const filteredContacts = contacts.filter(contact => {
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

    const matchesTag = filterTags.size === 0 || contact.tags.some(tag => filterTags.has(tag));

    const matchesFollowUpStatus = (followUpFilter || localFollowUpFilter) === null || contact.followUpStatus === (followUpFilter || localFollowUpFilter);
    return matchesSearch && matchesTag && matchesFollowUpStatus;
  });

  const allSelected = filteredContacts.length > 0 && filteredContacts.every(c => selectedIds.has(c.id));
  const isSelectionMode = selectedIds.size > 0;

  React.useEffect(() => {
    console.log('ContactList state:', { contactsCount: contacts.length, filteredCount: filteredContacts.length, filterTagsCount: filterTags.size, viewMode, selectedIdsCount: selectedIds.size, isSelectionMode, searchTermLen: searchTerm.length });
  }, [contacts.length, filteredContacts.length, filterTags, viewMode, selectedIds, isSelectionMode, searchTerm.length]);

  const handleSelectAllClick = () => {
    if (allSelected) {
      onDeselectAll();
    } else {
      onSelectAll(filteredContacts.map(c => c.id));
    }
  };

  return (
    <div className="flex-1 h-full w-full overflow-hidden flex flex-col bg-white relative">
      <div className="sticky top-0 z-20 shrink-0 bg-white border-b border-gray-100">
        <PageHeader
          title={filterTags.size > 0 ? `筛选：${filterTags.size} 个标签` : '全部联系人'}
          count={filteredContacts.length}
          selectedCount={selectedIds.size}
          allSelected={allSelected}
          onSelectAll={handleSelectAllClick}
          actionButton={
            <div className="flex items-center gap-2">
              <div className="hidden sm:flex bg-gray-100 rounded-md p-0.5">
                <button
                  onClick={() => setViewMode('grid')}
                  className={`p-1 rounded transition-all duration-150 ${viewMode === 'grid' ? 'bg-white text-gray-900' : 'text-gray-400 hover:text-gray-600'}`}
                >
                  <LayoutGrid size={13} />
                </button>
                <button
                  onClick={() => setViewMode('list')}
                  className={`p-1 rounded transition-all duration-150 ${viewMode === 'list' ? 'bg-white text-gray-900' : 'text-gray-400 hover:text-gray-600'}`}
                >
                  <List size={13} />
                </button>
              </div>
              <div className="hidden md:flex items-center gap-1 bg-gray-100 rounded-md p-0.5">
                <button
                  onClick={() => handleFollowUpFilterChange(null)}
                  className={`px-2 py-1 rounded text-xs font-medium transition-all ${localFollowUpFilter === null && followUpFilter === null ? 'bg-white text-gray-900' : 'text-gray-500 hover:text-gray-900'}`}
                >
                  全部
                </button>
                <button
                  onClick={() => handleFollowUpFilterChange('following')}
                  className={`px-2 py-1 rounded text-xs font-medium transition-all ${localFollowUpFilter === 'following' || followUpFilter === 'following' ? 'bg-white text-gray-900' : 'text-gray-500 hover:text-gray-900'}`}
                >
                  跟进中
                </button>
                <button
                  onClick={() => handleFollowUpFilterChange('contacted')}
                  className={`px-2 py-1 rounded text-xs font-medium transition-all ${localFollowUpFilter === 'contacted' || followUpFilter === 'contacted' ? 'bg-white text-gray-900' : 'text-gray-500 hover:text-gray-900'}`}
                >
                  已沟通
                </button>
                <button
                  onClick={() => handleFollowUpFilterChange('idle')}
                  className={`px-2 py-1 rounded text-xs font-medium transition-all ${localFollowUpFilter === 'idle' || followUpFilter === 'idle' ? 'bg-white text-gray-900' : 'text-gray-500 hover:text-gray-900'}`}
                >
                  暂未跟进
                </button>
              </div>
            </div>
          }
          searchBox={
            <div className="relative w-full sm:w-44">
              <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 text-gray-400" size={12} />
              <input
                type="text"
                placeholder="搜索联系人..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="w-full pl-8 pr-3 py-1.5 rounded-md border border-gray-200 bg-white hover:bg-white focus:bg-white focus:outline-none transition-all text-xs"
              />
            </div>
          }
        />
      </div>

      <div className="flex-1 overflow-y-auto p-2 md:p-3 pb-24">
        {filteredContacts.length === 0 ? (
          <div className="h-full flex flex-col items-center justify-center text-gray-300">
            <div className="w-14 h-14 bg-gray-100 rounded-full flex items-center justify-center mb-3">
              <User size={26} className="text-gray-300" />
            </div>
            <p className="text-sm font-medium text-gray-500">暂无联系人</p>
            <p className="text-xs mt-1 text-gray-400">添加或导入联系人开始使用</p>

            {(searchTerm || filterTags.size > 0) && (
              <button
                onClick={handleClearFilters}
                className="mt-3 px-3 py-1.5 border border-gray-200 text-gray-500 text-xs font-medium rounded-md hover:bg-gray-50 transition-all cursor-pointer"
              >
                清除筛选
              </button>
            )}
          </div>
        ) : (
          <>
            {viewMode === 'grid' ? (
              <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-3 xl:grid-cols-4 gap-2 md:gap-3">
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
                      className={`group bg-white border rounded-lg transition-all duration-150 flex flex-col cursor-pointer relative
                        ${isSelected
                          ? 'border-gray-400'
                          : 'border-gray-100 hover:border-gray-200'}`}
                      onClick={() => onEdit(contact)}
                    >
                      <div className="absolute top-2 right-2 flex items-center gap-1 z-10">
                        <button
                          onClick={(e) => { e.stopPropagation(); onDelete(contact.id); }}
                          className="p-1.5 text-gray-400 hover:text-red-600 hover:bg-red-50 rounded-md transition-all cursor-pointer opacity-0 group-hover:opacity-100"
                          title="删除"
                        >
                          <Trash2 size={12} />
                        </button>
                        <button
                          onClick={(e) => { e.stopPropagation(); onToggleSelect(contact.id); }}
                          className={`w-5 h-5 rounded border flex items-center justify-center transition-all ${
                            isSelected
                              ? 'bg-gray-900 border-gray-900 text-white'
                              : 'bg-white border-gray-300 text-transparent hover:border-gray-400'
                          }`}
                        >
                          <Check size={12} strokeWidth={3} />
                        </button>
                      </div>
                      <div className="p-2.5 flex items-start gap-3">
                        <div className="w-10 h-10 rounded-lg bg-gray-100 flex items-center justify-center text-gray-600 font-semibold text-sm shrink-0">
                          {contact.remarkName ? contact.remarkName[0] : (contact.nickname ? contact.nickname[0] : '?')}
                        </div>
                        <div className="flex-1 min-w-0">
                          <h3 className="font-semibold text-gray-900 truncate text-sm">
                            {contact.remarkName || contact.nickname || "未知"}
                          </h3>

                          {contact.wxid && (
                            <div
                              className="mt-1 flex items-center gap-1 cursor-pointer w-fit"
                              onClick={(e) => handleCopyWxid(e, contact.wxid)}
                            >
                              <span className="text-[10px] font-mono text-gray-500 bg-gray-100 px-1 py-0.5 rounded">
                                {contact.wxid}
                              </span>
                              {copiedWxid === contact.wxid ? (
                                <Check size={10} className="text-gray-900" />
                              ) : (
                                <Copy size={10} className="text-gray-300" />
                              )}
                            </div>
                          )}

                          <div className="flex flex-wrap gap-1 mt-1.5">
                            <span className={`inline-flex items-center px-1.5 py-0.5 rounded text-[9px] font-medium ${
                              contact.followUpStatus === 'following' ? 'bg-blue-100 text-blue-700' :
                              contact.followUpStatus === 'contacted' ? 'bg-green-100 text-green-700' :
                              'bg-gray-100 text-gray-600'
                            }`}>
                              {contact.followUpStatus === 'following' ? '跟进中' :
                               contact.followUpStatus === 'contacted' ? '已沟通' :
                               '暂未跟进'}
                            </span>
                          </div>
                        </div>
                      </div>

                      <div className="px-2.5 pb-2">
                        <div className="bg-gray-50 rounded-md p-2 flex flex-col gap-1">
                          <div className="flex items-start gap-1.5">
                            <div className="p-0.5 rounded bg-gray-200 text-gray-600 mt-0.5 shrink-0">
                              <Briefcase size={9} strokeWidth={2.5} />
                            </div>
                            <div className="flex-1 min-w-0">
                              <span className="text-[9px] font-medium text-gray-500">进展</span>
                              <p className="text-[10px] text-gray-600 line-clamp-1 leading-relaxed mt-0.5">
                                {latestProgress ? latestProgress.content : <span className="text-gray-400 italic">暂无</span>}
                              </p>
                            </div>
                          </div>

                          {(contact.dealProducts?.length > 0 || contact.intentProducts?.length > 0) && (
                            <div className="flex flex-col gap-1.5 pt-1.5 border-t border-gray-100">
                              {contact.dealProducts?.length > 0 && (
                                <div className="flex items-start gap-2">
                                  <div className="p-1 rounded bg-gray-200 text-gray-600 shrink-0 mt-0.5">
                                    <ShoppingBag size={11} strokeWidth={2.5} />
                                  </div>
                                  <div className="flex flex-wrap gap-1">
                                    {contact.dealProducts.map(p => (
                                      <span key={p} className="text-[10px] font-medium px-1.5 py-0.5 bg-gray-100 text-gray-700 rounded">
                                        {p}
                                      </span>
                                    ))}
                                  </div>
                                </div>
                              )}

                              {contact.intentProducts?.length > 0 && (
                                <div className="flex items-start gap-2">
                                  <div className="p-1 rounded bg-gray-200 text-gray-600 shrink-0 mt-0.5">
                                    <Target size={11} strokeWidth={2.5} />
                                  </div>
                                  <div className="flex flex-wrap gap-1">
                                    {contact.intentProducts.map(p => (
                                      <span key={p} className="text-[10px] font-medium px-1.5 py-0.5 bg-gray-100 text-gray-700 rounded">
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

                      <div className="px-4 py-3 mt-auto border-t border-gray-50">
                        {contact.remarkInfo ? (
                          <div className="relative">
                            <p className={`text-sm text-gray-500 italic pl-2 border-l border-gray-200 ${isRemarkExpanded ? '' : 'line-clamp-2'}`}>
                              {contact.remarkInfo}
                            </p>
                            {hasLongRemark && (
                              <button
                                onClick={(e) => toggleRemarkExpand(contact.id, e)}
                                className="mt-1.5 flex items-center gap-1 text-[10px] font-medium text-gray-400 hover:text-gray-900 transition-colors cursor-pointer"
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
                          <div className="h-5" />
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
            ) : (
              <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="bg-gray-50 text-gray-500 text-xs font-semibold uppercase tracking-wider border-b border-gray-200">
                      <th className="px-4 py-3 w-10 text-center">#</th>
                      <th className="px-4 py-3">联系人</th>
                      <th className="px-4 py-3 hidden md:table-cell">微信号</th>
                      <th className="px-4 py-3 w-[30%]">最新进展</th>
                      <th className="px-4 py-3 hidden lg:table-cell w-[20%]">业务信息</th>
                      <th className="px-4 py-3 hidden sm:table-cell">跟进状态</th>
                      <th className="px-4 py-3 w-20 text-right">操作</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-100">
                    {filteredContacts.map(contact => {
                      const isSelected = selectedIds.has(contact.id);
                      const latestProgress = contact.progressHistory && contact.progressHistory.length > 0
                          ? contact.progressHistory[0]
                          : (contact.progress ? { content: contact.progress, date: '' } : null);

                      return (
                        <tr
                          key={contact.id}
                          className={`group hover:bg-gray-50 transition-colors cursor-pointer ${isSelected ? 'bg-gray-50' : ''}`}
                          onClick={() => onEdit(contact)}
                        >
                          <td className="px-4 py-3 text-center" onClick={(e) => e.stopPropagation()}>
                            <button
                              onClick={() => onToggleSelect(contact.id)}
                              className={`p-1.5 rounded-md transition-all ${isSelected ? 'bg-gray-900 text-white' : 'bg-white border border-gray-200 text-gray-300 hover:text-gray-900 hover:border-gray-400'}`}
                            >
                              {isSelected ? <CheckSquare size={17} /> : <Square size={17} />}
                            </button>
                          </td>
                          <td className="px-4 py-3">
                            <div className="flex items-center gap-3">
                              <div className="w-8 h-8 rounded-lg bg-gray-100 flex items-center justify-center text-gray-600 font-semibold text-xs shrink-0">
                                {contact.remarkName ? contact.remarkName[0] : (contact.nickname ? contact.nickname[0] : '?')}
                              </div>
                              <div className="flex flex-col">
                                <span className="font-medium text-gray-900">{contact.remarkName || contact.nickname}</span>
                                {contact.remarkName && contact.nickname && contact.remarkName !== contact.nickname && (
                                  <span className="text-xs text-gray-400">{contact.nickname}</span>
                                )}
                              </div>
                            </div>
                          </td>
                          <td className="px-4 py-3 hidden md:table-cell">
                            {contact.wxid ? (
                              <div
                                className="inline-flex items-center gap-1 cursor-pointer"
                                onClick={(e) => handleCopyWxid(e, contact.wxid)}
                              >
                                <span className="font-mono text-xs text-gray-600 bg-gray-100 px-2 py-0.5 rounded">
                                  {contact.wxid}
                                </span>
                                {copiedWxid === contact.wxid ? (
                                  <Check size={10} className="text-gray-900" />
                                ) : (
                                  <Copy size={10} className="text-gray-300" />
                                )}
                              </div>
                            ) : (
                              <span className="text-gray-300">-</span>
                            )}
                          </td>
                          <td className="px-4 py-3">
                            {latestProgress ? (
                              <div className="max-w-[200px]" title={latestProgress.content}>
                                <div className="text-gray-700 font-medium whitespace-normal break-words line-clamp-2">{latestProgress.content}</div>
                                {latestProgress.date && <div className="text-xs text-gray-400 mt-0.5">{latestProgress.date}</div>}
                              </div>
                            ) : (
                              <span className="text-gray-400 text-xs italic">无记录</span>
                            )}
                          </td>
                          <td className="px-4 py-3 hidden lg:table-cell text-gray-600">
                            <div className="flex flex-col gap-1">
                              {contact.dealProducts?.length > 0 && (
                                <div className="flex flex-wrap gap-1">
                                  {contact.dealProducts.slice(0, 2).map(p => (
                                    <span key={p} className="text-[10px] bg-amber-50 text-amber-700 px-1.5 py-0.5 rounded border border-amber-100 truncate max-w-[80px]">{p}</span>
                                  ))}
                                </div>
                              )}
                              {contact.intentProducts?.length > 0 && (
                                <div className="flex flex-wrap gap-1">
                                  {contact.intentProducts.slice(0, 2).map(p => (
                                    <span key={p} className="text-[10px] bg-blue-50 text-blue-700 px-1.5 py-0.5 rounded border border-blue-100 truncate max-w-[80px]">{p}</span>
                                  ))}
                                </div>
                              )}
                              {(!contact.dealProducts?.length && !contact.intentProducts?.length) && <span className="text-gray-300">-</span>}
                            </div>
                          </td>
                          <td className="px-4 py-3 hidden sm:table-cell">
                            <div className="flex flex-wrap gap-1">
                              <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-medium ${
                                contact.followUpStatus === 'following' ? 'bg-blue-100 text-blue-700' :
                                contact.followUpStatus === 'contacted' ? 'bg-green-100 text-green-700' :
                                'bg-gray-100 text-gray-600'
                              }`}>
                                {contact.followUpStatus === 'following' ? '跟进中' :
                                 contact.followUpStatus === 'contacted' ? '已沟通' :
                                 '暂未跟进'}
                              </span>
                            </div>
                          </td>
                          <td className="px-4 py-3 text-right">
                            <div className="flex items-center justify-end gap-0.5 opacity-0 group-hover:opacity-100 transition-opacity" onClick={(e) => e.stopPropagation()}>
                              <button
                                onClick={() => onDelete(contact.id)}
                                className="p-1.5 text-gray-400 hover:text-red-600 hover:bg-red-50 rounded transition-colors cursor-pointer"
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
        <div className="fixed bottom-4 left-4 right-4 sm:left-1/2 sm:right-auto sm:-translate-x-1/2 bg-white border border-gray-200 shadow-lg rounded-lg px-3 py-2 flex items-center gap-2 z-50 max-w-[90vw] sm:max-w-none">
          <div className="px-2 py-1 bg-gray-900 rounded text-[10px] font-medium text-white whitespace-nowrap">
            {selectedIds.size} 已选
          </div>

          <div className="w-px h-4 bg-gray-200" />

          <button
            onClick={onBatchAddTag}
            className="flex items-center gap-1 px-2 py-1 text-[10px] font-medium text-gray-600 hover:text-gray-900 hover:bg-gray-100 rounded-md transition-all cursor-pointer"
          >
            <Tag size={10} />
            <span>加标签</span>
          </button>
          <button
            onClick={onBatchRemoveTag}
            className="flex items-center gap-1 px-2 py-1 text-[10px] font-medium text-gray-600 hover:text-gray-900 hover:bg-gray-100 rounded-md transition-all cursor-pointer"
          >
            <Tag size={10} />
            <span>减标签</span>
          </button>

          <div className="w-px h-4 bg-gray-200" />

          <div className="relative">
            <button
              onClick={() => setShowBatchStatusMenu(!showBatchStatusMenu)}
              className="flex items-center gap-1 px-2 py-1 text-[10px] font-medium text-gray-600 hover:text-gray-900 hover:bg-gray-100 rounded-md transition-all cursor-pointer"
            >
              <Clock size={10} />
              <span>跟进状态</span>
            </button>
            {showBatchStatusMenu && (
              <div className="absolute bottom-full left-0 mb-1 bg-white border border-gray-200 rounded-md shadow-lg py-1 z-50">
                <button
                  onClick={() => { onBatchUpdateStatus?.(Array.from(selectedIds), 'following'); setShowBatchStatusMenu(false); }}
                  className="w-full text-left px-3 py-1.5 text-xs hover:bg-gray-100 transition-colors"
                >
                  跟进中
                </button>
                <button
                  onClick={() => { onBatchUpdateStatus?.(Array.from(selectedIds), 'contacted'); setShowBatchStatusMenu(false); }}
                  className="w-full text-left px-3 py-1.5 text-xs hover:bg-gray-100 transition-colors"
                >
                  已沟通
                </button>
                <button
                  onClick={() => { onBatchUpdateStatus?.(Array.from(selectedIds), 'idle'); setShowBatchStatusMenu(false); }}
                  className="w-full text-left px-3 py-1.5 text-xs hover:bg-gray-100 transition-colors"
                >
                  暂未跟进
                </button>
              </div>
            )}
          </div>

          <div className="w-px h-4 bg-gray-200" />

          <button
            onClick={onBatchDelete}
            className="flex items-center gap-1 px-2 py-1 text-[10px] font-medium text-gray-600 hover:text-gray-900 hover:bg-gray-100 rounded-md transition-all cursor-pointer"
          >
            <Trash2 size={10} />
            <span>删除</span>
          </button>

          <button
            onClick={onDeselectAll}
            className="ml-auto w-6 h-6 flex items-center justify-center rounded-md hover:bg-gray-100 text-gray-400 transition-all cursor-pointer"
          >
            <X size={12} />
          </button>
        </div>
      )}
    </div>
  );
};
