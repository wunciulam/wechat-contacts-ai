import Button, {IconButton} from './ui/Button';
import WorkspaceDialog from './WorkspaceDialog';
import Input from './ui/Input';
import React, { useState } from 'react';
import {
  DndContext,
  DragEndEvent,
  KeyboardSensor,
  PointerSensor,
  closestCenter,
  useSensor,
  useSensors,
} from '@dnd-kit/core';
import {
  SortableContext,
  arrayMove,
  sortableKeyboardCoordinates,
  useSortable,
  verticalListSortingStrategy,
} from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import { Category } from '../types';
import { Check, GripVertical, Plus, Edit2, Trash2, X } from 'lucide-react';

interface CategoryManagerProps {
  isOpen?: boolean;
  categories: Category[];
  onAdd: (category: Omit<Category, 'id' | 'createdAt' | 'updatedAt'>) => void;
  onUpdate: (id: string, updates: Partial<Category>) => void;
  onDelete: (id: string) => void;
  onReorder: (categories: Category[]) => void;
  onClose: () => void;
}

const PRESET_COLORS = [
  '#EF4444', '#F97316', '#F59E0B', '#84CC16',
  '#10B981', '#06B6D4', '#3B82F6', '#8B5CF6',
  '#EC4899', '#6B7280'
];

const PRESET_ICONS = [
  'UserPlus', 'Star', 'CheckCircle', 'Clock',
  'DollarSign', 'Target', 'Heart', 'Award',
  'Briefcase', 'Gift'
];

interface CategoryRowProps {
  category: Category;
  isEditing: boolean;
  editName: string;
  editColor: string;
  onEditNameChange: (value: string) => void;
  onEditColorChange: (value: string) => void;
  onStartEdit: () => void;
  onSaveEdit: () => void;
  onCancelEdit: () => void;
  onDelete: () => void;
}

const CategoryRow: React.FC<CategoryRowProps> = ({
  category,
  isEditing,
  editName,
  editColor,
  onEditNameChange,
  onEditColorChange,
  onStartEdit,
  onSaveEdit,
  onCancelEdit,
  onDelete
}) => {
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging
  } = useSortable({ id: category.id });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
  };

  return (
    <div
      ref={setNodeRef}
      style={style}
      className={`flex items-center gap-3 p-3 bg-gray-50 rounded-lg hover:bg-gray-100 transition-colors group ${
        isDragging ? 'opacity-50 shadow-lg' : ''
      }`}
    >
      <IconButton
        {...attributes}
        {...listeners}
        className="text-gray-300 hover:text-gray-600 rounded cursor-grab active:cursor-grabbing"
        title="拖拽排序类目" aria-label="拖拽排序类目"
      >
        <GripVertical size={16} />
      </IconButton>
      <div
        className="w-8 h-8 rounded-md flex items-center justify-center text-white text-sm font-bold shrink-0"
        style={{ backgroundColor: isEditing ? editColor : category.color }}
      >
        {(isEditing ? editName : category.name).trim()[0] || category.name[0]}
      </div>
      <div className="flex-1 min-w-0">
        {isEditing ? (
          <div className="space-y-2">
            <Input
              type="text"
              value={editName}
              onChange={e => onEditNameChange(e.target.value)}
              onKeyDown={e => {
                if (e.key === 'Enter') onSaveEdit();
                if (e.key === 'Escape') onCancelEdit();
              }}
              className="w-full"
              autoFocus
            />
            <div className="flex flex-wrap gap-1.5">
              {PRESET_COLORS.map(color => (
                <Button
                  key={color}
                  onClick={() => onEditColorChange(color)}
                  className={`w-5 h-5 rounded transition-colors ${editColor === color ? 'ring-2 ring-offset-1 ring-gray-900' : ''}`}
                  style={{ backgroundColor: color }}
                  title={color} aria-label={`颜色 ${color}`} aria-pressed={editColor===color} variant="plain"
                />
              ))}
            </div>
          </div>
        ) : (
          <span className="text-sm font-medium text-gray-900">{category.name}</span>
        )}
      </div>
      <div className={`flex items-center gap-1 transition-opacity ${isEditing ? 'opacity-100' : 'opacity-0 group-hover:opacity-100'}`}>
        {isEditing ? (
          <>
            <IconButton
              onClick={onSaveEdit}
              className="text-gray-400 hover:text-green-600 hover:bg-green-50 rounded-md transition-colors"
              title="保存" aria-label="保存"
            >
              <Check size={14} />
            </IconButton>
            <IconButton
              onClick={onCancelEdit}
              className="text-gray-400 hover:text-gray-600 hover:bg-gray-200 rounded-md transition-colors"
              title="取消" aria-label="取消"
            >
              <X size={14} />
            </IconButton>
          </>
        ) : (
          <>
            <IconButton
              onClick={onStartEdit}
              className="text-gray-400 hover:text-gray-600 hover:bg-gray-200 rounded-md transition-colors"
              title="编辑" aria-label="编辑"
            >
              <Edit2 size={14} />
            </IconButton>
            <IconButton
              onClick={onDelete}
              className="text-gray-400 hover:text-red-600 hover:bg-red-50 rounded-md transition-colors"
              title="删除" aria-label="删除"
            >
              <Trash2 size={14} />
            </IconButton>
          </>
        )}
      </div>
    </div>
  );
};

const CategoryManager: React.FC<CategoryManagerProps> = ({
  isOpen,
  categories,
  onAdd,
  onUpdate,
  onDelete,
  onReorder,
  onClose
}) => {
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editName, setEditName] = useState('');
  const [editColor, setEditColor] = useState(PRESET_COLORS[0]);
  const [newCategoryName, setNewCategoryName] = useState('');
  const [newCategoryColor, setNewCategoryColor] = useState(PRESET_COLORS[0]);
  const [newCategoryIcon, setNewCategoryIcon] = useState(PRESET_ICONS[0]);
  const [isAdding, setIsAdding] = useState(false);

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

  if (!isOpen) return null;

  const handleAdd = () => {
    if (!newCategoryName.trim()) return;
    onAdd({
      name: newCategoryName.trim(),
      color: newCategoryColor,
      icon: newCategoryIcon,
      order: categories.length
    });
    setNewCategoryName('');
    setIsAdding(false);
  };

  const startEditing = (category: Category) => {
    setEditingId(category.id);
    setEditName(category.name);
    setEditColor(category.color);
  };

  const cancelEditing = () => {
    setEditingId(null);
    setEditName('');
    setEditColor(PRESET_COLORS[0]);
  };

  const saveEditing = () => {
    if (!editingId || !editName.trim()) return;
    onUpdate(editingId, {
      name: editName.trim(),
      color: editColor
    });
    cancelEditing();
  };

  const handleDragEnd = (event: DragEndEvent) => {
    const { active, over } = event;
    if (!over || active.id === over.id) return;

    const oldIndex = categories.findIndex(category => category.id === active.id);
    const newIndex = categories.findIndex(category => category.id === over.id);
    if (oldIndex === -1 || newIndex === -1) return;

    onReorder(arrayMove(categories, oldIndex, newIndex));
  };

  return <WorkspaceDialog title="管理分类" compact onClose={onClose}>
        <div className="space-y-3">
          <DndContext
            sensors={sensors}
            collisionDetection={closestCenter}
            onDragEnd={handleDragEnd}
          >
            <SortableContext
              items={categories.map(category => category.id)}
              strategy={verticalListSortingStrategy}
            >
              {categories.map(category => (
                <CategoryRow
                  key={category.id}
                  category={category}
                  isEditing={editingId === category.id}
                  editName={editName}
                  editColor={editColor}
                  onEditNameChange={setEditName}
                  onEditColorChange={setEditColor}
                  onStartEdit={() => startEditing(category)}
                  onSaveEdit={saveEditing}
                  onCancelEdit={cancelEditing}
                  onDelete={() => onDelete(category.id)}
                />
              ))}
            </SortableContext>
          </DndContext>

          {/* Add New */}
          {isAdding ? (
            <div className="p-4 bg-gray-50 rounded-lg border-2 border-dashed border-gray-200 space-y-3">
              <Input
                type="text"
                value={newCategoryName}
                onChange={e => setNewCategoryName(e.target.value)}
                placeholder="类目名称"
                className="w-full"
                autoFocus
                onKeyDown={e => e.key === 'Enter' && handleAdd()}
              />
              <div className="space-y-2">
                <p className="text-xs text-gray-500 font-medium">颜色</p>
                <div className="flex flex-wrap gap-2">
                  {PRESET_COLORS.map(color => (
                    <Button
                      key={color}
                      onClick={() => setNewCategoryColor(color)}
                      className={`w-6 h-6 rounded-md transition-colors ${newCategoryColor === color ? 'ring-2 ring-offset-2 ring-gray-900' : ''}`}
                      style={{ backgroundColor: color }} aria-label={`颜色 ${color}`} aria-pressed={newCategoryColor===color} variant="plain"
                    />
                  ))}
                </div>
              </div>
              <div className="flex gap-2 pt-2">
                <Button
                  onClick={handleAdd}
                  className="flex-1    font-medium text-white bg-gray-900 hover:bg-gray-800 rounded-md transition-colors" variant="primary"
                >
                  添加
                </Button>
                <Button
                  onClick={() => {
                    setIsAdding(false);
                    setNewCategoryName('');
                  }}
                  className="px-3 py-2 text-sm font-medium text-gray-600 hover:bg-gray-200 rounded-md transition-colors" variant="plain"
                >
                  取消
                </Button>
              </div>
            </div>
          ) : (
            <Button
              onClick={() => setIsAdding(true)}
              className="w-full flex items-center justify-center gap-2 p-3 text-sm font-medium text-gray-500 hover:text-gray-900 hover:bg-gray-50 rounded-lg border-2 border-dashed border-gray-200 transition-colors" variant="plain"
            >
              <Plus size={16} />
              新增类目
            </Button>
          )}
        </div>
    </WorkspaceDialog>;
};

export default CategoryManager;
