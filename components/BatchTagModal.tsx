
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
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 backdrop-blur-md p-0 sm:p-4 animate-in fade-in duration-200">
      <div className="bg-white rounded-none sm:rounded-3xl shadow-2xl w-full max-w-md overflow-hidden transform scale-100 transition-all flex flex-col h-full sm:h-auto sm:max-h-[90vh] ring-1 ring-white/20">
        <div className="px-4 sm:px-6 py-4 sm:py-5 border-b border-slate-100 flex justify-between items-center bg-white shrink-0">
          <h3 className="text-base sm:text-lg font-bold text-slate-800 flex items-center gap-2">
            <div className={`p-1.5 sm:p-2 rounded-lg ${mode === 'add' ? "bg-emerald-50 text-emerald-600" : "bg-rose-50 text-rose-500"}`}>
               <Tag size={18} />
            </div>
            {mode === 'add' ? '批量添加标签' : '批量移除标签'}
          </h3>
          <button onClick={onClose} className="text-slate-400 hover:text-slate-600 p-1 rounded-full hover:bg-slate-50 transition-colors">
            <X size={20} />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="p-4 sm:p-8 flex-1 overflow-y-auto custom-scrollbar flex flex-col">
          <p className="text-xs sm:text-sm text-slate-500 mb-4 sm:mb-6 bg-slate-50 p-3 rounded-xl border border-slate-100">
            已选中 <span className="font-bold text-slate-800">{selectedCount}</span> 位联系人
          </p>

          {mode === 'add' && (
            <div className="mb-4 sm:mb-6">
              <label className="block text-[10px] sm:text-xs font-bold text-slate-400 uppercase tracking-widest mb-2">输入新标签 (可选)</label>
              <input
                type="text"
                value={tagInput}
                onChange={(e) => setTagInput(e.target.value)}
                placeholder="例如：重要客户"
                className="w-full rounded-xl border-0 bg-slate-50 px-4 py-2.5 sm:py-3 text-sm sm:text-base text-slate-800 focus:bg-white focus:ring-2 focus:ring-emerald-500/20 focus:outline-none transition-all placeholder:text-slate-400 font-medium"
              />
            </div>
          )}

          <div className="flex-1">
             <label className="block text-[10px] sm:text-xs font-bold text-slate-400 uppercase tracking-widest mb-3">选择现有标签</label>
             {existingTags.length === 0 ? (
                 <div className="text-center py-4 bg-slate-50 rounded-xl border border-dashed border-slate-200">
                   <p className="text-xs text-slate-400 italic">暂无其他可用标签</p>
                 </div>
             ) : (
                 <div className="flex flex-wrap gap-2 max-h-48 sm:max-h-64 overflow-y-auto p-1 custom-scrollbar">
                     {existingTags.map(tag => {
                       const isSelected = selectedTags.has(tag);
                       return (
                         <button
                             key={tag}
                             type="button"
                             onClick={() => toggleTag(tag)}
                             className={`px-3 py-2 text-xs sm:text-sm font-medium rounded-xl border flex items-center gap-2 transition-all duration-200 ${
                                 isSelected
                                  ? mode === 'add' 
                                    ? 'bg-emerald-50 border-emerald-500 text-emerald-700 shadow-sm' 
                                    : 'bg-rose-50 border-rose-500 text-rose-700 shadow-sm'
                                  : 'bg-white border-slate-200 text-slate-600 hover:border-emerald-300 hover:text-emerald-600'
                             }`}
                         >
                             {isSelected ? <CheckCircle2 size={14} /> : <Circle size={14} className="text-slate-300" />}
                             {tag}
                         </button>
                       );
                     })}
                 </div>
             )}
          </div>

          <div className="mt-6 sm:mt-8 flex flex-col sm:flex-row justify-end gap-3 pt-4 border-t border-slate-50">
             <button
               type="button"
               onClick={onClose}
               className="order-2 sm:order-1 px-5 py-2.5 text-sm font-medium text-slate-600 hover:bg-slate-50 rounded-xl transition-colors"
             >
               取消
             </button>
             <button
               type="submit"
               disabled={mode === 'add' ? (!tagInput && selectedTags.size === 0) : selectedTags.size === 0}
               className={`order-1 sm:order-2 px-6 py-3 sm:py-2.5 text-sm text-white rounded-xl shadow-lg font-bold transition-all transform hover:-translate-y-0.5 active:scale-95 flex items-center justify-center gap-2 ${
                   mode === 'add' 
                    ? 'bg-gradient-to-r from-emerald-500 to-teal-500 hover:from-emerald-400 hover:to-teal-400 shadow-emerald-200' 
                    : 'bg-rose-500 hover:bg-rose-600 shadow-rose-200'
               } disabled:opacity-50 disabled:cursor-not-allowed disabled:shadow-none disabled:transform-none`}
             >
               {mode === 'add' ? <Check size={18} /> : <Trash2 size={18} />}
               {mode === 'add' ? '确认添加' : '确认移除'}
             </button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default BatchTagModal;