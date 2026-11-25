import Checkbox from './ui/Checkbox';
import type {Category} from '../types';
import {UNCATEGORIZED} from '../services/customerFilters';
import Input from './ui/Input';
import WorkspaceDialog from './WorkspaceDialog';
import Button, {IconButton} from './ui/Button';

import React, { useState, useRef, useEffect } from 'react';
import { Users, PlusCircle, Trash2, Edit2, Check, X, Sparkles, ClipboardList, FileText, CheckSquare, Square, ChevronLeft, ChevronRight } from 'lucide-react';
import { Clock, CheckCircle2, CircleDashed } from 'lucide-react';

interface SidebarProps {
  categories:Category[];
  selectedCategories:Set<string>;
  onSelectCategory:(id:string)=>void;
  onToggleAllCategories:(ids:string[])=>void;
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
  categories,selectedCategories,onSelectCategory,onToggleAllCategories,tags, selectedTags, onSelectTag, onAddNew, onDeleteTag, onRenameTag, onBatchDeleteTags, onToggleAllTags, totalContacts, followUpCount, policyCount, currentView, onChangeView, followUpFilter, onFollowUpFilter, isMobileOpen, onCloseMobile
}) => {
  const [isCollapsed, setIsCollapsed] = useState(false);
  const [editingTag, setEditingTag] = useState<string | null>(null);
  const [editValue, setEditValue] = useState('');
  const editInputRef = useRef<HTMLInputElement>(null);
  const collapseBtnRef = useRef<HTMLButtonElement>(null);

  useEffect(() => {
    if (editingTag && editInputRef.current) editInputRef.current.focus();
  }, [editingTag]);

  const saveEditing = () => {
    if (editingTag && editValue.trim() && editValue.trim() !== editingTag) onRenameTag(editingTag, editValue.trim());
    setEditingTag(null);
  };

  const [isDesktop,setIsDesktop]=useState(()=>window.matchMedia('(min-width: 768px)').matches);
  useEffect(()=>{const media=window.matchMedia('(min-width: 768px)');const update=()=>setIsDesktop(media.matches);media.addEventListener('change',update);return()=>media.removeEventListener('change',update);},[]);
  const compact=isCollapsed&&isDesktop;
  const isViewActive = (view: typeof currentView) => currentView === view;

  const content=<div className="group/sidebar relative flex h-full flex-col bg-white">
        <div className="md:hidden absolute top-4 right-4 z-50">
          <IconButton onClick={onCloseMobile} className="text-gray-500 hover:text-gray-900 transition-colors rounded-md hover:bg-gray-100" aria-label="关闭">
            <X size={22} />
          </IconButton>
        </div>

        <Button
          ref={collapseBtnRef} aria-label={compact?'展开侧栏':'收起侧栏'}
          onClick={() => setIsCollapsed(!isCollapsed)}
          className="hidden md:flex absolute -right-3 top-12 w-6 h-6 bg-white border border-gray-200 rounded-full items-center justify-center text-gray-500 hover:text-gray-900 hover:border-gray-300 shadow-sm z-50 transition-colors opacity-0 group-hover/sidebar:opacity-100 cursor-pointer" variant="plain"
        >
          {compact ? <ChevronRight size={12} /> : <ChevronLeft size={12} />}
        </Button>

        <div className={`p-4 flex items-center ${compact ? 'justify-center' : 'gap-3'} h-16 border-b border-gray-100`}>
          <div className="w-9 h-9 bg-gray-900 rounded-lg flex items-center justify-center text-white shrink-0">
            <svg width="20" height="20" viewBox="0 0 40 40" fill="none" xmlns="http://www.w3.org/2000/svg">
              <path d="M20 4L6 10V18C6 28 20 36 20 36C20 36 34 28 34 18V10L20 4Z" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" fill="none"/>
              <path d="M14 20L18 24L26 16" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" fill="none"/>
              <circle cx="20" cy="12" r="2" fill="currentColor"/>
            </svg>
          </div>
          {!compact && (
            <div className="animate-fade-in">
              <h1 className="text-base font-semibold text-gray-900 tracking-tight">保险跟单仔</h1>

            </div>
          )}
        </div>

        <div className="px-3 py-4 flex-1 overflow-y-auto">
          <div className="mb-6">
            <Button
              onClick={() => { onAddNew(); onCloseMobile?.(); }}
              className={`bg-gray-900 hover:bg-gray-800 text-white ${compact ? 'w-10 h-10 rounded-lg mx-auto' : 'w-full py-2.5 px-4 rounded-lg'} flex items-center justify-center gap-2 font-medium transition-colors cursor-pointer`} variant="plain"
            >
              <PlusCircle size={17} />
              {!compact && <span>添加 / 导入</span>}
            </Button>
          </div>

          <div className="space-y-1 mb-6 hidden md:block">
            {!compact && <p className="px-3 text-xs font-semibold text-gray-500  mb-2">工作台</p>}
            {[
              { id: 'contacts', label: '全部联系人', short: '全部', icon: Users, count: totalContacts },
              { id: 'followups', label: '跟进工作台', short: '跟进', icon: ClipboardList, count: followUpCount },

              { id: 'policies', label: '保单管理', short: '保单', icon: FileText, count: policyCount }
            ].map(item => (
              <Button
                key={item.id}
                onClick={() => { onChangeView(item.id as any); if(item.id === 'contacts') onSelectTag(null); onCloseMobile?.(); }}
                className={`w-full flex items-center ${compact ? 'justify-center py-2.5' : 'justify-between py-2 px-3'} text-sm font-medium rounded-md transition-colors duration-150 cursor-pointer
                  ${isViewActive(item.id as any) && (item.id !== 'contacts' || selectedTags.size === 0)
                    ? 'bg-gray-100 text-gray-900'
                    : 'text-gray-600 hover:bg-gray-50 hover:text-gray-900'}`}
                title={compact ? item.label : ''} variant="plain"
              >
                <div className={`flex ${compact ? 'flex-col' : 'flex-row'} items-center gap-2`}>
                  <item.icon size={16} className={isViewActive(item.id as any) && (item.id !== 'contacts' || selectedTags.size === 0) ? "text-gray-900" : "text-gray-500"} />
                  {!compact && <span>{item.label}</span>}
                  {compact && <span className="text-xs font-medium mt-0.5">{item.short}</span>}
                </div>
                {!compact && item.count !== undefined && (
                  <span className={`py-0.5 px-2 rounded-full text-xs font-medium
                    ${isViewActive(item.id as any) && selectedTags.size === 0 ? 'bg-gray-900 text-white' : 'bg-gray-100 text-gray-500'}`}>
                    {item.count}
                  </span>
                )}
              </Button>
            ))}
          </div>

          {!compact && (<div className="space-y-5">
            <div className="space-y-1 animate-fade-in">
              <div className="flex items-center justify-between px-3 mb-2">
                <div className="flex items-center gap-2">
                  <Checkbox aria-label="全选标签" checked={tags.length>0&&selectedTags.size===tags.length} indeterminate={selectedTags.size>0&&selectedTags.size<tags.length} onChange={e=>onToggleAllTags(e.target.checked)}/>
                  <p className="text-xs font-semibold text-gray-500 ">标签筛选</p>
                </div>
                {selectedTags.size > 0 && (
                  <div className="flex items-center gap-1.5 animate-fade-in">
                    <span className="text-xs font-medium text-gray-900 bg-gray-100 px-2 py-0.5 rounded-full">已选 {selectedTags.size}</span>
                    <IconButton
                      onClick={(e) => { e.stopPropagation(); onBatchDeleteTags(Array.from(selectedTags)); }}
                      className="text-gray-500 hover:text-gray-900 hover:bg-gray-100 rounded-md transition-colors cursor-pointer"
                      title="批量删除选中标签" aria-label="批量删除选中标签"
                    >
                      <Trash2 size={13} />
                    </IconButton>
                  </div>
                )}
              </div>
              {tags.map(tag => (
                <div key={tag} role="group" aria-label={tag} onClick={() => onSelectTag(tag)} className={`group w-full flex items-center justify-between px-3 py-2 text-sm font-medium rounded-md transition-colors cursor-pointer
                  ${selectedTags.has(tag) ? 'bg-gray-100 text-gray-900' : 'text-gray-600 hover:bg-gray-50'}`}>
                  <div className="flex items-center gap-2 truncate">
                    <Checkbox aria-label={'筛选标签：'+tag} checked={selectedTags.has(tag)} onClick={e=>e.stopPropagation()} onChange={()=>onSelectTag(tag)}/>
                    {editingTag===tag?<Input ref={editInputRef} aria-label="标签名称" value={editValue} onChange={e=>setEditValue(e.target.value)} onClick={e=>e.stopPropagation()} onBlur={saveEditing} onKeyDown={e=>{e.stopPropagation();if(e.key==='Enter')saveEditing();if(e.key==='Escape')setEditingTag(null);}} className="input-sm"/>:<span className="truncate">{tag}</span>}
                  </div>
                  <div className="flex gap-0.5 opacity-0 group-hover:opacity-100 transition-opacity">
                    <IconButton onClick={(e) => { e.stopPropagation(); setEditingTag(tag); setEditValue(tag); }} className="text-gray-500 hover:text-gray-900 hover:bg-gray-100 rounded-md transition-colors cursor-pointer" aria-label="编辑">
                      <Edit2 size={12} />
                    </IconButton>
                    <IconButton onClick={(e) => { e.stopPropagation(); onDeleteTag(tag); }} className="text-gray-500 hover:text-gray-900 hover:bg-gray-100 rounded-md transition-colors cursor-pointer" aria-label="删除">
                      <Trash2 size={12} />
                    </IconButton>
                  </div>
                </div>
              ))}
            </div>
            <section aria-label="客户分类筛选"><div className="flex items-center gap-2 px-3 mb-2"><Checkbox aria-label="全选客户分类" checked={selectedCategories.size===categories.length+1} indeterminate={selectedCategories.size>0&&selectedCategories.size<categories.length+1} onChange={e=>onToggleAllCategories(e.target.checked?[...categories.map(c=>c.id),UNCATEGORIZED]:[])}/><h2 className="text-xs font-semibold text-gray-500">客户分类筛选</h2></div><div className="space-y-1">{[...categories,{id:UNCATEGORIZED,name:"未分类"}].map(category=><label key={category.id} className="flex items-center gap-2 px-3 py-2 text-sm rounded-md hover:bg-gray-50 cursor-pointer"><Checkbox aria-label={"筛选分类："+category.name} checked={selectedCategories.has(category.id)} onChange={()=>onSelectCategory(category.id)}/><span>{category.name}</span></label>)}</div></section>
            </div>
          )}
        </div>
      </div>;
  return isDesktop?<aside className={`shrink-0 border-r border-gray-100 h-full ${compact?'w-16':'w-64'}`}>{content}</aside>:isMobileOpen?<WorkspaceDialog title="工作区导航" presentation="drawer" hideHeader closeOnBackdrop onClose={()=>onCloseMobile?.()} bodyClassName="min-h-0 h-full overflow-hidden">{content}</WorkspaceDialog>:null;

};

export default Sidebar;
