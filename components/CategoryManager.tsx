import React, { useState } from 'react';
import { Category } from '../types';
import { Plus, Edit2, Trash2, X } from 'lucide-react';

interface CategoryManagerProps {
  isOpen?: boolean;
  categories: Category[];
  onAdd: (category: Omit<Category, 'id' | 'createdAt' | 'updatedAt'>) => void;
  onUpdate: (id: string, updates: Partial<Category>) => void;
  onDelete: (id: string) => void;
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

const CategoryManager: React.FC<CategoryManagerProps> = ({
  isOpen,
  categories,
  onAdd,
  onUpdate,
  onDelete,
  onClose
}) => {
  const [editingId, setEditingId] = useState<string | null>(null);
  const [newCategoryName, setNewCategoryName] = useState('');
  const [newCategoryColor, setNewCategoryColor] = useState(PRESET_COLORS[0]);
  const [newCategoryIcon, setNewCategoryIcon] = useState(PRESET_ICONS[0]);
  const [isAdding, setIsAdding] = useState(false);

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

  const handleUpdate = (id: string) => {
    if (editingId && editingId !== id) {
      setEditingId(null);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50">
      <div className="bg-white rounded-xl shadow-2xl w-full max-w-md mx-4 max-h-[80vh] flex flex-col">
        {/* Header */}
        <div className="flex items-center justify-between px-5 py-4 border-b border-gray-100">
          <h2 className="text-lg font-bold text-gray-900">管理类目</h2>
          <button
            onClick={onClose}
            className="p-1 text-gray-400 hover:text-gray-600 hover:bg-gray-100 rounded-md transition-all"
          >
            <X size={20} />
          </button>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto p-4 space-y-3">
          {categories.map(category => (
            <div
              key={category.id}
              className="flex items-center gap-3 p-3 bg-gray-50 rounded-lg hover:bg-gray-100 transition-all group"
            >
              <div
                className="w-8 h-8 rounded-md flex items-center justify-center text-white text-sm font-bold shrink-0"
                style={{ backgroundColor: category.color }}
              >
                {category.name[0]}
              </div>
              <div className="flex-1 min-w-0">
                <span className="text-sm font-medium text-gray-900">{category.name}</span>
              </div>
              <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                <button
                  onClick={() => setEditingId(category.id)}
                  className="p-1.5 text-gray-400 hover:text-gray-600 hover:bg-gray-200 rounded-md transition-all"
                >
                  <Edit2 size={14} />
                </button>
                <button
                  onClick={() => onDelete(category.id)}
                  className="p-1.5 text-gray-400 hover:text-red-600 hover:bg-red-50 rounded-md transition-all"
                >
                  <Trash2 size={14} />
                </button>
              </div>
            </div>
          ))}

          {/* Add New */}
          {isAdding ? (
            <div className="p-4 bg-gray-50 rounded-lg border-2 border-dashed border-gray-200 space-y-3">
              <input
                type="text"
                value={newCategoryName}
                onChange={e => setNewCategoryName(e.target.value)}
                placeholder="类目名称"
                className="w-full px-3 py-2 text-sm border border-gray-200 rounded-md focus:outline-none focus:ring-2 focus:ring-gray-900 focus:border-transparent"
                autoFocus
                onKeyDown={e => e.key === 'Enter' && handleAdd()}
              />
              <div className="space-y-2">
                <p className="text-xs text-gray-500 font-medium">颜色</p>
                <div className="flex flex-wrap gap-2">
                  {PRESET_COLORS.map(color => (
                    <button
                      key={color}
                      onClick={() => setNewCategoryColor(color)}
                      className={`w-6 h-6 rounded-md transition-all ${newCategoryColor === color ? 'ring-2 ring-offset-2 ring-gray-900' : ''}`}
                      style={{ backgroundColor: color }}
                    />
                  ))}
                </div>
              </div>
              <div className="flex gap-2 pt-2">
                <button
                  onClick={handleAdd}
                  className="flex-1 px-3 py-2 text-sm font-medium text-white bg-gray-900 hover:bg-gray-800 rounded-md transition-all"
                >
                  添加
                </button>
                <button
                  onClick={() => {
                    setIsAdding(false);
                    setNewCategoryName('');
                  }}
                  className="px-3 py-2 text-sm font-medium text-gray-600 hover:bg-gray-200 rounded-md transition-all"
                >
                  取消
                </button>
              </div>
            </div>
          ) : (
            <button
              onClick={() => setIsAdding(true)}
              className="w-full flex items-center justify-center gap-2 p-3 text-sm font-medium text-gray-500 hover:text-gray-900 hover:bg-gray-50 rounded-lg border-2 border-dashed border-gray-200 transition-all"
            >
              <Plus size={16} />
              新增类目
            </button>
          )}
        </div>
      </div>
    </div>
  );
};

export default CategoryManager;
