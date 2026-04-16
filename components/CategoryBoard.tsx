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
  SortableContext,
  sortableKeyboardCoordinates,
  verticalListSortingStrategy,
  horizontalListSortingStrategy,
  useSortable,
} from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import { Category, Contact } from '../types';
import CategoryColumn from './CategoryColumn';
import ContactCard from './ContactCard';
import { Settings, GripHorizontal } from 'lucide-react';

interface SortableCategoryColumnProps {
  category: Category;
  contacts: Contact[];
  count: number;
  isOver: boolean;
  isFiltered: boolean;
  onContactClick: (contact: Contact) => void;
  onFilterClick: () => void;
  onAddContact?: (categoryId: string | null, contactName: string) => void;
  onAddExistingContact?: (categoryId: string | null, contactId: string) => void;
  allContacts?: Contact[];
  showFollowUpInfo: boolean;
}

const SortableCategoryColumn: React.FC<SortableCategoryColumnProps> = ({
  category,
  ...props
}) => {
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
  } = useSortable({ id: `category-${category.id}` });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
  };

  return (
    <div ref={setNodeRef} style={style} className="flex flex-col group">
      <div
        {...attributes}
        {...listeners}
        className="cursor-grab active:cursor-grabbing px-3 pt-2 flex justify-center opacity-0 group-hover:opacity-100 transition-opacity"
      >
        <GripHorizontal size={16} className="text-gray-400 hover:text-gray-600" />
      </div>
      <CategoryColumn
        category={category}
        {...props}
      />
    </div>
  );
};

interface SortableUncategorizedColumnProps {
  contacts: Contact[];
  count: number;
  isOver: boolean;
  isFiltered: boolean;
  onContactClick: (contact: Contact) => void;
  onFilterClick: () => void;
  onAddContact?: (categoryId: string | null, contactName: string) => void;
  onAddExistingContact?: (categoryId: string | null, contactId: string) => void;
  allContacts?: Contact[];
}

const SortableUncategorizedColumn: React.FC<SortableUncategorizedColumnProps> = (props) => {
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
  } = useSortable({ id: '__uncategorized__sort__' });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
  };

  return (
    <div ref={setNodeRef} style={style} className="flex flex-col group">
      <div
        {...attributes}
        {...listeners}
        className="cursor-grab active:cursor-grabbing px-3 pt-2 flex justify-center opacity-0 group-hover:opacity-100 transition-opacity"
      >
        <GripHorizontal size={16} className="text-gray-400 hover:text-gray-600" />
      </div>
      <CategoryColumn
        category={null}
        isUncategorized
        {...props}
      />
    </div>
  );
};

interface CategoryBoardProps {
  contacts: Contact[];
  categories: Category[];
  filterTags: Set<string>;
  followUpFilter: 'idle' | 'following' | 'contacted' | null;
  categoryFilter: string | null;
  onContactClick: (contact: Contact) => void;
  onContactMove: (contactId: string, newCategoryId: string | null) => void;
  onCategoryFilter: (categoryId: string | null) => void;
  onOpenCategoryManager: () => void;
  onAddContact?: (categoryId: string | null, contactName: string) => void;
  onAddExistingContact?: (categoryId: string | null, contactId: string) => void;
  allContacts?: Contact[];
  onReorderCategories?: (categories: Category[]) => void;
}

const CategoryBoard: React.FC<CategoryBoardProps> = ({
  contacts,
  categories,
  filterTags,
  followUpFilter,
  categoryFilter,
  onContactClick,
  onContactMove,
  onCategoryFilter,
  onOpenCategoryManager,
  onAddContact,
  onAddExistingContact,
  allContacts = [],
  onReorderCategories
}) => {
  const [activeContact, setActiveContact] = useState<Contact | null>(null);
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

  const filteredContacts = useMemo(() => {
    return contacts.filter(c => {
      const matchesFollowUp = !followUpFilter || c.followUpStatus === followUpFilter;
      const matchesTags = filterTags.size === 0 || c.tags.some(tag => filterTags.has(tag));
      return matchesFollowUp && matchesTags;
    });
  }, [contacts, followUpFilter, filterTags]);

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
    const activeId = active.id as string;
    
    if (!activeId.startsWith('category-')) {
      const contact = filteredContacts.find(c => c.id === activeId);
      if (contact) {
        setActiveContact(contact);
      }
    }
  };

  const handleDragOver = (event: DragOverEvent) => {
    const { over } = event;
    setOverId(over?.id as string || null);
  };

  const handleDragEnd = (event: DragEndEvent) => {
    const { active, over } = event;
    setActiveContact(null);
    setOverId(null);

    if (!over) return;

    const activeId = active.id as string;
    const overId = over.id as string;

    const isActiveColumn = activeId.startsWith('category-') || activeId === '__uncategorized__sort__';
    const isOverColumn = overId.startsWith('category-') || overId === '__uncategorized__sort__';

    if (isActiveColumn && isOverColumn) {
      // Build the full column order: categories + uncategorized
      const columnIds = [...categories.map(c => `category-${c.id}`), '__uncategorized__sort__'];
      const oldIndex = columnIds.indexOf(activeId);
      const newIndex = columnIds.indexOf(overId);

      if (oldIndex !== -1 && newIndex !== -1 && oldIndex !== newIndex) {
        const newColumnIds = [...columnIds];
        const [moved] = newColumnIds.splice(oldIndex, 1);
        newColumnIds.splice(newIndex, 0, moved);

        // Extract the new category order (excluding uncategorized)
        const newCategories = newColumnIds
          .filter(id => id !== '__uncategorized__sort__')
          .map((id, index) => {
            const catId = id.replace('category-', '');
            const cat = categories.find(c => c.id === catId)!;
            return { ...cat, order: index };
          });

        onReorderCategories?.(newCategories);
      }
      return;
    }

    const contactId = activeId;
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
    <div className="flex-1 h-full flex flex-col overflow-hidden">
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
        <div className="flex-1 overflow-x-auto p-4 md:p-6">
          <SortableContext
            items={[...categories.map(c => `category-${c.id}`), '__uncategorized__sort__']}
            strategy={horizontalListSortingStrategy}
          >
            <div className="flex gap-4 h-full min-w-max">
              {categories.map(category => (
                <SortableCategoryColumn
                  key={category.id}
                  category={category}
                  contacts={contactsByCategory[category.id] || []}
                  count={counts[category.id]}
                  isOver={overId === `category-${category.id}`}
                  isFiltered={categoryFilter === category.id}
                  onContactClick={onContactClick}
                  onFilterClick={() => onCategoryFilter(categoryFilter === category.id ? null : category.id)}
                  onAddContact={onAddContact}
                  onAddExistingContact={onAddExistingContact}
                  allContacts={allContacts}
                  showFollowUpInfo
                />
              ))}

              <SortableUncategorizedColumn
                key="__uncategorized__"
                contacts={contactsByCategory['__uncategorized__'] || []}
                count={counts['__uncategorized__']}
                isOver={overId === '__uncategorized__'}
                isFiltered={categoryFilter === null}
                onContactClick={onContactClick}
                onFilterClick={() => onCategoryFilter(null)}
                onAddContact={onAddContact}
                onAddExistingContact={onAddExistingContact}
                allContacts={allContacts}
              />
            </div>
          </SortableContext>
        </div>

        <DragOverlay>
          {activeContact && (
            <ContactCard
              contact={activeContact}
              isOverlay
              onClick={() => {}}
            />
          )}
        </DragOverlay>
      </DndContext>
    </div>
  );
};

export default CategoryBoard;
