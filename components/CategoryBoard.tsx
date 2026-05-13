import React, { useState, useMemo } from 'react';
import {
  DndContext,
  DragOverlay,
  closestCorners,
  KeyboardSensor,
  PointerSensor,
  useSensor,
  useSensors,
  DragStartEvent,
  DragEndEvent,
  DragOverEvent,
} from '@dnd-kit/core';
import {
  arrayMove,
  SortableContext,
  sortableKeyboardCoordinates,
  horizontalListSortingStrategy,
  verticalListSortingStrategy,
  useSortable,
} from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import { Category, Contact } from '../types';
import CategoryColumn from './CategoryColumn';
import ContactCard from './ContactCard';
import { Settings } from 'lucide-react';

interface CategoryBoardProps {
  contacts: Contact[];
  categories: Category[];
  filterTags: Set<string>;
  followUpFilter: 'idle' | 'following' | null;
  categoryFilter: string | null;
  onContactClick: (contact: Contact) => void;
  onStatusChange: (contactId: string, status: 'idle' | 'following') => void;
  onContactMove: (contactId: string, newCategoryId: string | null) => void;
  onRemoveFromFollowUp: (contactId: string) => void;
  onAddToFollowUp: (contactId: string, categoryId: string) => void;
  onQuickCreateContact: (name: string, categoryId: string) => void;
  onCategoryFilter: (categoryId: string | null) => void;
  onCategoryReorder: (categories: Category[]) => void;
  onOpenCategoryManager: () => void;
}

interface SortableCategoryColumnProps {
  category: Category;
  contacts: Contact[];
  count: number;
  isOver?: boolean;
  isFiltered?: boolean;
  onContactClick: (contact: Contact) => void;
  onStatusChange: (contactId: string, status: 'idle' | 'following') => void;
  onRemoveFromFollowUp: (contactId: string) => void;
  onAddToFollowUp: (contactId: string, categoryId: string) => void;
  onQuickCreateContact: (name: string, categoryId: string) => void;
  availableContacts: Contact[];
  onFilterClick: () => void;
}

const SortableCategoryColumn: React.FC<SortableCategoryColumnProps> = ({
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
  availableContacts,
  onFilterClick
}) => {
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging
  } = useSortable({ id: `category-sort-${category.id}` });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
  };

  return (
    <div
      ref={setNodeRef}
      style={style}
      className={`h-full min-h-0 shrink-0 ${isDragging ? 'opacity-50' : ''}`}
    >
      <CategoryColumn
        category={category}
        contacts={contacts}
        count={count}
        isOver={isOver}
        isFiltered={isFiltered}
        onContactClick={onContactClick}
        onStatusChange={onStatusChange}
        onRemoveFromFollowUp={onRemoveFromFollowUp}
        onAddToFollowUp={onAddToFollowUp}
        onQuickCreateContact={onQuickCreateContact}
        availableContacts={availableContacts}
        onFilterClick={onFilterClick}
        dragHandleProps={{ ...attributes, ...listeners }}
      />
    </div>
  );
};

const CategoryBoard: React.FC<CategoryBoardProps> = ({
  contacts,
  categories,
  filterTags,
  followUpFilter,
  categoryFilter,
  onContactClick,
  onStatusChange,
  onContactMove,
  onRemoveFromFollowUp,
  onAddToFollowUp,
  onQuickCreateContact,
  onCategoryFilter,
  onCategoryReorder,
  onOpenCategoryManager
}) => {
  const [activeContact, setActiveContact] = useState<Contact | null>(null);
  const [activeCategory, setActiveCategory] = useState<Category | null>(null);
  const [overId, setOverId] = useState<string | null>(null);

  const sensors = useSensors(
    useSensor(PointerSensor, {
      activationConstraint: {
        distance: 8,
      },
    }),
    useSensor(KeyboardSensor, {
      coordinateGetter: sortableKeyboardCoordinates,
    })
  );

  // 自动显示所有跟进中的联系人（不需要 categoryId）
  const filteredContacts = useMemo(() => {
    return contacts.filter(c => {
      // 只显示跟进中的联系人
      const isFollowing = c.followUpStatus === 'following';
      const matchesTags = filterTags.size === 0 || c.tags.some(tag => filterTags.has(tag));
      return isFollowing && matchesTags;
    });
  }, [contacts, filterTags]);

  // 可添加到跟进工作台的联系人（尚未跟进）
  const availableContacts = useMemo(() => {
    return contacts.filter(c => c.followUpStatus !== 'following');
  }, [contacts]);

  const contactsByCategory = useMemo(() => {
    const groups: Record<string, Contact[]> = {};
    categories.forEach(cat => {
      groups[cat.id] = [];
    });
    groups['__uncategorized__'] = [];
    filteredContacts.forEach(contact => {
      const key = contact.categoryId || '__uncategorized__';
      if (!groups[key]) groups[key] = [];
      groups[key].push(contact);
    });
    return groups;
  }, [filteredContacts, categories]);

  const counts = useMemo(() => {
    const result: Record<string, number> = {};
    categories.forEach(cat => {
      result[cat.id] = contactsByCategory[cat.id]?.length || 0;
    });
    result['__uncategorized__'] = contactsByCategory['__uncategorized__']?.length || 0;
    return result;
  }, [categories, contactsByCategory]);

  const handleDragStart = (event: DragStartEvent) => {
    const { active } = event;
    const activeId = String(active.id);
    if (activeId.startsWith('category-sort-')) {
      const categoryId = activeId.replace('category-sort-', '');
      setActiveCategory(categories.find(c => c.id === categoryId) || null);
      return;
    }

    const contact = filteredContacts.find(c => c.id === active.id);
    if (contact) {
      setActiveContact(contact);
    }
  };

  const handleDragOver = (event: DragOverEvent) => {
    const { over } = event;
    setOverId(over?.id as string || null);
  };

  const handleDragEnd = (event: DragEndEvent) => {
    const { active, over } = event;
    setActiveContact(null);
    setActiveCategory(null);
    setOverId(null);

    if (!over) return;

    const activeId = String(active.id);
    const overId = over.id as string;

    if (activeId.startsWith('category-sort-') && overId.startsWith('category-sort-')) {
      const activeCategoryId = activeId.replace('category-sort-', '');
      const overCategoryId = overId.replace('category-sort-', '');
      const oldIndex = categories.findIndex(c => c.id === activeCategoryId);
      const newIndex = categories.findIndex(c => c.id === overCategoryId);

      if (oldIndex !== -1 && newIndex !== -1 && oldIndex !== newIndex) {
        onCategoryReorder(arrayMove(categories, oldIndex, newIndex));
      }
      return;
    }

    if (activeId.startsWith('category-sort-')) return;

    const contactId = active.id as string;
    let newCategoryId: string | null = null;

    if (overId === '__uncategorized__') {
      newCategoryId = null;
    } else if (overId.startsWith('category-')) {
      newCategoryId = overId.replace('category-', '');
    } else {
      const targetContact = filteredContacts.find(c => c.id === overId);
      if (targetContact) {
        newCategoryId = targetContact.categoryId || null;
      }
    }

    if (newCategoryId !== undefined) {
      const currentContact = filteredContacts.find(c => c.id === contactId);
      if (currentContact && currentContact.categoryId !== newCategoryId) {
        onContactMove(contactId, newCategoryId);
      }
    }
  };

  return (
    <div className="flex-1 h-full min-h-0 flex flex-col overflow-hidden">
      <div className="shrink-0 px-4 md:px-6 py-4 border-b border-gray-100 flex items-center justify-between bg-white">
        <div className="flex items-center gap-3">
          <h1 className="text-lg font-bold text-gray-900">跟进工作台</h1>
          <span className="text-xs text-gray-500">{filteredContacts.length} 位联系人</span>
        </div>
        <button
          onClick={onOpenCategoryManager}
          className="p-2 text-gray-400 hover:text-gray-600 hover:bg-gray-100 rounded-md transition-all"
          title="管理类目"
        >
          <Settings size={20} />
        </button>
      </div>

      <DndContext
        sensors={sensors}
        collisionDetection={closestCorners}
        onDragStart={handleDragStart}
        onDragOver={handleDragOver}
        onDragEnd={handleDragEnd}
      >
        <div className="flex-1 min-h-0 overflow-x-auto overflow-y-hidden p-4 md:p-6">
          <div className="flex gap-4 h-full min-h-0 min-w-max">
            <SortableContext
              items={categories.map(category => `category-sort-${category.id}`)}
              strategy={horizontalListSortingStrategy}
            >
              {categories.map(category => (
                <SortableCategoryColumn
                  key={category.id}
                  category={category}
                  contacts={contactsByCategory[category.id] || []}
                  count={counts[category.id]}
                  isOver={overId === `category-${category.id}`}
                  isFiltered={categoryFilter === category.id}
                  onContactClick={onContactClick}
                  onStatusChange={onStatusChange}
                  onRemoveFromFollowUp={onRemoveFromFollowUp}
                  onAddToFollowUp={onAddToFollowUp}
                  onQuickCreateContact={onQuickCreateContact}
                  availableContacts={availableContacts}
                  onFilterClick={() => onCategoryFilter(categoryFilter === category.id ? null : category.id)}
                />
              ))}
            </SortableContext>

            <CategoryColumn
              key="__uncategorized__"
              category={null}
              contacts={contactsByCategory['__uncategorized__'] || []}
              count={counts['__uncategorized__']}
              isOver={overId === '__uncategorized__'}
              isFiltered={categoryFilter === null}
              onContactClick={onContactClick}
              onStatusChange={onStatusChange}
              onRemoveFromFollowUp={onRemoveFromFollowUp}
              onAddToFollowUp={onAddToFollowUp}
              onQuickCreateContact={onQuickCreateContact}
              availableContacts={availableContacts}
              onFilterClick={() => onCategoryFilter(null)}
              isUncategorized
            />
          </div>
        </div>

        <DragOverlay>
          {activeContact && (
            <ContactCard
              contact={activeContact}
              isOverlay
              onClick={() => {}}
              onStatusChange={() => {}}
              onRemoveFromFollowUp={() => {}}
            />
          )}
          {activeCategory && (
            <div className="w-72 opacity-90">
              <CategoryColumn
                category={activeCategory}
                contacts={contactsByCategory[activeCategory.id] || []}
                count={counts[activeCategory.id]}
                onContactClick={() => {}}
                onStatusChange={() => {}}
                onRemoveFromFollowUp={() => {}}
                onAddToFollowUp={() => {}}
                onQuickCreateContact={() => {}}
                availableContacts={[]}
                onFilterClick={() => {}}
              />
            </div>
          )}
        </DragOverlay>
      </DndContext>
    </div>
  );
};

export default CategoryBoard;
