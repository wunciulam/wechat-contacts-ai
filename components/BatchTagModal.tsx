
import React, { useState } from 'react';
import { X, Tag, Plus, Check, Trash2, CheckCircle2, Circle } from 'lucide-react';

interface BatchTagModalProps {
  isOpen: boolean;
  mode: 'add' | 'remove';
  onClose: () => void;
  onConfirm: (tags: string[]) => void;
  existingTags: string[]; 
  selectedCount: number;
}

const BatchTagModal: React.FC<BatchTagModalProps> = ({ 
  isOpen, 
  mode, 
  onClose, 
  onConfirm, 
  existingTags,
  selectedCount
}) => {
  const [tagInput, setTagInput] = useState('');
  const [selectedTags, setSelectedTags] = useState<Set<string>>(new Set());

  if (!isOpen) return null;

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const tagsToProcess = Array.from(selectedTags);
    if (tagInput.trim()) {
      tagsToProcess.push(tagInput.trim());
    }
    
    if (tagsToProcess.length > 0) {
      onConfirm(tagsToProcess);
      setTagInput('');
      setSelectedTags(new Set());
      onClose();
    }
  };

  const toggleTag = (tag: string) => {
    const newSet = new Set(selectedTags);
    if (newSet.has(tag)) {
      newSet.delete(tag);
    } else {
      newSet.add(tag);
    }
    setSelectedTags(newSet);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-gray-900/50 backdrop-blur-sm p-4 animate-fade-in">
      <div className="bg-white shadow-2xl w-full max-w-md overflow-hidden flex flex-col max-h-[85vh] rounded-2xl border border-gray-200">
        <div className="px-5 py-4 border-b border-gray-100 flex justify-between items-center">
          <h3 className="text-base font-semibold text-gray-800 flex items-center gap-2">
            <div className={`p-1.5 rounded-lg ${mode === 'add' ? 'bg-primary-50 text-primary-600' : 'bg-rose-50 text-rose-600'}`}>
               {mode === 'add' ? <Tag size={14} /> : <Tag size={14} />}
            </div>
            {mode === 'add' ? '批量添加标签' : '批量移除标签'}
          </h3>
          <button onClick={onClose} className="p-2 text-gray-400 hover:text-gray-600 hover:bg-gray-100 rounded-lg transition-all cursor-pointer">
            <X size={20} />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="flex-1 overflow-y-auto p-5">
          <p className="text-xs text-gray-500 mb-4 bg-gray-50 p-3 rounded-xl border border-gray-100">
            已选中 <span className="font-bold text-gray-700">{selectedCount}</span> 位联系人
          </p>

          {mode === 'add' && (
            <div className="mb-4">
              <label className="block text-[10px] font-medium text-gray-400 uppercase tracking-wider mb-2">输入新标签 (可选)</label>
              <input
                type="text"
                value={tagInput}
                onChange={(e) => setTagInput(e.target.value)}
                placeholder="例如：重要客户"
                className="input"
              />
            </div>
          )}

          <div>
             <label className="block text-[10px] font-medium text-gray-400 uppercase tracking-wider mb-3">选择现有标签</label>
             {existingTags.length === 0 ? (
                 <div className="text-center py-4 bg-gray-50 rounded-xl border border-dashed border-gray-200">
                   <p className="text-xs text-gray-400 italic">暂无其他可用标签</p>
                 </div>
             ) : (
                 <div className="flex flex-wrap gap-2 max-h-48 overflow-y-auto p-1">
                     {existingTags.map(tag => {
                       const isSelected = selectedTags.has(tag);
                       return (
                         <button
                             key={tag}
                             type="button"
                             onClick={() => toggleTag(tag)}
                             className={`px-3 py-1.5 text-xs font-medium rounded-lg border flex items-center gap-1.5 transition-all duration-150 ${
                                 isSelected
                                  ? mode === 'add' 
                                    ? 'bg-primary-50 border-primary-400 text-primary-700' 
                                    : 'bg-rose-50 border-rose-400 text-rose-700'
                                  : 'bg-white border-gray-200 text-gray-600 hover:border-primary-300 hover:text-primary-600'
                             }`}
                         >
                             {isSelected ? <CheckCircle2 size={12} /> : <Circle size={12} className="text-gray-300" />}
                             {tag}
                         </button>
                       );
                     })}
                 </div>
             )}
          </div>
        </form>

        <div className="px-5 py-4 border-t border-gray-100 bg-white flex justify-end gap-2 shrink-0">
           <button
             type="button"
             onClick={onClose}
             className="btn btn-secondary text-xs py-2"
           >
             取消
           </button>
           <button
             type="submit"
             onClick={handleSubmit}
             disabled={mode === 'add' ? (!tagInput && selectedTags.size === 0) : selectedTags.size === 0}
             className={`btn text-xs py-2 font-medium rounded-md transition-all flex items-center gap-1.5 ${
                 mode === 'add' 
                  ? 'btn-primary' 
                  : 'bg-gray-900 hover:bg-gray-800 text-white'
             } disabled:opacity-50 disabled:cursor-not-allowed`}
           >
             {mode === 'add' ? <Check size={12} /> : <Trash2 size={12} />}
             {mode === 'add' ? '确认添加' : '确认移除'}
           </button>
        </div>
      </div>
    </div>
  );
};

export default BatchTagModal;
