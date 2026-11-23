import {boardCardId,contactKey,contactNameKey} from '../services/contactIdentity';
import React, { useState } from 'react';
import { useDroppable } from '@dnd-kit/core';
import { SortableContext, verticalListSortingStrategy } from '@dnd-kit/sortable';
import { Category, Contact } from '../types';
import ContactCard from './ContactCard';
import * as LucideIcons from 'lucide-react';
import { GripVertical, Plus, Search, X, UserPlus } from 'lucide-react';

interface CategoryColumnProps {
  category: Category | null;
  contacts: Contact[];
  count: number;
  isOver?: boolean;
  isFiltered?: boolean;
  onContactClick: (contact: Contact) => void | Promise<void>;
  onStatusChange: (contactId: string, status: 'idle' | 'following') => void | Promise<void>;
  onRemoveFromFollowUp: (contactId: string) => void | Promise<void>;
  onAddToFollowUp?: (contactId: string, categoryId: string) => void | Promise<void>;
  onQuickCreateContact?: (name: string, categoryId: string) => void | Promise<void>;
  availableContacts?: Contact[];
  onFilterClick: () => void | Promise<void>;
  isUncategorized?: boolean;
  dragHandleProps?: React.HTMLAttributes<HTMLButtonElement>;
}

const CategoryColumn: React.FC<CategoryColumnProps> = ({
  category,
  contacts,
  count,
  isOver,
  isFiltered,
  onContactClick,
  onStatusChange,
  onRemoveFromFollowUp,
  onAddToFollowUp,
  onQuickCreateContact,
  availableContacts = [],
  onFilterClick,
  isUncategorized,
  dragHandleProps
}) => {
  const [isAdding, setIsAdding] = useState(false);
  const [saving,setSaving]=useState(false),[error,setError]=useState('');
  const [searchQuery, setSearchQuery] = useState('');

  const droppableId = isUncategorized ? '__uncategorized__' : `category-${category?.id}`;

  const { setNodeRef, isOver: isDropOver } = useDroppable({
    id: droppableId,
  });

  // 获取图标组件
  const getIcon = (iconName: string) => {
    const Icon = (LucideIcons as any)[iconName] || (LucideIcons as any)['Star'];
    return Icon;
  };

  const handleStatusChange = (contactId: string, status: 'idle' | 'following') => {
    onStatusChange(contactId, status);
  };

  const targetCategoryId=isUncategorized?'__uncategorized__':category!.id;
  const perform=async(work:()=>void|Promise<void>)=>{if(saving)return;setSaving(true);setError('');try{await work();setIsAdding(false);setSearchQuery('');}catch(e){setError(e instanceof Error?e.message:'分类未保存，请重试。');}finally{setSaving(false);}};
  const handleAddContact=(id:string)=>perform(()=>onAddToFollowUp?.(id,targetCategoryId));
  const handleQuickCreate=()=>{if(searchQuery.trim())return perform(()=>onQuickCreateContact?.(searchQuery.trim(),targetCategoryId));};

  const filteredAvailableContacts = availableContacts.filter(c =>
    !contacts.some(ac => ac.id === c.id) &&
    (c.remarkName || c.nickname || '').toLowerCase().includes(searchQuery.toLowerCase())
  );

  return (
    <div
      data-category-id={isUncategorized?'__uncategorized__':category?.id}
      className={`w-72 h-full min-h-0 shrink-0 flex flex-col bg-gray-50 rounded-xl transition-all ${
        isOver || isDropOver ? 'ring-2 ring-gray-900 ring-offset-2' : ''
      }`}
    >
      {/* Column Header */}
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
          <div className="flex items-center gap-1">
            {dragHandleProps && (
              <button
                {...dragHandleProps}
                onClick={(e) => e.stopPropagation()}
                className="p-1 text-gray-300 hover:text-gray-600 hover:bg-gray-100 rounded transition-all cursor-grab active:cursor-grabbing"
                title="拖拽排序栏目"
              >
                <GripVertical size={16} />
              </button>
            )}
            {/* 添加联系人按钮 */}
            {onAddToFollowUp && (
              <button
                disabled={saving} onClick={(e) => { e.stopPropagation(); setIsAdding(!isAdding); }}
                className="p-1 text-gray-400 hover:text-gray-600 hover:bg-gray-100 rounded transition-all"
                title="添加联系人" aria-label={`添加联系人到${isUncategorized?'未分类':category?.name}`}
              >
                <Plus size={16} />
              </button>
            )}
          </div>
        </div>
      </div>

      {/* 添加联系人面板 */}
      {isAdding && (
        <div className="p-2 border-b border-gray-100 bg-white">
          <div className="flex gap-2 mb-2">
            <div className="relative flex-1">
              <Search size={12} className="absolute left-2 top-1/2 -translate-y-1/2 text-gray-400" />
              <input
                type="text"
                value={searchQuery}
                onChange={e => setSearchQuery(e.target.value)}
                placeholder="搜索联系人..."
                className="input pl-7" disabled={saving}
                autoFocus
              />
            </div>
            <button
              disabled={saving} aria-label="关闭添加联系人" onClick={() => { setIsAdding(false); setSearchQuery('');setError(''); }}
              className="p-1 text-gray-400 hover:text-gray-600"
            >
              <X size={14} />
            </button>
          </div>
          <div className="max-h-40 overflow-y-auto space-y-1">
            {filteredAvailableContacts.length === 0 ? (
              searchQuery.trim() && !contacts.some(c=>contactKey(c)===contactNameKey(searchQuery)) ? (
                /* 搜索无结果时，直接创建 */
                <button
                  disabled={saving} onClick={handleQuickCreate}
                  className="w-full text-left px-2 py-2 text-xs hover:bg-gray-100 rounded transition-all flex items-center gap-2 text-gray-600"
                >
                  <UserPlus size={14} />
                  <span>添加 "<span className="font-medium text-gray-900">{searchQuery.trim()}</span>"</span>
                </button>
              ) : (
                <p className="text-xs text-gray-500 text-center py-2">{searchQuery.trim()?'已在此分类':'无更多联系人'}</p>
              )
            ) : (
              filteredAvailableContacts.slice(0, 10).map(contact => (
                <button
                  key={contact.id}
                  disabled={saving} onClick={() => handleAddContact(contact.id)}
                  className="w-full text-left px-2 py-1.5 text-xs hover:bg-gray-100 rounded transition-all flex items-center gap-2"
                >
                  <div className="w-6 h-6 rounded-full bg-gray-200 flex items-center justify-center text-gray-600 text-[10px] font-bold">
                    {contact.remarkName?.[0] || contact.nickname?.[0] || '?'}
                  </div>
                  <span className="truncate">{contact.remarkName || contact.nickname}</span>
                </button>
              ))
            )}
          </div>
        </div>
      )}

      {saving&&<p role="status" className="px-3 py-2 text-xs text-gray-500">正在保存…</p>}
      {error&&<p role="alert" className="px-3 py-2 text-xs text-danger-600">{error}</p>}
      {/* Drop Zone */}
      <div
        ref={setNodeRef}
        className={`flex-1 min-h-0 overflow-y-auto p-2 space-y-2 ${
          isDropOver ? 'bg-gray-100' : ''
        }`}
      >
        <SortableContext
          items={contacts.map(c => boardCardId(c.id,targetCategoryId))}
          strategy={verticalListSortingStrategy}
        >
          {contacts.length === 0 ? (
            <div className="flex flex-col items-center justify-center h-32 text-gray-300 text-sm">
              <p>暂无联系人</p>

            </div>
          ) : (
            contacts.map(contact => (
              <ContactCard
                key={contact.id}
                contact={contact}
                sortableId={boardCardId(contact.id,targetCategoryId)}
                removalLabel={isUncategorized?'移出工作台':'移出此分类'}
                onClick={() => onContactClick(contact)}
                onStatusChange={handleStatusChange}
                onRemoveFromFollowUp={id=>perform(()=>onRemoveFromFollowUp(id))}
              />
            ))
          )}
        </SortableContext>
      </div>
    </div>
  );
};

export default CategoryColumn;
