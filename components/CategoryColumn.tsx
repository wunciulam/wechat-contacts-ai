import React, { useState, useMemo, useRef, useEffect } from 'react';
import { useDroppable } from '@dnd-kit/core';
import { SortableContext, verticalListSortingStrategy } from '@dnd-kit/sortable';
import { Category, Contact } from '../types';
import ContactCard from './ContactCard';
import * as LucideIcons from 'lucide-react';
import { Plus, X, Check, Search, UserPlus } from 'lucide-react';

interface CategoryColumnProps {
  category: Category | null;
  contacts: Contact[];
  count: number;
  isOver?: boolean;
  isFiltered?: boolean;
  onContactClick: (contact: Contact) => void;
  onFilterClick: () => void;
  onAddContact?: (categoryId: string | null, contactName: string) => void;
  onAddExistingContact?: (categoryId: string | null, contactId: string) => void;
  allContacts?: Contact[];
  isUncategorized?: boolean;
  showFollowUpInfo?: boolean;
}

const CategoryColumn: React.FC<CategoryColumnProps> = ({
  category,
  contacts,
  count,
  isOver,
  isFiltered,
  onContactClick,
  onFilterClick,
  onAddContact,
  onAddExistingContact,
  allContacts = [],
  isUncategorized,
  showFollowUpInfo = false
}) => {
  const [isAdding, setIsAdding] = useState(false);
  const [newContactName, setNewContactName] = useState('');
  const [selectedIndex, setSelectedIndex] = useState(-1);
  const searchResultsRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  // 搜索匹配的联系人（排除已在当前栏目中的）
  const searchResults = useMemo(() => {
    const query = newContactName.trim().toLowerCase();
    if (!query) return [];
    const currentContactIds = new Set(contacts.map(c => c.id));
    return allContacts
      .filter(c => {
        if (currentContactIds.has(c.id)) return false;
        const name = (c.remarkName || c.nickname || '').toLowerCase();
        const phone = (c.phoneNumber || '').toLowerCase();
        return name.includes(query) || phone.includes(query);
      })
      .slice(0, 5);
  }, [newContactName, allContacts, contacts]);

  // 重置选中索引
  useEffect(() => {
    setSelectedIndex(-1);
  }, [newContactName]);

  const droppableId = isUncategorized ? '__uncategorized__' : `category-${category?.id}`;

  const { setNodeRef, isOver: isDropOver } = useDroppable({
    id: droppableId,
  });

  const getIcon = (iconName: string) => {
    const Icon = (LucideIcons as any)[iconName] || (LucideIcons as any)['Star'];
    return Icon;
  };

  const handleAddClick = (e: React.MouseEvent) => {
    e.stopPropagation();
    setIsAdding(true);
    setNewContactName('');
  };

  const handleSelectExisting = (contact: Contact) => {
    const categoryId = isUncategorized ? null : (category?.id || null);
    onAddExistingContact?.(categoryId, contact.id);
    setIsAdding(false);
    setNewContactName('');
  };

  const handleCreateNew = () => {
    if (newContactName.trim()) {
      const categoryId = isUncategorized ? null : (category?.id || null);
      onAddContact?.(categoryId, newContactName.trim());
      setIsAdding(false);
      setNewContactName('');
    }
  };

  const handleCancelAdd = (e: React.MouseEvent) => {
    e.stopPropagation();
    setIsAdding(false);
    setNewContactName('');
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    const totalItems = searchResults.length + (newContactName.trim() ? 1 : 0); // +1 for "新建" option
    if (e.key === 'ArrowDown') {
      e.preventDefault();
      setSelectedIndex(prev => (prev + 1) % totalItems);
    } else if (e.key === 'ArrowUp') {
      e.preventDefault();
      setSelectedIndex(prev => (prev - 1 + totalItems) % totalItems);
    } else if (e.key === 'Enter') {
      e.preventDefault();
      if (selectedIndex >= 0 && selectedIndex < searchResults.length) {
        handleSelectExisting(searchResults[selectedIndex]);
      } else {
        handleCreateNew();
      }
    } else if (e.key === 'Escape') {
      handleCancelAdd(e as any);
    }
  };

  return (
    <div
      className={`w-72 shrink-0 flex flex-col bg-gray-50 rounded-xl transition-all ${
        isOver || isDropOver ? 'ring-2 ring-gray-900 ring-offset-2' : ''
      }`}
    >
      <div
        className="p-3 border-b border-gray-100 cursor-pointer hover:bg-gray-100/50 transition-all rounded-t-xl"
        onClick={onFilterClick}
      >
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2 min-w-0">
            {category && (
              <div
                className="w-7 h-7 rounded-md flex items-center justify-center text-white text-xs font-bold shrink-0"
                style={{ backgroundColor: category.color }}
              >
                {(() => {
                  const Icon = getIcon(category.icon);
                  return Icon ? <Icon size={14} /> : category.name[0];
                })()}
              </div>
            )}
            <span className="text-sm font-semibold text-gray-900 truncate">
              {isUncategorized ? '未分类' : category?.name}
            </span>
            <span className={`text-xs px-1.5 py-0.5 rounded-full font-medium ${
              isFiltered ? 'bg-gray-900 text-white' : 'bg-gray-200 text-gray-600'
            }`}>
              {count}
            </span>
          </div>
          {!isAdding && onAddContact && (
            <button
              onClick={handleAddClick}
              className="p-1.5 text-gray-400 hover:text-gray-600 hover:bg-gray-200 rounded-md transition-all"
              title="添加联系人"
            >
              <Plus size={16} />
            </button>
          )}
        </div>
      </div>

      {isAdding && (
        <div className="p-2 bg-white border-b border-gray-100 relative">
          <div className="flex items-center gap-2">
            <div className="relative flex-1">
              <Search size={12} className="absolute left-2 top-1/2 -translate-y-1/2 text-gray-400" />
              <input
                ref={inputRef}
                type="text"
                value={newContactName}
                onChange={(e) => setNewContactName(e.target.value)}
                onKeyDown={handleKeyDown}
                placeholder="搜索或新建联系人"
                className="w-full pl-7 pr-2 py-1.5 text-xs border border-gray-200 rounded focus:outline-none focus:ring-2 focus:ring-gray-900"
                autoFocus
              />
            </div>
            <button
              onClick={handleCancelAdd}
              className="p-1.5 text-gray-400 hover:bg-gray-100 rounded transition-all shrink-0"
              title="取消"
            >
              <X size={14} />
            </button>
          </div>

          {/* 搜索结果下拉 */}
          {newContactName.trim() && (
            <div ref={searchResultsRef} className="mt-1 bg-white border border-gray-200 rounded-lg shadow-lg overflow-hidden max-h-52 overflow-y-auto">
              {searchResults.length > 0 && (
                <>
                  <div className="px-2 py-1 text-[10px] text-gray-400 bg-gray-50 font-medium">已有联系人</div>
                  {searchResults.map((c, idx) => (
                    <button
                      key={c.id}
                      onClick={() => handleSelectExisting(c)}
                      className={`w-full text-left px-3 py-2 text-xs flex items-center gap-2 transition-colors ${
                        selectedIndex === idx ? 'bg-blue-50 text-blue-700' : 'hover:bg-gray-50 text-gray-700'
                      }`}
                    >
                      <div className="w-6 h-6 rounded-full bg-gray-200 flex items-center justify-center text-[10px] font-medium text-gray-600 shrink-0">
                        {(c.remarkName || c.nickname || '?')[0]}
                      </div>
                      <div className="min-w-0 flex-1">
                        <div className="font-medium truncate">{c.remarkName || c.nickname}</div>
                        {c.phoneNumber && <div className="text-[10px] text-gray-400">{c.phoneNumber}</div>}
                      </div>
                      {c.followUpStatus === 'following' && (
                        <span className="text-[10px] px-1.5 py-0.5 bg-green-100 text-green-600 rounded-full shrink-0">跟进中</span>
                      )}
                    </button>
                  ))}
                </>
              )}
              {/* 新建选项 */}
              <button
                onClick={handleCreateNew}
                className={`w-full text-left px-3 py-2 text-xs flex items-center gap-2 border-t border-gray-100 transition-colors ${
                  selectedIndex === searchResults.length ? 'bg-blue-50 text-blue-700' : 'hover:bg-gray-50 text-gray-600'
                }`}
              >
                <div className="w-6 h-6 rounded-full bg-blue-100 flex items-center justify-center shrink-0">
                  <UserPlus size={12} className="text-blue-600" />
                </div>
                <span>新建联系人 "<strong>{newContactName.trim()}</strong>"</span>
              </button>
            </div>
          )}
        </div>
      )}

      <div
        ref={setNodeRef}
        className={`flex-1 overflow-y-auto p-2 space-y-2 min-h-[200px] ${
          isDropOver ? 'bg-gray-100' : ''
        }`}
      >
        <SortableContext
          items={contacts.map(c => c.id)}
          strategy={verticalListSortingStrategy}
        >
          {contacts.length === 0 ? (
            <div className="flex flex-col items-center justify-center h-32 text-gray-300 text-sm">
              <p>暂无联系人</p>
              <p className="text-xs">拖拽卡片到这里</p>
            </div>
          ) : (
            contacts.map(contact => (
              <ContactCard
                key={contact.id}
                contact={contact}
                onClick={() => onContactClick(contact)}
                showFollowUpInfo={showFollowUpInfo}
              />
            ))
          )}
        </SortableContext>
      </div>
    </div>
  );
};

export default CategoryColumn;
