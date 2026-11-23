import ClientPicker from './ui/ClientPicker';
import Button, {IconButton} from './ui/Button';
import Input, {SearchInput} from './ui/Input';
import type {FollowUpSave} from '../types';
import React, { useState, useMemo, useEffect, useRef } from 'react';
import {WorkspaceDialogFooter} from './WorkspaceDialog';
import { Calendar, Search, Check, UserPlus, Plus, User, ChevronUp, ChevronDown, X, Trash2, CheckSquare, Square } from 'lucide-react';
import { Contact, ProgressRecord } from '../types';

interface QuickFollowUpFormProps {
  contacts: Contact[];
  onSave: FollowUpSave;
  initialContactId?: string;
  initialRecord?: ProgressRecord;
  onCancel?: () => void;
  onSaved?: () => void;
  onSavingChange?: (saving:boolean)=>void;
  className?: string;
  variant?: 'default' | 'compact';
}

export const QuickFollowUpForm: React.FC<QuickFollowUpFormProps> = ({
  contacts, onSave, initialContactId, initialRecord, onCancel, onSaved, onSavingChange, className = '', variant = 'default'
}) => {
  const [saving,setSaving]=useState(false),[saveError,setSaveError]=useState('');
  const savingRef=useRef(false),requestIds=useRef(new Map<string,string>()),newCustomerId=useRef(crypto.randomUUID());
  const [selectedContactId, setSelectedContactId] = useState<string>(initialContactId || '');
  const [date, setDate] = useState(initialRecord?.date || new Date().toISOString().split('T')[0]);

  const [todoItems, setTodoItems] = useState<{ id: string, text: string, completed: boolean }[]>(
    initialRecord
      ? [{ id: initialRecord.id, text: initialRecord.content, completed: !!initialRecord.completed }]
      : [{ id: '1', text: '', completed: false }]
  );

  const [pickerRequest,setPickerRequest]=useState(0);
  const [isCreatingNew, setIsCreatingNew] = useState(false);
  const [newContactName, setNewContactName] = useState('');
  const [isExpanded, setIsExpanded] = useState(!!initialRecord);

  const containerRef = useRef<HTMLFieldSetElement>(null);
  const selectedContact = contacts.find(c => c.id === selectedContactId);

  useEffect(() => {
    if (initialContactId) setSelectedContactId(initialContactId);
    if (initialRecord) {
        setDate(initialRecord.date);
        setTodoItems([{ id: initialRecord.id, text: initialRecord.content, completed: !!initialRecord.completed }]);
        setIsExpanded(true);
    }
  }, [initialContactId, initialRecord]);

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (variant === 'compact' && containerRef.current && !containerRef.current.contains(event.target as Node)) {
        if (!initialRecord && todoItems.every(t => !t.text.trim()) && !selectedContactId) { setIsExpanded(false); }
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, [variant, todoItems, selectedContactId, initialRecord]);

  const handleAddTodo = () => {
    if (initialRecord) return;
    setTodoItems(prev => [...prev, { id: Math.random().toString(36).substr(2, 9), text: '', completed: false }]);
  };

  const handleUpdateTodo = (id: string, text: string) => {
    setTodoItems(prev => prev.map(item => item.id === id ? { ...item, text } : item));
  };

  const handleToggleTodo = (id: string) => {
    setTodoItems(prev => prev.map(item => item.id === id ? { ...item, completed: !item.completed } : item));
  };

  const handleRemoveTodo = (id: string) => {
    if (initialRecord) return;
    if (todoItems.length > 1) {
      setTodoItems(prev => prev.filter(item => item.id !== id));
    } else {
      setTodoItems([{ id: '1', text: '', completed: false }]);
    }
  };

  const handleSave = async () => {
    if(savingRef.current||!((selectedContactId||(isCreatingNew&&newContactName.trim()))&&todoItems.some(t=>t.text.trim())))return;
    savingRef.current=true;setSaving(true);onSavingChange?.(true);setSaveError('');
    try {
      let target=isCreatingNew?newCustomerId.current:selectedContactId;
      for(const todo of todoItems.filter(t=>t.text.trim())) {
        if(!requestIds.current.has(todo.id))requestIds.current.set(todo.id,crypto.randomUUID());
        target=await onSave(isCreatingNew?null:target,date,todo.text.trim(),selectedContact?.followUpStatus||'following',isCreatingNew?newContactName.trim():undefined,initialRecord?todo.id:undefined,todo.completed,requestIds.current.get(todo.id),target);
      }
      requestIds.current.clear();newCustomerId.current=crypto.randomUUID();
      if(!initialRecord){setTodoItems([{id:'1',text:'',completed:false}]);if(!initialContactId){setSelectedContactId('');setIsCreatingNew(false);setNewContactName('');if(variant==='compact')setIsExpanded(false);}}
      onSaved?.();
    } catch(e){setSaveError(e instanceof Error?e.message:String(e));}
    finally{savingRef.current=false;setSaving(false);onSavingChange?.(false);}
  };
  const feedback=saveError?<p role="alert" className="text-sm text-danger-600">{saveError}</p>:saving?<p role="status" className="text-sm text-gray-500">正在保存到数据库…</p>:null;

  const renderTodoItems = () => (
    <div className="space-y-1.5 max-h-[220px] overflow-y-auto custom-scrollbar pr-1">
      {todoItems.map((item, idx) => (
        <div key={item.id} className="flex items-center gap-3 group/todo">
          <IconButton
            type="button"
            onClick={() => handleToggleTodo(item.id)}
            className="shrink-0" aria-label={item.completed?'标记未完成':'标记已完成'} aria-pressed={item.completed}
          >
            {item.completed ? <CheckSquare size={18} strokeWidth={2.5} /> : <Square size={18} strokeWidth={2.5} />}
          </IconButton>
          <Input
            type="text"
            value={item.text}
            onChange={(e) => handleUpdateTodo(item.id, e.target.value)}
            onKeyDown={(e) => {
              if (e.key === 'Enter') {
                e.preventDefault();
                handleAddTodo();
              } else if (e.key === 'Backspace' && !item.text && todoItems.length > 1 && !initialRecord) {
                e.preventDefault();
                handleRemoveTodo(item.id);
              }
            }}
            placeholder="填写跟进内容…"
            className={`flex-1 ${item.completed?'line-through text-gray-400':''}`}
            autoFocus={idx === todoItems.length - 1 && isExpanded}
          />
          {!initialRecord && (
            <IconButton
              type="button"
              onClick={() => handleRemoveTodo(item.id)}
              className="opacity-0 group-hover/todo:opacity-100 text-gray-300 hover:text-gray-600 transition-colors" aria-label="删除"
            >
              <Trash2 size={16} />
            </IconButton>
          )}
        </div>
      ))}
      {!initialRecord && (
        <Button
          type="button"
          onClick={handleAddTodo}
          className="flex items-center gap-2 text-xs font-medium text-gray-500 hover:text-gray-900 mt-2 pl-7 transition-colors" variant="plain"
        >
          <Plus size={12} strokeWidth={3} />
          <span>添加新记录项</span>
        </Button>
      )}
    </div>
  );

  if (variant === 'compact') {
      return (
          <fieldset disabled={saving} ref={containerRef} className={`min-w-0 bg-white border shadow-md rounded-lg transition-colors duration-300 w-full overflow-visible ${isExpanded ? 'p-3 md:p-3.5 border-gray-300' : 'p-2 border-gray-200'}`}>
            {feedback}
              <div className="flex flex-col gap-2.5 md:gap-3">
                  <div className={`flex items-center gap-1.5 md:gap-2 ${!isExpanded && !selectedContactId ? 'hidden' : 'flex animate-in fade-in slide-in-from-bottom-2 duration-300'}`}>
                       <ClientPicker contacts={contacts} value={selectedContactId} disabled={Boolean(initialRecord)} className="min-w-0 flex-1" newName={isCreatingNew?newContactName:''} openRequest={pickerRequest} onChange={id=>{setSelectedContactId(id);setIsCreatingNew(false);}} onCreate={name=>{setIsCreatingNew(true);setNewContactName(name);setSelectedContactId('');}}/>
                        <div className="w-40 shrink-0">
                            <Input
                              type="date"
                              value={date}
                              onChange={e => setDate(e.target.value)}
                              aria-label="跟进日期"
                            />
                        </div>
                  </div>
                  <div className="relative flex flex-col gap-2.5">
                       {isExpanded ? (
                           <div className="bg-gray-50 rounded-md p-3 border border-gray-100">
                             {renderTodoItems()}
                          </div>
                       ) : (
                          <div className="flex items-center gap-2">
                            {!selectedContactId && <IconButton onClick={() => { setIsExpanded(true); setPickerRequest(n=>n+1); }} className="text-gray-400 hover:text-gray-900 hover:bg-gray-100 rounded-md transition-colors border border-gray-200 bg-white" aria-label="选择关联客户"><UserPlus size={18} /></IconButton>}
                            <Button variant="plain"
                              onClick={() => setIsExpanded(true)}
                              className="flex-1 p-2.5 text-sm text-gray-400 cursor-text min-h-[44px] flex items-center font-medium bg-gray-50 rounded-md border border-gray-200 hover:bg-white hover:border-gray-300 transition-colors"
                            >
                              输入今日跟进事项…
                            </Button>
                            <Button
                              onClick={handleSave}
                              disabled={saving || (!selectedContactId && !isCreatingNew) || !todoItems.some(t => t.text.trim())}
                              className="shrink-0" variant="primary"
                            >
                              {saving?'正在保存…':'立即录入'}
                            </Button>
                          </div>
                       )}
                       <div className={`flex justify-end items-center gap-3 mt-1 px-1 ${!isExpanded ? 'hidden' : ''}`}>
                           {isExpanded && !initialRecord && (
                             <Button onClick={() => setIsExpanded(false)} className="text-xs font-medium text-gray-400 hover:text-gray-900" variant="plain">收起</Button>
                           )}
                           <Button
                             onClick={handleSave}
                             disabled={saving || (!selectedContactId && !isCreatingNew) || !todoItems.some(t => t.text.trim())}
                             className="shrink-0" variant="primary"
                           >
                            {saving?'正在保存…':initialRecord?'保存修改':'立即录入'}
                          </Button>
                       </div>
                  </div>
              </div>
          </fieldset>
      );
  }

  return (
    <fieldset disabled={saving} className={`min-w-0 space-y-4 ${className}`}>
      {feedback}
           <div className="space-y-2 relative">
              <label className="text-xs font-medium text-gray-700 block ml-1">关联客户</label>
              {isCreatingNew ? (
                  <div className="flex items-center gap-3 animate-in fade-in slide-in-from-left-2 duration-300">
                      <div className="relative flex-1"><Input aria-label="客户姓名" leadingIcon={UserPlus} type="text" value={newContactName} onChange={(e) => setNewContactName(e.target.value)} className="w-full" placeholder="客户姓名" autoFocus /></div>
                      <Button onClick={() => setIsCreatingNew(false)} className="text-xs font-medium text-gray-400 hover:text-gray-900 underline" variant="plain">返回搜索</Button>
                  </div>
              ) : selectedContactId ? (
                  <div className="flex items-center justify-between p-3 bg-gray-50 border border-gray-100 rounded-md"><div className="flex items-center gap-3"><div className="w-9 h-9 rounded-md bg-gray-100 flex items-center justify-center text-sm font-medium text-gray-700 border border-gray-200">{selectedContact?.remarkName?.[0] || selectedContact?.nickname?.[0] || '?'}</div><div><div className="font-medium text-gray-900 text-sm">{selectedContact?.remarkName || selectedContact?.nickname}</div></div></div>{!initialRecord && <Button onClick={() => setSelectedContactId('')} className="text-xs text-gray-600 font-medium px-3 py-1.5 hover:bg-gray-100 border border-gray-200 rounded-md transition-colors" variant="plain">更换</Button>}</div>
               ) : (
                   <ClientPicker contacts={contacts} value={selectedContactId} disabled={Boolean(initialRecord)} className="min-w-0" onChange={id=>{setSelectedContactId(id);setIsCreatingNew(false);}} onCreate={name=>{setIsCreatingNew(true);setNewContactName(name);setSelectedContactId('');}}/>
               )}
           </div>
            <div className="space-y-2">
               <label className="text-xs font-medium text-gray-700 block ml-1">沟通日期</label>
               <div className="relative group"><Input aria-label="沟通日期" type="date" value={date} onChange={(e) => setDate(e.target.value)} className="w-full" /></div>
            </div>
            <div className="space-y-2">
               <label className="text-xs font-medium text-gray-700 block ml-1">{initialRecord ? '更新记录详情' : '跟进事项清单'}</label>
               <div className="bg-gray-50 rounded-md p-3 border border-gray-100">
                 {renderTodoItems()}
               </div>
            </div>
            <WorkspaceDialogFooter>
                {onCancel && <Button disabled={saving} onClick={onCancel} className="" variant="secondary">取消</Button>}
                <Button onClick={handleSave} disabled={saving || (!selectedContactId && !newContactName) || !todoItems.some(t => t.text.trim())} className="" variant="primary" validate>
                  <Check size={18} strokeWidth={3} /><span>{saving?'正在保存…':initialRecord?'保存修改':'保存记录'}</span>
                </Button>
            </WorkspaceDialogFooter>
    </fieldset>
  );
};
