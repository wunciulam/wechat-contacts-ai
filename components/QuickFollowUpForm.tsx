import React, { useState, useMemo, useEffect, useRef } from 'react';
import { Calendar, Search, Check, UserPlus, Plus, User, ChevronUp, ChevronDown, X, Trash2, CheckSquare, Square } from 'lucide-react';
import { Contact, ProgressRecord } from '../types';

interface QuickFollowUpFormProps {
  contacts: Contact[];
  onSave: (contactId: string | null, date: string, content: string, status: 'following' | 'contacted', newContactName?: string, existingRecordId?: string, completed?: boolean) => void;
  initialContactId?: string;
  initialRecord?: ProgressRecord;
  onCancel?: () => void;
  className?: string;
  variant?: 'default' | 'compact';
}

export const QuickFollowUpForm: React.FC<QuickFollowUpFormProps> = ({ 
  contacts, onSave, initialContactId, initialRecord, onCancel, className = '', variant = 'default'
}) => {
  const [selectedContactId, setSelectedContactId] = useState<string>(initialContactId || '');
  const [date, setDate] = useState(initialRecord?.date || new Date().toISOString().split('T')[0]);
  
  const [todoItems, setTodoItems] = useState<{ id: string, text: string, completed: boolean }[]>(
    initialRecord 
      ? [{ id: initialRecord.id, text: initialRecord.content, completed: !!initialRecord.completed }]
      : [{ id: '1', text: '', completed: false }]
  );
  
  const [searchTerm, setSearchTerm] = useState('');
  const [isDropdownOpen, setIsDropdownOpen] = useState(false);
  const [isCreatingNew, setIsCreatingNew] = useState(false);
  const [newContactName, setNewContactName] = useState('');
  const [isExpanded, setIsExpanded] = useState(!!initialRecord);
  
  const containerRef = useRef<HTMLDivElement>(null);
  const dropdownRef = useRef<HTMLDivElement>(null);
  const triggerRef = useRef<HTMLButtonElement>(null);

  const filteredContacts = useMemo(() => {
    if (!searchTerm) return contacts.slice(0, 50); 
    return contacts.filter(c => 
      (c.remarkName && c.remarkName.toLowerCase().includes(searchTerm.toLowerCase())) ||
      (c.nickname && c.nickname.toLowerCase().includes(searchTerm.toLowerCase()))
    );
  }, [contacts, searchTerm]);

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
      if (isDropdownOpen && dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        if (!triggerRef.current?.contains(event.target as Node)) setIsDropdownOpen(false);
      }
      if (variant === 'compact' && containerRef.current && !containerRef.current.contains(event.target as Node)) {
        if (!initialRecord && todoItems.every(t => !t.text.trim()) && !selectedContactId) { setIsExpanded(false); setIsDropdownOpen(false); }
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, [variant, todoItems, selectedContactId, isDropdownOpen, initialRecord]);

  const handleAddTodo = () => {
    if (initialRecord) return; 
    setTodoItems(prev => [...prev, { id: Date.now().toString(), text: '', completed: false }]);
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

  const handleSave = () => {
    if ((selectedContactId || (isCreatingNew && newContactName.trim())) && todoItems.some(t => t.text.trim())) {
      todoItems.filter(t => t.text.trim()).forEach(todo => {
        onSave(
          isCreatingNew ? null : selectedContactId, 
          date, 
          todo.text.trim(), 
          selectedContact?.followUpStatus || 'following',
          isCreatingNew ? newContactName.trim() : undefined,
          initialRecord ? todo.id : undefined,
          todo.completed
        );
      });
      
      if (!initialRecord) {
        setTodoItems([{ id: '1', text: '', completed: false }]);
        if (!initialContactId) {
            setSelectedContactId('');
            setSearchTerm('');
            setIsCreatingNew(false);
            setNewContactName('');
            if (variant === 'compact') setIsExpanded(false);
        }
      }
    }
  };

  const renderTodoItems = () => (
    <div className="space-y-1.5 max-h-[220px] overflow-y-auto custom-scrollbar pr-1">
      {todoItems.map((item, idx) => (
        <div key={item.id} className="flex items-center gap-3 group/todo">
          <button 
            type="button"
            onClick={() => handleToggleTodo(item.id)}
            className={`shrink-0 transition-colors ${item.completed ? 'text-emerald-600' : 'text-slate-400 hover:text-slate-600'}`}
          >
            {item.completed ? <CheckSquare size={18} strokeWidth={2.5} /> : <Square size={18} strokeWidth={2.5} />}
          </button>
          <input 
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
            placeholder="填写跟进内容..."
            className={`flex-1 bg-transparent border-0 focus:ring-0 p-1 text-sm font-bold text-slate-800 placeholder:text-slate-400 ${item.completed ? 'text-slate-400 line-through font-normal' : ''}`}
            autoFocus={idx === todoItems.length - 1 && isExpanded}
          />
          {!initialRecord && (
            <button 
              type="button"
              onClick={() => handleRemoveTodo(item.id)}
              className="opacity-0 group-hover/todo:opacity-100 p-1.5 text-slate-300 hover:text-rose-600 transition-all"
            >
              <Trash2 size={16} />
            </button>
          )}
        </div>
      ))}
      {!initialRecord && (
        <button 
          type="button"
          onClick={handleAddTodo}
          className="flex items-center gap-2 text-[10px] font-bold text-emerald-600 hover:text-emerald-700 mt-2 pl-7 transition-colors"
        >
          <Plus size={12} strokeWidth={3} />
          <span>添加新记录项</span>
        </button>
      )}
    </div>
  );

  if (variant === 'compact') {
      return (
          <div ref={containerRef} className={`bg-white/95 backdrop-blur-xl border shadow-2xl rounded-2xl transition-all duration-300 w-full overflow-visible ${isExpanded ? 'p-3 md:p-3.5 border-emerald-500/20' : 'p-2 border-slate-200'}`}>
              <div className="flex flex-col gap-2.5 md:gap-3">
                  <div className={`flex items-center gap-1.5 md:gap-2 ${!isExpanded && !selectedContactId ? 'hidden' : 'flex animate-in fade-in slide-in-from-bottom-2 duration-300'}`}>
                       <div className="relative">
                           <button 
                             ref={triggerRef}
                             onClick={() => !initialRecord && setIsDropdownOpen(!isDropdownOpen)}
                             className={`flex items-center gap-1.5 md:gap-2 px-2 md:px-3 py-1.5 rounded-xl text-[10px] md:text-[11px] font-bold transition-all border ${selectedContactId ? 'bg-emerald-50 text-emerald-700 border-emerald-100' : 'bg-slate-50 text-slate-500 border-slate-200 hover:bg-slate-100'}`}
                             disabled={!!initialRecord}
                           >
                               <User size={12} className="shrink-0 md:w-[14px] md:h-[14px]" />
                               <span className="max-w-[80px] md:max-w-[120px] truncate">{isCreatingNew ? `新客户: ${newContactName}` : (selectedContact?.remarkName || selectedContact?.nickname || '关联客户...') }</span>
                               {!initialRecord && (isDropdownOpen ? <ChevronUp size={12} className="md:w-[14px] md:h-[14px]" /> : <ChevronDown size={12} className="md:w-[14px] md:h-[14px]" />)}
                           </button>
                           {isDropdownOpen && (
                               <div ref={dropdownRef} className="absolute top-full left-0 mt-2 w-72 bg-white rounded-2xl shadow-2xl border border-slate-200 overflow-hidden z-[100] flex flex-col max-h-[300px] animate-in slide-in-from-top-2">
                                   <div className="p-2.5 border-b border-slate-100 bg-slate-50/50">
                                       <div className="relative">
                                           <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={14} />
                                           <input type="text" className="w-full pl-9 pr-3 py-1.5 text-xs bg-white border border-slate-200 rounded-lg outline-none focus:border-emerald-500 transition-all font-bold" placeholder="搜索客户..." value={searchTerm} onChange={e => setSearchTerm(e.target.value)} autoFocus />
                                       </div>
                                   </div>
                                   <div className="overflow-y-auto custom-scrollbar flex-1 p-1.5">
                                       {filteredContacts.length === 0 ? <div onClick={() => { setIsCreatingNew(true); setNewContactName(searchTerm); setIsDropdownOpen(false); setSelectedContactId(''); }} className="p-3 text-center text-xs font-bold text-emerald-600 cursor-pointer hover:bg-emerald-50 rounded-lg border border-dashed border-emerald-100">无此客户，点此创建: "{searchTerm}"</div> : filteredContacts.map(c => <div key={c.id} onClick={() => { setSelectedContactId(c.id); setIsCreatingNew(false); setIsDropdownOpen(false); }} className="flex items-center gap-3 p-2 hover:bg-slate-50 cursor-pointer rounded-xl transition-colors"><div className="w-7 h-7 rounded-lg bg-slate-100 flex items-center justify-center text-[10px] font-bold text-slate-500 border border-slate-200">{c.remarkName?.[0] || c.nickname?.[0]}</div><div className="text-sm font-bold text-slate-700 truncate">{c.remarkName || c.nickname}</div>{c.id === selectedContactId && <Check size={14} className="text-emerald-500 ml-auto" strokeWidth={3} />}</div>)}
                                   </div>
                               </div>
                           )}
                       </div>
                       <div className="relative">
                           <button className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-[11px] font-bold bg-slate-50 text-slate-600 border border-slate-200 hover:bg-slate-100 transition-all shadow-sm">
                             <Calendar size={14} /><span>{date}</span>
                           </button>
                           <input 
                             type="date" 
                             value={date} 
                             onChange={e => setDate(e.target.value)} 
                             className="absolute inset-0 opacity-0 cursor-pointer z-10" 
                           />
                       </div>
                  </div>
                  <div className="relative flex flex-col gap-2.5">
                       {isExpanded ? (
                          <div className="bg-slate-50/50 rounded-xl p-3 border border-slate-100 shadow-inner">
                             {renderTodoItems()}
                          </div>
                       ) : (
                          <div className="flex items-center gap-2">
                            {!selectedContactId && <button onClick={() => { setIsExpanded(true); setIsDropdownOpen(true); }} className="p-2.5 text-slate-400 hover:text-emerald-600 hover:bg-emerald-50 rounded-xl transition-all border border-slate-200 bg-white"><UserPlus size={18} /></button>}
                            <div 
                              onClick={() => setIsExpanded(true)} 
                              className="flex-1 p-2.5 text-sm text-slate-400 cursor-text min-h-[44px] flex items-center font-bold bg-slate-50 rounded-xl border border-slate-200/50 hover:bg-white hover:border-emerald-300 transition-all"
                            >
                              输入今日跟进事项...
                            </div>
                            <button 
                              onClick={handleSave} 
                              disabled={(!selectedContactId && !isCreatingNew) || !todoItems.some(t => t.text.trim())} 
                              className={`shrink-0 px-4 md:px-8 py-2 md:py-2.5 rounded-xl text-xs md:text-sm font-bold shadow-lg transition-all active:scale-95 ${(!selectedContactId && !isCreatingNew) || !todoItems.some(t => t.text.trim()) ? 'bg-slate-200 text-slate-400 shadow-none' : 'bg-gradient-to-r from-emerald-500 to-teal-500 hover:from-emerald-400 hover:to-teal-400 text-white shadow-emerald-200/50'}`}
                            >
                              立即录入
                            </button>
                          </div>
                       )}
                       <div className={`flex justify-end items-center gap-3 mt-1 px-1 ${!isExpanded ? 'hidden' : ''}`}>
                          {isExpanded && !initialRecord && (
                            <button onClick={() => setIsExpanded(false)} className="text-[11px] font-bold text-slate-400 hover:text-slate-600">收起</button>
                          )}
                          <button 
                            onClick={handleSave} 
                            disabled={(!selectedContactId && !isCreatingNew) || !todoItems.some(t => t.text.trim())} 
                            className={`shrink-0 px-6 md:px-10 py-2 md:py-2.5 rounded-xl text-xs md:text-sm font-bold shadow-lg transition-all active:scale-95 ${(!selectedContactId && !isCreatingNew) || !todoItems.some(t => t.text.trim()) ? 'bg-slate-200 text-slate-400 shadow-none' : 'bg-gradient-to-r from-emerald-500 to-teal-500 hover:from-emerald-400 hover:to-teal-400 text-white shadow-emerald-200/50'}`}
                          >
                            {initialRecord ? '保存修改' : '立即录入'}
                          </button>
                       </div>
                  </div>
              </div>
          </div>
      );
  }

  return (
    <div className={`space-y-6 ${className}`}>
           <div className="space-y-2 relative">
              <label className="text-xs font-bold text-slate-400 uppercase tracking-widest block ml-1">关联客户对象</label>
              {isCreatingNew ? (
                  <div className="flex items-center gap-3 animate-in fade-in slide-in-from-left-2 duration-300">
                      <div className="relative flex-1"><UserPlus className="absolute left-3.5 top-1/2 -translate-y-1/2 text-emerald-600" size={18} strokeWidth={2.5} /><input type="text" value={newContactName} onChange={(e) => setNewContactName(e.target.value)} className="w-full pl-10 pr-4 py-3.5 rounded-2xl border-2 border-emerald-100 bg-emerald-50/10 text-slate-900 focus:bg-white focus:border-emerald-500 outline-none font-bold shadow-sm" placeholder="客户姓名" autoFocus /></div>
                      <button onClick={() => setIsCreatingNew(false)} className="text-xs font-bold text-slate-400 hover:text-slate-600 underline">返回搜索</button>
                  </div>
              ) : selectedContactId ? (
                  <div className="flex items-center justify-between p-4 bg-emerald-50/20 border border-emerald-100 rounded-2xl shadow-sm"><div className="flex items-center gap-4"><div className="w-10 h-10 rounded-xl bg-white flex items-center justify-center text-sm font-bold text-emerald-700 shadow-inner border border-emerald-100">{selectedContact?.remarkName?.[0] || selectedContact?.nickname?.[0] || '?'}</div><div><div className="font-bold text-slate-800">{selectedContact?.remarkName || selectedContact?.nickname}</div></div></div>{!initialRecord && <button onClick={() => setSelectedContactId('')} className="text-xs text-emerald-600 font-bold px-3 py-1.5 hover:bg-emerald-50 border border-emerald-100 rounded-xl shadow-sm transition-all">更换</button>}</div>
              ) : (
                  <div className="relative group"><Search className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400 group-focus-within:text-emerald-500 transition-colors" size={18} /><input type="text" placeholder="搜索或输入直接创建..." value={searchTerm} onChange={(e) => { setSearchTerm(e.target.value); setIsDropdownOpen(true); }} onFocus={() => setIsDropdownOpen(true)} className="w-full pl-11 pr-4 py-3.5 rounded-2xl bg-slate-50 border border-slate-200 focus:bg-white focus:ring-4 focus:ring-emerald-500/5 focus:border-emerald-500 outline-none transition-all shadow-sm font-bold text-slate-900" />{isDropdownOpen && <div className="absolute left-0 right-0 top-full bg-white rounded-2xl shadow-2xl border border-slate-200 max-h-60 overflow-y-auto z-[60] mt-3 p-2 space-y-1 animate-in fade-in slide-in-from-top-2">{filteredContacts.length === 0 ? <div onClick={() => { setIsCreatingNew(true); setNewContactName(searchTerm); setIsDropdownOpen(false); setSelectedContactId(''); }} className="p-4 text-center cursor-pointer hover:bg-emerald-50 text-emerald-600 font-bold flex items-center justify-center gap-2 rounded-xl transition-colors border border-dashed border-emerald-200"><UserPlus size={18} /> 创建并关联: "{searchTerm}"</div> : <>{filteredContacts.map(c => <div key={c.id} onClick={() => { setSelectedContactId(c.id); setIsDropdownOpen(false); }} className="p-3 hover:bg-slate-50 cursor-pointer flex items-center gap-3 rounded-xl transition-all"><div className="w-9 h-9 rounded-xl bg-slate-100 flex items-center justify-center text-xs font-bold text-slate-600 shadow-inner border border-slate-200">{c.remarkName?.[0] || c.nickname?.[0]}</div><div className="font-bold text-slate-800">{c.remarkName || c.nickname}</div></div>)}{searchTerm && <div onClick={() => { setIsCreatingNew(true); setNewContactName(searchTerm); setIsDropdownOpen(false); setSelectedContactId(''); }} className="p-4 bg-emerald-50/30 hover:bg-emerald-50 cursor-pointer border-t border-emerald-100 text-emerald-700 text-sm font-bold flex items-center justify-center gap-2 sticky bottom-0 rounded-b-xl"><Plus size={16} /> 创建新客户 "{searchTerm}"</div>}</>}</div>}</div>
              )}
           </div>
           <div className="space-y-2">
              <label className="text-xs font-bold text-slate-500 uppercase tracking-widest block ml-1">沟通日期</label>
              <div className="relative group"><Calendar className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400 group-focus-within:text-emerald-500" size={18} /><input type="date" value={date} onChange={(e) => setDate(e.target.value)} className="w-full pl-11 pr-4 py-3.5 rounded-2xl bg-slate-50 border border-slate-200 focus:bg-white focus:ring-4 focus:ring-emerald-500/5 focus:border-emerald-500 outline-none transition-all shadow-sm font-bold text-slate-900" /></div>
           </div>
           <div className="space-y-2">
              <label className="text-xs font-bold text-slate-500 uppercase tracking-widest block ml-1">{initialRecord ? '更新记录详情' : '跟进事项清单'}</label>
              <div className="bg-slate-50 rounded-2xl p-4 border border-slate-200 shadow-inner">
                {renderTodoItems()}
              </div>
           </div>
           <div className="flex justify-end gap-4 pt-6 border-t border-slate-100">
               {onCancel && <button onClick={onCancel} className="px-6 py-2.5 text-sm font-bold text-slate-400 hover:text-slate-800 hover:bg-slate-100 rounded-xl transition-all">取消</button>}
               <button onClick={handleSave} disabled={(!selectedContactId && !newContactName) || !todoItems.some(t => t.text.trim())} className="px-14 py-3.5 bg-gradient-to-r from-emerald-500 to-teal-500 hover:from-emerald-400 hover:to-teal-400 text-white rounded-2xl font-bold shadow-xl shadow-emerald-200 transition-all active:scale-95 flex items-center gap-3 disabled:opacity-50 disabled:shadow-none">
                 <Check size={20} strokeWidth={3} /><span>{initialRecord ? '保存修改' : '保存记录'}</span>
               </button>
           </div>
    </div>
  );
};