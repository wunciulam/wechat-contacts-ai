
import React, { useState, useRef, useEffect } from 'react';
import { Users, Hash, PlusCircle, Trash2, Edit2, Check, X, Sparkles, ClipboardList, Book, CheckSquare, Square, FileText, ChevronLeft, ChevronRight } from 'lucide-react';

interface SidebarProps {
  tags: string[];
  selectedTags: Set<string>;
  onSelectTag: (tag: string | null) => void;
  onAddNew: () => void;
  onDeleteTag: (tag: string) => void;
  onRenameTag: (oldTag: string, newTag: string) => void;
  onBatchDeleteTags: (tags: string[]) => void;
  onToggleAllTags: (select: boolean) => void;
  totalContacts: number;
  followUpCount: number;
  policyCount: number;
  currentView: 'contacts' | 'followups' | 'policies';
  onChangeView: (view: 'contacts' | 'followups' | 'policies') => void;
  onOpenSpecs: () => void;
  isMobileOpen?: boolean;
  onCloseMobile?: () => void;
}

const Sidebar: React.FC<SidebarProps> = ({ 
  tags, selectedTags, onSelectTag, onAddNew, onDeleteTag, onRenameTag, onBatchDeleteTags, onToggleAllTags, totalContacts, followUpCount, policyCount, currentView, onChangeView, onOpenSpecs, isMobileOpen, onCloseMobile
}) => {
  const [isCollapsed, setIsCollapsed] = useState(false);
  const [editingTag, setEditingTag] = useState<string | null>(null);
  const [editValue, setEditValue] = useState('');
  const editInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (editingTag && editInputRef.current) editInputRef.current.focus();
  }, [editingTag]);

  const saveEditing = () => {
    if (editingTag && editValue.trim() && editValue.trim() !== editingTag) onRenameTag(editingTag, editValue.trim());
    setEditingTag(null);
  };

  const isViewActive = (view: typeof currentView) => currentView === view;

  return (
    <>
      {/* Mobile Overlay */}
      {isMobileOpen && (
        <div 
          className="fixed inset-0 bg-slate-900/50 backdrop-blur-sm z-40 md:hidden animate-in fade-in duration-300"
          onClick={onCloseMobile}
        />
      )}

      <div className={`
        ${isCollapsed ? 'w-20' : 'w-72'} 
        bg-white h-full border-r border-slate-100 flex flex-col z-50 shadow-xl md:shadow-none transition-all duration-300 relative group/sidebar
        fixed md:relative inset-y-0 left-0 transform ${isMobileOpen ? 'translate-x-0' : '-translate-x-full md:translate-x-0'}
      `}>
        <div className="md:hidden absolute top-4 right-4 z-50">
          <button onClick={onCloseMobile} className="p-2 text-slate-400 hover:text-rose-500 transition-colors">
            <X size={24} />
          </button>
        </div>
        <button 
          onClick={() => setIsCollapsed(!isCollapsed)}
          className="hidden md:flex absolute -right-3 top-10 w-6 h-6 bg-white border border-slate-200 rounded-full items-center justify-center text-slate-400 hover:text-emerald-600 hover:border-emerald-200 shadow-sm z-50 transition-all opacity-0 group-hover/sidebar:opacity-100"
        >
          {isCollapsed ? <ChevronRight size={14} /> : <ChevronLeft size={14} />}
        </button>

        <div className={`p-6 flex items-center ${isCollapsed ? 'justify-center' : 'gap-3'} h-[80px]`}>
          <div className="w-10 h-10 bg-gradient-to-br from-emerald-500 to-teal-600 rounded-xl flex items-center justify-center text-white shadow-lg shadow-emerald-200 shrink-0">
            <Sparkles size={20} strokeWidth={2.5} />
          </div>
          {!isCollapsed && (
            <div className="animate-in fade-in slide-in-from-left-2 duration-300">
              <h1 className="text-lg font-bold text-slate-800 tracking-tight leading-none">微信通讯录</h1>
              <p className="text-xs text-slate-400 font-medium mt-1">AI 智能助手</p>
            </div>
          )}
          {isMobileOpen && (
            <button onClick={onCloseMobile} className="ml-auto p-2 text-slate-400 hover:text-slate-600 md:hidden">
              <X size={20} />
            </button>
          )}
        </div>

        <div className="px-4 pb-4 flex-1 overflow-y-auto custom-scrollbar">
          <div className="mb-8 mt-2">
            <button onClick={() => { onAddNew(); onCloseMobile?.(); }} className={`bg-gradient-to-r from-emerald-500 to-teal-500 hover:from-emerald-400 hover:to-teal-400 text-white ${isCollapsed ? 'w-12 h-12 rounded-full mx-auto' : 'w-full py-3.5 px-4 rounded-2xl'} flex items-center justify-center gap-2 font-semibold transition-all shadow-lg shadow-emerald-200 hover:shadow-emerald-300 active:scale-95`}>
              <PlusCircle size={20} />{!isCollapsed && <span>添加 / 导入</span>}
            </button>
          </div>

          <div className="space-y-1 mb-8 hidden md:block">
            {!isCollapsed && <p className="px-4 text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-3">工作台</p>}
            {[
              { id: 'contacts', label: '全部联系人', short: '全部', icon: Users, count: totalContacts },
              { id: 'followups', label: '跟进工作台', short: '跟进', icon: ClipboardList, count: followUpCount },
              { id: 'policies', label: '保单管理', short: '保单', icon: FileText, count: policyCount }
            ].map(item => (
              <button
                key={item.id}
                onClick={() => { onChangeView(item.id as any); if(item.id === 'contacts') onSelectTag(null); onCloseMobile?.(); }}
                className={`w-full flex flex-col md:flex-row items-center ${isCollapsed ? 'justify-center py-3' : 'justify-between py-3'} px-4 text-sm font-medium rounded-xl transition-all duration-200 ${isViewActive(item.id as any) && (item.id !== 'contacts' || selectedTags.size === 0) ? 'bg-emerald-50 text-emerald-700 shadow-sm ring-1 ring-emerald-100' : 'text-slate-600 hover:bg-slate-50'}`}
                title={isCollapsed ? item.label : ''}
              >
                <div className={`flex ${isCollapsed ? 'flex-col' : 'flex-row'} items-center gap-1 md:gap-3`}>
                  <item.icon size={18} className={isViewActive(item.id as any) && (item.id !== 'contacts' || selectedTags.size === 0) ? "text-emerald-600" : "text-slate-400"} />
                  {!isCollapsed ? (
                    <span>{item.label}</span>
                  ) : (
                    <span className="text-[10px] font-bold leading-none mt-1">{item.short}</span>
                  )}
                </div>
                {!isCollapsed && item.count !== undefined && (
                  <span className={`py-0.5 px-2.5 rounded-full text-xs font-semibold ${isViewActive(item.id as any) && selectedTags.size === 0 ? 'bg-emerald-100 text-emerald-700' : 'bg-slate-100 text-slate-500'}`}>
                    {item.count}
                  </span>
                )}
              </button>
            ))}
          </div>

          {!isCollapsed && (
            <div className="space-y-1 animate-in fade-in duration-300">
              <div className={`flex items-center justify-between px-4 mb-3`}>
                <div className="flex items-center gap-2">
                  <button onClick={() => onToggleAllTags(selectedTags.size !== tags.length)} className="text-slate-300 hover:text-emerald-500 transition-colors">
                    {selectedTags.size === tags.length ? <CheckSquare size={15} className="text-emerald-500" /> : <Square size={15} />}
                  </button>
                  <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">标签筛选</p>
                </div>
                {selectedTags.size > 0 && (
                  <div className="flex items-center gap-1.5 animate-in fade-in slide-in-from-right-2">
                    <span className="text-[10px] font-bold text-emerald-600 bg-emerald-50 px-2 py-0.5 rounded-full">已选 {selectedTags.size}</span>
                    <button 
                      onClick={(e) => { e.stopPropagation(); onBatchDeleteTags(Array.from(selectedTags)); }}
                      className="p-1 text-slate-400 hover:text-rose-500 hover:bg-rose-50 rounded-md transition-colors"
                      title="批量删除选中标签"
                    >
                      <Trash2 size={13} />
                    </button>
                  </div>
                )}
              </div>
              {tags.map(tag => (
                <div key={tag} onClick={() => onSelectTag(tag)} className={`group w-full flex items-center justify-between px-4 py-2.5 text-sm font-medium rounded-xl transition-all cursor-pointer ${selectedTags.has(tag) ? 'bg-emerald-50 text-emerald-700 shadow-sm ring-1 ring-emerald-100' : 'text-slate-600 hover:bg-slate-50'}`}>
                  <div className="flex items-center gap-3 truncate text-left">
                    <div className={`w-4 h-4 rounded border flex items-center justify-center transition-all shrink-0 ${selectedTags.has(tag) ? 'bg-emerald-500 border-emerald-500' : 'bg-white border-slate-300'}`}>{selectedTags.has(tag) && <Check size={12} className="text-white" strokeWidth={3} />}</div>
                    <span className="truncate">{tag}</span>
                  </div>
                  <div className="flex gap-1 opacity-0 group-hover:opacity-100 transition-all">
                    <button onClick={(e) => { e.stopPropagation(); setEditingTag(tag); setEditValue(tag); }} className="p-1 text-slate-400 hover:text-blue-500 hover:bg-blue-50 rounded-md"><Edit2 size={13} /></button>
                    <button onClick={(e) => { e.stopPropagation(); onDeleteTag(tag); }} className="p-1 text-slate-400 hover:text-rose-500 hover:bg-rose-50 rounded-md"><Trash2 size={13} /></button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
        <div className="p-4 border-t border-slate-100 shrink-0">
          <button onClick={() => { onOpenSpecs(); onCloseMobile?.(); }} className="w-full flex items-center justify-center gap-2 text-xs font-semibold text-slate-500 hover:text-indigo-600 bg-slate-50 p-3 rounded-xl transition-colors hover:shadow-inner">
            <Book size={14} />{!isCollapsed && <span>产品说明文档</span>}
          </button>
        </div>
      </div>
    </>
  );
};

export default Sidebar;
