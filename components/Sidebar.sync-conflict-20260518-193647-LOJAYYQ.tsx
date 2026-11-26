
import React, { useState, useRef, useEffect } from 'react';
import { Users, PlusCircle, Trash2, Edit2, Check, X, Sparkles, ClipboardList, FileText, CheckSquare, Square, ChevronLeft, ChevronRight } from 'lucide-react';
import { Clock, CheckCircle2, CircleDashed } from 'lucide-react';

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
  followUpFilter?: 'idle' | 'following' | 'contacted' | null;
  onFollowUpFilter?: (filter: 'idle' | 'following' | 'contacted' | null) => void;
  isMobileOpen?: boolean;
  onCloseMobile?: () => void;
}

const Sidebar: React.FC<SidebarProps> = ({
  tags, selectedTags, onSelectTag, onAddNew, onDeleteTag, onRenameTag, onBatchDeleteTags, onToggleAllTags, totalContacts, followUpCount, policyCount, currentView, onChangeView, followUpFilter, onFollowUpFilter, isMobileOpen, onCloseMobile
}) => {
  const [isCollapsed, setIsCollapsed] = useState(false);
  const [editingTag, setEditingTag] = useState<string | null>(null);
  const [editValue, setEditValue] = useState('');
  const editInputRef = useRef<HTMLInputElement>(null);
  const collapseBtnRef = useRef<HTMLButtonElement>(null);

  useEffect(() => {
    if (editingTag && editInputRef.current) editInputRef.current.focus();
  }, [editingTag]);

  useEffect(() => {
    try {
      const btn = collapseBtnRef.current;
      if (!btn) return;
      const btnClass = btn.className || '';
      const usesGroupHoverNamespace = btnClass.includes('group-hover/sidebar');
      let hasGroupSidebarAncestor = false;
      let el: HTMLElement | null = btn.parentElement;
      while (el) {
        const cn = el.className || '';
        if (typeof cn === 'string' && cn.includes('group/sidebar')) {
          hasGroupSidebarAncestor = true;
          break;
        }
        el = el.parentElement;
      }

      console.log('Sidebar collapse button check:', { usesGroupHoverNamespace, hasGroupSidebarAncestor });
    } catch {
      // ignore
    }
  }, [isMobileOpen]);

  const saveEditing = () => {
    if (editingTag && editValue.trim() && editValue.trim() !== editingTag) onRenameTag(editingTag, editValue.trim());
    setEditingTag(null);
  };

  const isViewActive = (view: typeof currentView) => currentView === view;

  return (
    <>
      {isMobileOpen && (
        <div
          className="fixed inset-0 bg-gray-900/20 z-40 md:hidden animate-fade-in"
          onClick={onCloseMobile}
        />
      )}

      <div className={`
        group/sidebar
        ${isCollapsed ? 'w-16' : 'w-64'}
        bg-white h-full border-r border-gray-100 flex flex-col z-50
        fixed md:relative inset-y-0 left-0 transition-all duration-200 ease-in-out
        ${isMobileOpen ? 'translate-x-0' : '-translate-x-full md:translate-x-0'}
      `}>
        <div className="md:hidden absolute top-4 right-4 z-50">
          <button onClick={onCloseMobile} className="p-2 text-gray-400 hover:text-gray-900 transition-colors rounded-md hover:bg-gray-100">
            <X size={22} />
          </button>
        </div>

        <button
          ref={collapseBtnRef}
          onClick={() => setIsCollapsed(!isCollapsed)}
          className="hidden md:flex absolute -right-3 top-12 w-6 h-6 bg-white border border-gray-200 rounded-full items-center justify-center text-gray-400 hover:text-gray-900 hover:border-gray-300 shadow-sm z-50 transition-all opacity-0 group-hover/sidebar:opacity-100 cursor-pointer"
        >
          {isCollapsed ? <ChevronRight size={12} /> : <ChevronLeft size={12} />}
        </button>

        <div className={`p-4 flex items-center ${isCollapsed ? 'justify-center' : 'gap-3'} h-16 border-b border-gray-100`}>
          <div className="w-9 h-9 bg-gray-900 rounded-lg flex items-center justify-center text-white shrink-0">
            <svg width="20" height="20" viewBox="0 0 40 40" fill="none" xmlns="http://www.w3.org/2000/svg">
              <path d="M20 4L6 10V18C6 28 20 36 20 36C20 36 34 28 34 18V10L20 4Z" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" fill="none"/>
              <path d="M14 20L18 24L26 16" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" fill="none"/>
              <circle cx="20" cy="12" r="2" fill="currentColor"/>
            </svg>
          </div>
          {!isCollapsed && (
            <div className="animate-fade-in">
              <h1 className="text-base font-semibold text-gray-900 tracking-tight">保险跟单仔</h1>
              <p className="text-xs text-gray-500 font-medium">客户管理系统</p>
            </div>
          )}
        </div>

        <div className="px-3 py-4 flex-1 overflow-y-auto">
          <div className="mb-6">
            <button
              onClick={() => { onAddNew(); onCloseMobile?.(); }}
              className={`bg-gray-900 hover:bg-gray-800 text-white ${isCollapsed ? 'w-10 h-10 rounded-lg mx-auto' : 'w-full py-2.5 px-4 rounded-lg'} flex items-center justify-center gap-2 font-medium transition-all cursor-pointer`}
            >
              <PlusCircle size={17} />
              {!isCollapsed && <span>添加 / 导入</span>}
            </button>
          </div>

          <div className="space-y-1 mb-6 hidden md:block">
            {!isCollapsed && <p className="px-3 text-xs font-semibold text-gray-400 uppercase tracking-wider mb-2">工作台</p>}
            {[
              { id: 'contacts', label: '全部联系人', short: '全部', icon: Users, count: totalContacts },
              { id: 'followups', label: '跟进工作台', short: '跟进', icon: ClipboardList, count: followUpCount },
              { id: 'policies', label: '保单管理', short: '保单', icon: FileText, count: policyCount }
            ].map(item => (
              <button
                key={item.id}
                onClick={() => { onChangeView(item.id as any); if(item.id === 'contacts') onSelectTag(null); onCloseMobile?.(); }}
                className={`w-full flex items-center ${isCollapsed ? 'justify-center py-2.5' : 'justify-between py-2 px-3'} text-sm font-medium rounded-md transition-all duration-150 cursor-pointer
                  ${isViewActive(item.id as any) && (item.id !== 'contacts' || selectedTags.size === 0)
                    ? 'bg-gray-100 text-gray-900'
                    : 'text-gray-600 hover:bg-gray-50 hover:text-gray-900'}`}
                title={isCollapsed ? item.label : ''}
              >
                <div className={`flex ${isCollapsed ? 'flex-col' : 'flex-row'} items-center gap-2`}>
                  <item.icon size={16} className={isViewActive(item.id as any) && (item.id !== 'contacts' || selectedTags.size === 0) ? "text-gray-900" : "text-gray-400"} />
                  {!isCollapsed && <span>{item.label}</span>}
                  {isCollapsed && <span className="text-[10px] font-medium mt-0.5">{item.short}</span>}
                </div>
                {!isCollapsed && item.count !== undefined && (
                  <span className={`py-0.5 px-2 rounded-full text-xs font-medium
                    ${isViewActive(item.id as any) && selectedTags.size === 0 ? 'bg-gray-900 text-white' : 'bg-gray-100 text-gray-500'}`}>
                    {item.count}
                  </span>
                )}
              </button>
            ))}
          </div>

          {!isCollapsed && (
            <div className="space-y-1 animate-fade-in">
              <div className="flex items-center justify-between px-3 mb-2">
                <div className="flex items-center gap-2">
                  <button onClick={() => onToggleAllTags(selectedTags.size !== tags.length)} className="text-gray-300 hover:text-gray-900 transition-colors cursor-pointer">
                    {selectedTags.size === tags.length ? <CheckSquare size={15} className="text-gray-900" /> : <Square size={15} />}
                  </button>
                  <p className="text-xs font-semibold text-gray-400 uppercase tracking-wider">标签筛选</p>
                </div>
                {selectedTags.size > 0 && (
                  <div className="flex items-center gap-1.5 animate-fade-in">
                    <span className="text-xs font-medium text-gray-900 bg-gray-100 px-2 py-0.5 rounded-full">已选 {selectedTags.size}</span>
                    <button
                      onClick={(e) => { e.stopPropagation(); onBatchDeleteTags(Array.from(selectedTags)); }}
                      className="p-1 text-gray-400 hover:text-gray-900 hover:bg-gray-100 rounded-md transition-colors cursor-pointer"
                      title="批量删除选中标签"
                    >
                      <Trash2 size={13} />
                    </button>
                  </div>
                )}
              </div>
              {tags.map(tag => (
                <div key={tag} onClick={() => onSelectTag(tag)} className={`group w-full flex items-center justify-between px-3 py-2 text-sm font-medium rounded-md transition-all cursor-pointer
                  ${selectedTags.has(tag) ? 'bg-gray-100 text-gray-900' : 'text-gray-600 hover:bg-gray-50'}`}>
                  <div className="flex items-center gap-2 truncate">
                    <div className={`w-4 h-4 rounded border flex items-center justify-center transition-all shrink-0
                      ${selectedTags.has(tag) ? 'bg-gray-900 border-gray-900' : 'bg-white border-gray-300'}`}>
                      {selectedTags.has(tag) && <Check size={11} className="text-white" strokeWidth={3} />}
                    </div>
                    <span className="truncate">{tag}</span>
                  </div>
                  <div className="flex gap-0.5 opacity-0 group-hover:opacity-100 transition-opacity">
                    <button onClick={(e) => { e.stopPropagation(); setEditingTag(tag); setEditValue(tag); }} className="p-1 text-gray-400 hover:text-gray-900 hover:bg-gray-100 rounded-md transition-colors cursor-pointer">
                      <Edit2 size={12} />
                    </button>
                    <button onClick={(e) => { e.stopPropagation(); onDeleteTag(tag); }} className="p-1 text-gray-400 hover:text-gray-900 hover:bg-gray-100 rounded-md transition-colors cursor-pointer">
                      <Trash2 size={12} />
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </>
  );
};

export default Sidebar;
