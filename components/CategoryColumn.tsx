import React from 'react';
import { useDroppable } from '@dnd-kit/core';
import { SortableContext, verticalListSortingStrategy } from '@dnd-kit/sortable';
import { Category, Contact } from '../types';
import ContactCard from './ContactCard';
import * as LucideIcons from 'lucide-react';
import { Settings } from 'lucide-react';

interface CategoryColumnProps {
  category: Category | null;
  contacts: Contact[];
  count: number;
  isOver?: boolean;
  isFiltered?: boolean;
  onContactClick: (contact: Contact) => void;
  onStatusChange: (contactId: string, status: 'idle' | 'following' | 'contacted') => void;
  onFilterClick: () => void;
  isUncategorized?: boolean;
}

const CategoryColumn: React.FC<CategoryColumnProps> = ({
  category,
  contacts,
  count,
  isOver,
  isFiltered,
  onContactClick,
  onStatusChange,
  onFilterClick,
  isUncategorized
}) => {
  const droppableId = isUncategorized ? '__uncategorized__' : `category-${category?.id}`;

  const { setNodeRef, isOver: isDropOver } = useDroppable({
    id: droppableId,
  });

  // 获取图标组件
  const getIcon = (iconName: string) => {
    const Icon = (LucideIcons as any)[iconName] || (LucideIcons as any)['Star'];
    return Icon;
  };

  const handleStatusChange = (contactId: string, status: 'idle' | 'following' | 'contacted') => {
    onStatusChange(contactId, status);
  };

  return (
    <div
      className={`w-72 shrink-0 flex flex-col bg-gray-50 rounded-xl transition-all ${
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
        </div>
      </div>

      {/* Drop Zone */}
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
                onStatusChange={handleStatusChange}
              />
            ))
          )}
        </SortableContext>
      </div>
    </div>
  );
};

export default CategoryColumn;
