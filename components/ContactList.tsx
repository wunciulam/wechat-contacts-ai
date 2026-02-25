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
    <div className="flex-1 h-full w-full overflow-hidden flex flex-col bg-gray-50 relative animate-fade-in">
      <div className="sticky top-0 z-20 shrink-0 bg-white border-b border-gray-100 shadow-sm">
        <div className="p-4 md:p-5 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <button
              onClick={handleSelectAllClick}
              className="flex items-center justify-center w-9 h-9 rounded-lg hover:bg-gray-100 transition-colors text-gray-400 hover:text-primary-600 cursor-pointer"
              title={allSelected ? "取消全选" : "全选当前列表"}
            >
              {allSelected ? <CheckSquare size={20} className="text-primary-600"/> : <Square size={20} />}
            </button>

            <div>
              <h2 className="text-lg font-semibold text-gray-900 flex items-center gap-2">
                {filterTags.size > 0 ? `筛选: ${filterTags.size} 个标签` : '通讯录'}
                {isSelectionMode && (
                  <span className="text-xs font-medium text-primary-600 bg-primary-50 px-2 py-0.5 rounded-full">
                    已选 {selectedIds.size}
                  </span>
                )}
              </h2>
              <p className="text-xs text-gray-400 mt-0.5">共 {filteredContacts.length} 个联系人</p>
            </div>
          </div>

          <div className="flex items-center gap-3 w-full sm:w-auto">
            <div className="hidden sm:flex bg-gray-100 rounded-lg p-0.5 border border-gray-200">
              <button
                onClick={() => setViewMode('grid')}
                className={`p-2 rounded-md transition-all duration-200 ${viewMode === 'grid' ? 'bg-white shadow-sm text-primary-600' : 'text-gray-500 hover:text-gray-700'}`}
              >
                <LayoutGrid size={17} />
              </button>
              <button
                onClick={() => setViewMode('list')}
                className={`p-2 rounded-md transition-all duration-200 ${viewMode === 'list' ? 'bg-white shadow-sm text-primary-600' : 'text-gray-500 hover:text-gray-700'}`}
              >
                <List size={17} />
              </button>
            </div>

            <div className="relative flex-1 sm:w-72">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" size={17} />
              <input
                type="text"
                placeholder="搜索昵称、备注、产品、进展..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="w-full pl-10 pr-4 py-2 rounded-lg border border-gray-200 bg-gray-50 hover:bg-white focus:bg-white focus:outline-none focus:ring-2 focus:ring-primary-500/20 focus:border-primary-500 transition-all text-sm"
              />
            </div>
          </div>
        </div>
      </div>

      <div className="flex-1 overflow-y-auto p-5 pb-28">
        {filteredContacts.length === 0 ? (
          <div className="h-full flex flex-col items-center justify-center text-gray-300">
            <div className="w-20 h-20 bg-gray-100 rounded-full flex items-center justify-center mb-5">
              <User size={40} className="text-gray-300" />
            </div>
            <p className="text-lg font-medium text-gray-500">未找到联系人</p>
            <p className="text-sm mt-2 text-gray-400">尝试更改搜索关键词或标签筛选条件。</p>

            {(searchTerm || filterTags.size > 0) && (
              <button
                onClick={handleClearFilters}
                className="mt-5 px-4 py-2 bg-white border border-gray-200 shadow-sm text-gray-600 text-sm font-medium rounded-lg hover:bg-gray-50 hover:text-gray-900 transition-colors cursor-pointer flex items-center gap-2"
              >
                <X size={15} />
                清除筛选与搜索
              </button>
            )}
          </div>
        ) : (
          <>
            {viewMode === 'grid' ? (
              <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-5">
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
                      className={`bg-white rounded-xl border transition-all duration-200 flex flex-col cursor-pointer
                        ${isSelected
                          ? 'border-primary-300 ring-1 ring-primary-200 shadow-md'
                          : 'border-gray-200 hover:border-gray-300 hover:shadow-md'}`}
                      onClick={() => onEdit(contact)}
                    >
                      <div className="absolute top-3 right-3 z-10">
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            onToggleSelect(contact.id);
                          }}
                          className={`p-1 transition-colors ${isSelected ? 'text-primary-600' : 'text-gray-300 hover:text-primary-400'}`}
                        >
                          {isSelected ? <CheckSquare size={19} /> : <Square size={19} />}
                        </button>
                      </div>

                      <div className="p-4 pb-3 flex items-start gap-3">
                        <div className="w-11 h-11 rounded-lg bg-gray-100 flex items-center justify-center text-gray-600 font-semibold text-lg shrink-0">
                          {contact.remarkName ? contact.remarkName[0] : (contact.nickname ? contact.nickname[0] : '?')}
                        </div>
                        <div className="flex-1 min-w-0 pr-7">
                          <h3 className="font-semibold text-gray-900 truncate text-base">
                            {contact.remarkName || contact.nickname || "未知名称"}
                          </h3>

                          {contact.remarkName && contact.nickname && contact.nickname !== contact.remarkName && (
                            <p className="text-xs text-gray-400 truncate mt-0.5">
                              {contact.nickname}
                            </p>
                          )}

                          {contact.wxid && (
                            <div
                              className="mt-2 flex items-center gap-1 cursor-pointer w-fit"
                              onClick={(e) => handleCopyWxid(e, contact.wxid)}
                              title="点击复制微信号"
                            >
                              <span className="text-xs font-mono text-gray-500 bg-gray-100 px-1.5 py-0.5 rounded">
                                {contact.wxid}
                              </span>
                              {copiedWxid === contact.wxid ? (
                                <Check size={10} className="text-primary-600" />
                              ) : (
                                <Copy size={10} className="text-gray-300" />
                              )}
                            </div>
                          )}

                          {contact.tags.length > 0 && (
                            <div className="flex flex-wrap gap-1.5 mt-3">
                              {contact.tags.slice(0, 4).map(tag => (
                                <span key={tag} className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium bg-gray-100 text-gray-600">
                                  {tag}
                                  <button
                                    onClick={(e) => {
                                      e.stopPropagation();
                                      onRemoveTagFromContact(contact.id, tag);
                                    }}
                                    className="ml-0.5 text-gray-400 hover:text-red-500 transition-colors"
                                  >
                                    <X size={10} strokeWidth={3} />
                                  </button>
                                </span>
                              ))}
                            </div>
                          )}
                        </div>
                      </div>

                      <div className="px-4 pb-3">
                        <div className="bg-gray-50 rounded-lg p-3 flex flex-col gap-2">
                          <div className="flex items-start gap-2">
                            <div className="p-1 rounded bg-primary-50 text-primary-600 mt-0.5 shrink-0">
                              <Briefcase size={11} strokeWidth={2.5} />
                            </div>
                            <div className="flex-1 min-w-0">
                              <div className="flex justify-between items-baseline">
                                <span className="text-xs font-medium text-gray-700">最新进展</span>
                                <span className="text-[10px] text-gray-400">{contact.lastDate || ''}</span>
                              </div>
                              <p className="text-xs text-gray-600 line-clamp-2 leading-relaxed mt-0.5">
                                {latestProgress ? latestProgress.content : <span className="text-gray-400 italic">无记录</span>}
                              </p>
                            </div>
                          </div>

                          {(contact.dealProducts?.length > 0 || contact.intentProducts?.length > 0) && (
                            <div className="flex flex-col gap-1.5 pt-1.5 border-t border-gray-200/50">
                              {contact.dealProducts?.length > 0 && (
                                <div className="flex items-start gap-2">
                                  <div className="p-1 rounded bg-amber-50 text-amber-600 shrink-0 mt-0.5">
                                    <ShoppingBag size={11} strokeWidth={2.5} />
                                  </div>
                                  <div className="flex flex-wrap gap-1">
                                    {contact.dealProducts.map(p => (
                                      <span key={p} className="text-[10px] font-medium px-1.5 py-0.5 bg-amber-50 border border-amber-100 text-amber-700 rounded">
                                        {p}
                                      </span>
                                    ))}
                                  </div>
                                </div>
                              )}

                              {contact.intentProducts?.length > 0 && (
                                <div className="flex items-start gap-2">
                                  <div className="p-1 rounded bg-blue-50 text-blue-600 shrink-0 mt-0.5">
                                    <Target size={11} strokeWidth={2.5} />
                                  </div>
                                  <div className="flex flex-wrap gap-1">
                                    {contact.intentProducts.map(p => (
                                      <span key={p} className="text-[10px] font-medium px-1.5 py-0.5 bg-blue-50 border border-blue-100 text-blue-700 rounded">
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

                      <div className="px-4 py-3 mt-auto border-t border-gray-100">
                        {contact.remarkInfo ? (
                          <div className="relative">
                            <p className={`text-sm text-gray-500 italic pl-2 border-l-2 border-yellow-300/50 ${isRemarkExpanded ? '' : 'line-clamp-2'}`}>
                              {contact.remarkInfo}
                            </p>
                            {hasLongRemark && (
                              <button
                                onClick={(e) => toggleRemarkExpand(contact.id, e)}
                                className="mt-1.5 flex items-center gap-1 text-[10px] font-medium text-gray-400 hover:text-primary-600 transition-colors cursor-pointer"
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

                      <div className="absolute top-3 right-10 flex gap-1 z-10">
                        <button
                          onClick={(e) => { e.stopPropagation(); onEdit(contact); }}
                          className="p-1.5 text-gray-400 hover:text-primary-600 hover:bg-primary-50 rounded transition-colors cursor-pointer"
                          title="编辑"
                        >
                          <Edit2 size={15} />
                        </button>
                        <button
                          onClick={(e) => { e.stopPropagation(); onDelete(contact.id); }}
                          className="p-1.5 text-gray-400 hover:text-red-600 hover:bg-red-50 rounded transition-colors cursor-pointer"
                          title="删除"
                        >
                          <Trash2 size={15} />
                        </button>
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
                      <th className="px-4 py-3 hidden sm:table-cell">标签</th>
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
                          className={`group hover:bg-gray-50 transition-colors cursor-pointer ${isSelected ? 'bg-primary-50/30' : ''}`}
                          onClick={() => onEdit(contact)}
                        >
                          <td className="px-4 py-3 text-center" onClick={(e) => e.stopPropagation()}>
                            <button
                              onClick={() => onToggleSelect(contact.id)}
                              className={`transition-colors ${isSelected ? 'text-primary-600' : 'text-gray-300 group-hover:text-primary-400'}`}
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
                                  <Check size={10} className="text-primary-600" />
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
                              {contact.tags.slice(0, 3).map(tag => (
                                <span key={tag} className="inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-medium bg-gray-100 text-gray-600">
                                  {tag}
                                </span>
                              ))}
                              {contact.tags.length > 3 && (
                                <span className="text-xs text-gray-400 flex items-center px-1">+{contact.tags.length - 3}</span>
                              )}
                            </div>
                          </td>
                          <td className="px-4 py-3 text-right">
                            <div className="flex items-center justify-end gap-0.5" onClick={(e) => e.stopPropagation()}>
                              <button
                                onClick={() => onEdit(contact)}
                                className="p-1.5 text-gray-400 hover:text-primary-600 hover:bg-primary-50 rounded transition-colors cursor-pointer"
                              >
                                <ChevronRight size={16} />
                              </button>
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
        <div className="fixed bottom-4 left-4 right-4 sm:left-1/2 sm:right-auto sm:-translate-x-1/2 bg-white shadow-lg shadow-gray-900/10 border border-gray-200 rounded-xl px-3 py-2.5 flex items-center gap-2 z-50 overflow-x-auto no-scrollbar max-w-[90vw] sm:max-w-none">
          <div className="px-3 py-1.5 bg-gray-100 rounded-lg text-xs font-medium text-gray-700 whitespace-nowrap">
            {selectedIds.size} 已选
          </div>

          <div className="w-px h-5 bg-gray-200 shrink-0" />

          <button
            onClick={onBatchAddTag}
            className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium text-gray-600 hover:text-primary-700 hover:bg-primary-50 rounded-lg transition-colors whitespace-nowrap cursor-pointer"
          >
            <Tag size={13} />
            <span>加标签</span>
          </button>
          <button
            onClick={onBatchRemoveTag}
            className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium text-gray-600 hover:text-red-600 hover:bg-red-50 rounded-lg transition-colors whitespace-nowrap cursor-pointer"
          >
            <Tag size={13} />
            <span>减标签</span>
          </button>

          <div className="w-px h-5 bg-gray-200 shrink-0" />

          <button
            onClick={onBatchDelete}
            className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium text-red-500 hover:text-red-700 hover:bg-red-50 rounded-lg transition-colors whitespace-nowrap cursor-pointer"
          >
            <Trash2 size={13} />
            <span>删除</span>
          </button>

          <button
            onClick={onDeselectAll}
            className="ml-1 w-7 h-7 flex items-center justify-center rounded-lg hover:bg-gray-100 text-gray-400 transition-colors cursor-pointer"
            title="关闭"
          >
            <X size={14} />
          </button>
        </div>
      )}
    </div>
  );
};
