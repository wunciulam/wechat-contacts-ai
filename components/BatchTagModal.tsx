import Button from './ui/Button';
import WorkspaceDialog,{WorkspaceDialogFooter} from './WorkspaceDialog';
import Field from './ui/Field';
import Input from './ui/Input';

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

  return <WorkspaceDialog title={mode==='add'?'批量添加标签':'批量移除标签'} compact onClose={onClose}>
        <form id="batch-tag-form" onSubmit={handleSubmit} className="space-y-4">
          <p className="text-xs text-gray-500 mb-4 bg-gray-50 p-3 rounded-xl border border-gray-100">
            已选中 <span className="font-bold text-gray-700">{selectedCount}</span> 位联系人
          </p>

          {mode === 'add' && (
            <Field className="mb-4" label={<>输入新标签 (可选)</>}>

              <Input
                type="text"
                value={tagInput}
                onChange={(e) => setTagInput(e.target.value)}
                placeholder="例如：重要客户"
                className=""
              />
            </Field>
          )}

          <div>
             <label className="block text-xs font-medium text-gray-400 uppercase tracking-wider mb-3">选择现有标签</label>
             {existingTags.length === 0 ? (
                 <div className="text-center py-4 bg-gray-50 rounded-xl border border-dashed border-gray-200">
                   <p className="text-xs text-gray-400 italic">暂无其他可用标签</p>
                 </div>
             ) : (
                 <div className="flex flex-wrap gap-2 max-h-48 overflow-y-auto p-1">
                     {existingTags.map(tag => {
                       const isSelected = selectedTags.has(tag);
                       return (
                         <Button
                             key={tag}
                             type="button"
                             onClick={() => toggleTag(tag)}
                             className={`px-3 py-1.5 text-xs font-medium rounded-lg border flex items-center gap-1.5 transition-colors duration-150 ${
                                 isSelected
                                  ? mode === 'add'
                                    ? 'bg-primary-50 border-primary-400 text-primary-700'
                                    : 'bg-rose-50 border-rose-400 text-rose-700'
                                  : 'bg-white border-gray-200 text-gray-600 hover:border-primary-300 hover:text-primary-600'
                             }`} variant="plain"
                         >
                             {isSelected ? <CheckCircle2 size={12} /> : <Circle size={12} className="text-gray-300" />}
                             {tag}
                         </Button>
                       );
                     })}
                 </div>
             )}
          </div>
        </form>

        <WorkspaceDialogFooter>
           <Button
             type="button"
             onClick={onClose}
             className="" variant="secondary"
           >
             取消
           </Button>
           <Button
             type="submit" form="batch-tag-form"
             disabled={mode === 'add' ? (!tagInput && selectedTags.size === 0) : selectedTags.size === 0}
             className={`   font-medium rounded-md transition-colors flex items-center gap-1.5 ${
                 mode === 'add'
                  ? ''
                  : 'bg-gray-900 hover:bg-gray-800 text-white'
             } disabled:opacity-50 disabled:cursor-not-allowed`} variant="primary"
           >
             {mode === 'add' ? <Check size={12} /> : <Trash2 size={12} />}
             {mode === 'add' ? '确认添加' : '确认移除'}
           </Button>
        </WorkspaceDialogFooter>
    </WorkspaceDialog>;
};

export default BatchTagModal;
