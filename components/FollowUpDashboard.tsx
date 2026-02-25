import React, { useState, useMemo, useRef, useEffect } from 'react';
import { Contact, ProgressRecord } from '../types';
import { Plus, Calendar, Clock, CheckCircle2, CircleDashed, Edit2, Trash2, ArrowRight, Archive, RotateCcw, CheckSquare, Square, ChevronDown, ChevronUp } from 'lucide-react';
import { QuickFollowUpForm } from './QuickFollowUpForm';

interface FollowUpDashboardProps {
  contacts: Contact[];
  filterTags: Set<string>;
  onAddProgress: (contactId?: string) => void;
  onEditContact: (contact: Contact) => void;
  onDeleteProgress: (contactId: string, progressId: string) => void;
  onToggleProgress: (contactId: string, progressId: string) => void;
  onUpdateStatus: (contactId: string, newStatus: 'following' | 'contacted') => void;
  onSaveQuickFollowUp: (contactId: string | null, date: string, content: string, status: 'following' | 'contacted', newContactName?: string, existingRecordId?: string, completed?: boolean) => void;
  onEditProgressRecord?: (contactId: string, record: ProgressRecord) => void;
}

const FollowUpDashboard: React.FC<FollowUpDashboardProps> = ({ 
  contacts, filterTags, onAddProgress, onEditContact, onDeleteProgress, onToggleProgress, onUpdateStatus, onSaveQuickFollowUp, onEditProgressRecord
}) => {
  const [activeTab, setActiveTab] = useState<'following' | 'contacted'>('following');
  const [expandedHistoryIds, setExpandedHistoryIds] = useState<Set<string>>(new Set());
  const dashboardRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (dashboardRef.current && e.target instanceof Node && dashboardRef.current === e.target) {
        setExpandedHistoryIds(new Set());
      }
    };
    window.addEventListener('mousedown', handleClickOutside);
    return () => window.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const toggleHistory = (contactId: string) => {
    setExpandedHistoryIds(prev => {
      const newSet = new Set(prev);
      if (newSet.has(contactId)) newSet.delete(contactId);
      else newSet.add(contactId);
      return newSet;
    });
  };

  const counts = useMemo(() => {
    const following = contacts.filter(c => (c.followUpStatus || 'following') === 'following' && ((c.progressHistory && c.progressHistory.length > 0) || !!c.progress)).length;
    const contacted = contacts.filter(c => (c.followUpStatus || 'following') === 'contacted' && ((c.progressHistory && c.progressHistory.length > 0) || !!c.progress)).length;
    return { following, contacted };
  }, [contacts]);

  const visibleContacts = useMemo(() => {
    return contacts.filter(c => {
      const matchesStatus = (c.followUpStatus || 'following') === activeTab;
      const hasProgress = (c.progressHistory && c.progressHistory.length > 0) || !!c.progress;
      const matchesTag = filterTags.size === 0 || c.tags.some(tag => filterTags.has(tag));
      return matchesStatus && hasProgress && matchesTag;
    }).sort((a, b) => {
      const timeA = a.lastDate ? new Date(a.lastDate).getTime() : 0;
      const timeB = b.lastDate ? new Date(b.lastDate).getTime() : 0;
      return (isNaN(timeB) ? 0 : timeB) - (isNaN(timeA) ? 0 : timeA);
    });
  }, [contacts, activeTab, filterTags]);

  const handleDeleteAllRecords = (e: React.MouseEvent, contactId: string) => {
    e.stopPropagation();
    if (confirm('确定要清空该联系人的所有跟进记录吗？')) {
      const contact = contacts.find(c => c.id === contactId);
      contact?.progressHistory?.forEach(p => onDeleteProgress(contactId, p.id));
    }
  };

  const groupRecordsByDate = (records: ProgressRecord[]) => {
    const groups: { [date: string]: ProgressRecord[] } = {};
    records.forEach(r => {
      if (!r.date) return;
      if (!groups[r.date]) groups[r.date] = [];
      groups[r.date].push(r);
    });
    return Object.entries(groups).sort((a, b) => new Date(b[0]).getTime() - new Date(a[0]).getTime());
  };

  return (
    <div ref={dashboardRef} className="flex-1 h-full w-full overflow-hidden flex flex-col bg-gray-50 relative">
      <div className="sticky top-0 z-20 shrink-0 bg-white border-b border-gray-100 shadow-sm">
        <div className="px-5 py-4 flex flex-col gap-3">
          <div className="flex items-center justify-between">
            <div>
              <h2 className="text-lg font-semibold text-gray-900">跟进工作台</h2>
              <p className="text-xs text-gray-400 mt-0.5">Follow-up CRM</p>
            </div>
            <button 
              onClick={() => onAddProgress()}
              className="btn btn-primary text-sm"
            >
              <Plus size={16} /><span>写跟进</span>
            </button>
          </div>
          <div className="flex p-0.5 bg-gray-100 rounded-lg w-fit border border-gray-200">
            <button onClick={() => setActiveTab('following')} className={`px-4 py-1.5 rounded-md text-sm font-medium flex items-center gap-2 transition-all ${activeTab === 'following' ? 'bg-white text-primary-600 shadow-sm' : 'text-gray-500 hover:text-gray-700'}`}>
              <CircleDashed size={14} />跟进中 <span className="opacity-50 text-xs">{counts.following}</span>
            </button>
            <button onClick={() => setActiveTab('contacted')} className={`px-4 py-1.5 rounded-md text-sm font-medium flex items-center gap-2 transition-all ${activeTab === 'contacted' ? 'bg-white text-primary-600 shadow-sm' : 'text-gray-500 hover:text-gray-700'}`}>
              <CheckCircle2 size={14} />已沟通 <span className="opacity-50 text-xs">{counts.contacted}</span>
            </button>
          </div>
        </div>
      </div>

      <div className="flex-1 overflow-y-auto p-4 md:p-6 pb-64 custom-scrollbar">
        {visibleContacts.length === 0 ? (
          <div className="flex flex-col items-center justify-center min-h-[400px] text-slate-300">
            <div className="w-16 h-16 bg-white rounded-2xl flex items-center justify-center mb-4 shadow-sm border border-slate-100"><Calendar size={32} className="text-slate-200" /></div>
            <p className="text-base font-bold text-slate-400">暂无待跟进记录</p>
          </div>
        ) : (
          <div className="max-w-4xl mx-auto space-y-4">
            {visibleContacts.map(contact => {
              const dateGroups = groupRecordsByDate(contact.progressHistory || []);
              const latestDateGroup = dateGroups.length > 0 ? dateGroups[0] : null;
              const olderDateGroups = dateGroups.length > 1 ? dateGroups.slice(1) : [];
              const isExpanded = expandedHistoryIds.has(contact.id);
              const initials = contact.remarkName?.[0] || contact.nickname?.[0] || '?';

              return (
                <div key={contact.id} className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden hover:shadow-md transition-all group/card">
                  <div className="p-3 md:p-4 border-b border-slate-50 flex items-center justify-between bg-slate-50/20 cursor-pointer hover:bg-slate-50" onClick={() => onEditContact(contact)}>
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 rounded-xl bg-slate-100 border border-slate-200 flex items-center justify-center text-slate-600 font-bold text-base shadow-inner">
                        {initials}
                      </div>
                      <div className="min-w-0">
                        <h3 className="font-bold text-slate-800 text-xs md:text-sm flex items-center gap-2 group-hover/card:text-emerald-600 transition-colors truncate">
                          {contact.remarkName || contact.nickname}
                          <ArrowRight size={14} className="opacity-0 group-hover/card:opacity-100 -translate-x-1 group-hover/card:translate-x-0 transition-all text-slate-400 shrink-0"/>
                        </h3>
                        <div className="text-[9px] md:text-[10px] text-emerald-600 font-bold flex items-center gap-1 mt-0.5"><Clock size={12} />{contact.lastDate || '从未'} 更新</div>
                      </div>
                    </div>
                    <div className="flex items-center gap-1 md:gap-2" onClick={e => e.stopPropagation()}>
                      <button 
                        onClick={() => onUpdateStatus(contact.id, activeTab === 'following' ? 'contacted' : 'following')} 
                        className="text-[9px] md:text-[10px] font-bold px-2 md:px-3 py-1 md:py-1.5 rounded-lg bg-white border border-slate-200 hover:border-slate-400 transition-all flex items-center gap-1 md:gap-1.5 shadow-sm active:scale-95 text-black"
                      >
                        {activeTab === 'following' ? <Archive size={12} className="text-slate-600 md:w-[14px] md:h-[14px]" strokeWidth={2.5} /> : <RotateCcw size={12} className="text-slate-600 md:w-[14px] md:h-[14px]" strokeWidth={2.5} />}
                        {activeTab === 'following' ? '归档' : '跟进'}
                      </button>
                      <button 
                        onClick={() => onAddProgress(contact.id)} 
                        className="text-[9px] md:text-[10px] font-bold text-emerald-600 bg-emerald-50 hover:bg-emerald-100 border border-emerald-100 px-2 md:px-3 py-1 md:py-1.5 rounded-lg transition-all flex items-center gap-1 shadow-sm active:scale-95"
                      >
                        <Plus size={12} className="md:w-[14px] md:h-[14px]" strokeWidth={2.5} />写记录
                      </button>
                      <button 
                        onClick={(e) => handleDeleteAllRecords(e, contact.id)}
                        className="p-1 text-slate-300 hover:text-rose-500 transition-all"
                        title="清空记录"
                      >
                        <Trash2 size={14} className="md:w-[16px] md:h-[16px]" />
                      </button>
                    </div>
                  </div>
                  <div className="p-3 md:p-4 bg-white space-y-4">
                    {latestDateGroup && (
                      <div className="space-y-3">
                         <div className="flex items-center gap-2">
                            <div className="h-px bg-slate-100 flex-1"></div>
                            <span className="text-[9px] font-bold text-slate-400 uppercase tracking-widest bg-slate-50 px-2 py-0.5 rounded border border-slate-100">{latestDateGroup[0]}</span>
                            <div className="h-px bg-slate-100 flex-1"></div>
                         </div>
                         <div className="space-y-2">
                            {latestDateGroup[1].map((record) => (
                              <div key={record.id} className="relative group/item">
                                <div className="flex justify-between items-start gap-3 pl-1">
                                  <div className="flex gap-3 flex-1 min-w-0">
                                    <button 
                                      onClick={(e) => { e.stopPropagation(); onToggleProgress(contact.id, record.id); }}
                                      className={`mt-0.5 transition-colors shrink-0 ${record.completed ? 'text-emerald-500' : 'text-slate-300 hover:text-slate-400'}`}
                                    >
                                       {record.completed ? <CheckSquare size={18} strokeWidth={2} /> : <Square size={18} strokeWidth={2} />}
                                    </button>
                                    <div className="flex flex-col min-w-0 flex-1">
                                      <p className={`text-sm leading-relaxed transition-all break-words ${record.completed ? 'text-slate-400 line-through' : 'text-slate-700 font-medium'}`}>
                                          {record.content}
                                      </p>
                                    </div>
                                  </div>
                                  <div className="flex gap-1 opacity-0 group-hover/item:opacity-100 transition-opacity shrink-0">
                                    <button 
                                      onClick={(e) => { e.stopPropagation(); onEditProgressRecord?.(contact.id, record); }} 
                                      className="p-1 text-slate-400 hover:text-blue-600 hover:bg-blue-50 rounded-lg"
                                    >
                                      <Edit2 size={14} />
                                    </button>
                                    <button 
                                      onClick={(e) => { e.stopPropagation(); onDeleteProgress(contact.id, record.id); }} 
                                      className="p-1 text-slate-400 hover:text-rose-600 hover:bg-rose-50 rounded-lg"
                                    >
                                      <Trash2 size={14} />
                                    </button>
                                  </div>
                                </div>
                              </div>
                            ))}
                         </div>
                      </div>
                    )}

                    {olderDateGroups.length > 0 && (
                      <div className="space-y-3">
                        {!isExpanded ? (
                          <button 
                            onClick={() => toggleHistory(contact.id)}
                            className="w-full py-2 flex items-center justify-center gap-2 text-[10px] font-bold text-slate-400 hover:text-emerald-600 transition-all bg-slate-50/50 hover:bg-slate-50 rounded-xl border border-dashed border-slate-200"
                          >
                            <ChevronDown size={12} strokeWidth={3} />
                            查看历史跟进记录 ({olderDateGroups.reduce((acc, curr) => acc + curr[1].length, 0)} 条)
                          </button>
                        ) : (
                          <>
                            <div className="space-y-4 animate-in slide-in-from-top-2 fade-in duration-200">
                              {olderDateGroups.map(([date, dateRecords]) => (
                                <div key={date} className="space-y-3 opacity-80 hover:opacity-100 transition-opacity">
                                   <div className="flex items-center gap-2">
                                      <div className="h-px bg-slate-50 flex-1"></div>
                                      <span className="text-[9px] font-bold text-slate-400 uppercase tracking-widest bg-slate-50 px-2 py-0.5 rounded border border-slate-100">{date}</span>
                                      <div className="h-px bg-slate-50 flex-1"></div>
                                   </div>
                                   <div className="space-y-2">
                                      {dateRecords.map((record) => (
                                        <div key={record.id} className="relative group/item">
                                          <div className="flex justify-between items-start gap-3 pl-1">
                                            <div className="flex gap-3 flex-1 min-w-0">
                                              <button 
                                                onClick={(e) => { e.stopPropagation(); onToggleProgress(contact.id, record.id); }}
                                                className={`mt-0.5 transition-colors shrink-0 ${record.completed ? 'text-emerald-500' : 'text-slate-300 hover:text-slate-400'}`}
                                              >
                                                 {record.completed ? <CheckSquare size={16} strokeWidth={2} /> : <Square size={16} strokeWidth={2} />}
                                              </button>
                                              <div className="flex flex-col min-w-0 flex-1">
                                                <p className={`text-sm leading-relaxed transition-all break-words ${record.completed ? 'text-slate-400 line-through' : 'text-slate-600'}`}>
                                                    {record.content}
                                                </p>
                                              </div>
                                            </div>
                                            <div className="flex gap-1 opacity-0 group-hover/item:opacity-100 transition-opacity shrink-0">
                                              <button 
                                                onClick={(e) => { e.stopPropagation(); onEditProgressRecord?.(contact.id, record); }} 
                                                className="p-1 text-slate-400 hover:text-blue-600 hover:bg-white rounded-lg"
                                              >
                                                <Edit2 size={12} />
                                              </button>
                                              <button 
                                                onClick={(e) => { e.stopPropagation(); onDeleteProgress(contact.id, record.id); }} 
                                                className="p-1 text-slate-400 hover:text-rose-600 hover:bg-white rounded-lg"
                                              >
                                                <Trash2 size={12} />
                                              </button>
                                            </div>
                                          </div>
                                        </div>
                                      ))}
                                   </div>
                                </div>
                              ))}
                            </div>
                            <button 
                              onClick={() => toggleHistory(contact.id)}
                              className="w-full py-2 flex items-center justify-center gap-2 text-[10px] font-bold text-slate-400 hover:text-slate-700 transition-all bg-slate-100/50 rounded-xl"
                            >
                              <ChevronUp size={12} strokeWidth={3} />
                              收起历史记录
                            </button>
                          </>
                        )}
                      </div>
                    )}

                    {(!contact.progressHistory || contact.progressHistory.length === 0) && contact.progress && (
                      <div className="p-3 bg-slate-50/50 rounded-xl border border-dashed border-slate-200 text-center">
                          <p className="text-xs text-slate-500 italic">{contact.progress}</p>
                      </div>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      <div className="fixed md:absolute bottom-4 md:bottom-6 left-4 md:left-0 right-4 md:right-0 z-30 flex justify-center pointer-events-none">
        <div className="w-full max-w-2xl pointer-events-auto shadow-2xl rounded-2xl md:rounded-3xl overflow-visible border border-slate-200">
          <QuickFollowUpForm contacts={contacts} onSave={onSaveQuickFollowUp} variant="compact" />
        </div>
      </div>
    </div>
  );
};

export default FollowUpDashboard;