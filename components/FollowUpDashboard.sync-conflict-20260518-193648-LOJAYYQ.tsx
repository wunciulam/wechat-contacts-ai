import React, { useState, useMemo, useRef, useEffect } from 'react';
import { Contact, ProgressRecord } from '../types';
import { Plus, Calendar, Clock, CheckCircle2, CircleDashed, Edit2, Trash2, ArrowRight, CheckSquare, Square, ChevronDown, ChevronUp } from 'lucide-react';
import { QuickFollowUpForm } from './QuickFollowUpForm';
import { PageHeader } from './PageHeader';

interface FollowUpDashboardProps {
  contacts: Contact[];
  filterTags: Set<string>;
  followUpFilter: 'idle' | 'following' | 'contacted' | null;
  onAddProgress: (contactId?: string) => void;
  onEditContact: (contact: Contact) => void;
  onDeleteProgress: (contactId: string, progressId: string) => void;
  onToggleProgress: (contactId: string, progressId: string) => void;
  onUpdateStatus: (contactId: string, newStatus: 'following' | 'contacted' | 'idle') => void;
  onSaveQuickFollowUp: (contactId: string | null, date: string, content: string, status: 'following' | 'contacted', newContactName?: string, existingRecordId?: string, completed?: boolean) => void;
  onEditProgressRecord?: (contactId: string, record: ProgressRecord) => void;
}

const FollowUpDashboard: React.FC<FollowUpDashboardProps> = ({ 
  contacts, filterTags, followUpFilter, onAddProgress, onEditContact, onDeleteProgress, onToggleProgress, onUpdateStatus, onSaveQuickFollowUp, onEditProgressRecord
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
    const following = contacts.filter(c => c.followUpStatus === 'following').length;
    const contacted = contacts.filter(c => c.followUpStatus === 'contacted').length;
    return { following, contacted };
  }, [contacts]);

  const visibleContacts = useMemo(() => {
    return contacts.filter(c => {
      // 跟进状态筛选：如果 followUpFilter 不为 null，优先使用 followUpFilter；否则使用 activeTab
      let matchesFollowUpStatus = true;
      if (followUpFilter !== null) {
        matchesFollowUpStatus = c.followUpStatus === followUpFilter;
      } else {
        // 使用 activeTab 过滤
        const status = c.followUpStatus || 'idle';
        const isFollowing = status === 'following';
        const isContacted = status === 'contacted';
        matchesFollowUpStatus = activeTab === 'following' ? isFollowing : isContacted;
      }
      
      const matchesTag = filterTags.size === 0 || c.tags.some(tag => filterTags.has(tag));
      return matchesFollowUpStatus && matchesTag;
    }).sort((a, b) => {
      const timeA = a.lastDate ? new Date(a.lastDate).getTime() : 0;
      const timeB = b.lastDate ? new Date(b.lastDate).getTime() : 0;
      return (isNaN(timeB) ? 0 : timeB) - (isNaN(timeA) ? 0 : timeA);
    });
  }, [contacts, activeTab, filterTags, followUpFilter]);

  const handleSetIdle = (e: React.MouseEvent, contactId: string) => {
    e.stopPropagation();
    onUpdateStatus(contactId, 'idle');
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
    <div ref={dashboardRef} className="flex-1 h-full w-full overflow-hidden flex flex-col bg-white relative">
      <div className="sticky top-0 z-20 shrink-0 bg-white border-b border-gray-100">
        <PageHeader
          title={activeTab === 'following' ? '跟进中' : '已沟通'}
          count={visibleContacts.length}
          actionButton={
            <button 
              onClick={() => onAddProgress()}
              className="btn btn-primary text-sm"
            >
              <Plus size={16} /><span>写跟进</span>
            </button>
          }
        />
        <div className="px-5 pb-4">
          <div className="flex p-0.5 bg-gray-100 rounded-md w-fit">
            <button onClick={() => setActiveTab('following')} className={`px-4 py-1.5 rounded text-sm font-medium flex items-center gap-2 transition-all ${activeTab === 'following' ? 'bg-white text-gray-900' : 'text-gray-500 hover:text-gray-700'}`}>
              <CircleDashed size={14} />跟进中 <span className="opacity-50 text-xs">{counts.following}</span>
            </button>
            <button onClick={() => setActiveTab('contacted')} className={`px-4 py-1.5 rounded text-sm font-medium flex items-center gap-2 transition-all ${activeTab === 'contacted' ? 'bg-white text-gray-900' : 'text-gray-500 hover:text-gray-700'}`}>
              <CheckCircle2 size={14} />已沟通 <span className="opacity-50 text-xs">{counts.contacted}</span>
            </button>
          </div>
        </div>
      </div>

      <div className="flex-1 overflow-y-auto p-4 md:p-6 pb-64 custom-scrollbar">
        {visibleContacts.length === 0 ? (
          <div className="flex flex-col items-center justify-center min-h-[400px] text-gray-300">
            <div className="w-16 h-16 bg-gray-100 rounded-lg flex items-center justify-center mb-4 border border-gray-200"><Calendar size={32} className="text-gray-300" /></div>
            <p className="text-base font-medium text-gray-400">暂无待跟进记录</p>
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
                <div key={contact.id} className="bg-white rounded-lg border border-gray-100 overflow-hidden hover:border-gray-200 transition-all group/card">
                  <div className="p-3 md:p-4 border-b border-gray-50 flex items-center justify-between bg-gray-50/30 cursor-pointer hover:bg-gray-50" onClick={() => onEditContact(contact)}>
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 rounded-lg bg-gray-100 border border-gray-200 flex items-center justify-center text-gray-600 font-bold text-base">
                        {initials}
                      </div>
                      <div className="min-w-0">
                        <h3 className="font-bold text-gray-900 text-xs md:text-sm flex items-center gap-2 group-hover/card:text-gray-900 transition-colors truncate">
                          {contact.remarkName || contact.nickname}
                          <ArrowRight size={14} className="opacity-0 group-hover/card:opacity-100 -translate-x-1 group-hover/card:translate-x-0 transition-all text-gray-400 shrink-0"/>
                        </h3>
                        <div className="text-[9px] md:text-[10px] text-gray-500 font-medium flex items-center gap-1 mt-0.5"><Clock size={12} />{contact.lastDate || '从未'} 更新</div>
                      </div>
                    </div>
                    <div className="flex items-center gap-1 md:gap-2" onClick={e => e.stopPropagation()}>
                      <button 
                        onClick={() => onUpdateStatus(contact.id, activeTab === 'following' ? 'contacted' : 'following')} 
                        className="text-[9px] md:text-[10px] font-medium px-2 md:px-3 py-1 md:py-1.5 rounded-md bg-white border border-gray-200 hover:border-gray-300 transition-all flex items-center gap-1 md:gap-1.5 text-gray-700"
                      >
                        {activeTab === 'following' ? <CheckCircle2 size={12} className="text-gray-500 md:w-[14px] md:h-[14px]" strokeWidth={2.5} /> : <Clock size={12} className="text-gray-500 md:w-[14px] md:h-[14px]" strokeWidth={2.5} />}
                        {activeTab === 'following' ? '移到已沟通' : '重新开始跟进'}
                      </button>
                      <button 
                        onClick={() => onAddProgress(contact.id)} 
                        className="text-[9px] md:text-[10px] font-medium text-white bg-gray-900 hover:bg-gray-800 px-2 md:px-3 py-1 md:py-1.5 rounded-md transition-all flex items-center gap-1"
                      >
                        <Plus size={12} className="md:w-[14px] md:h-[14px]" strokeWidth={2.5} />写记录
                      </button>
                      <button 
                        onClick={(e) => handleSetIdle(e, contact.id)}
                        className="p-1 text-gray-300 hover:text-gray-900 hover:bg-gray-100 rounded-md transition-all"
                        title="设为暂未跟进"
                      >
                        <Trash2 size={14} className="md:w-[16px] md:h-[16px]" />
                      </button>
                    </div>
                  </div>
                  <div className="p-3 md:p-4 bg-white space-y-4">
                    {latestDateGroup && (
                      <div className="space-y-3">
                         <div className="flex items-center gap-2">
                            <div className="h-px bg-gray-100 flex-1"></div>
                            <span className="text-[9px] font-medium text-gray-400 uppercase tracking-widest bg-gray-50 px-2 py-0.5 rounded">{latestDateGroup[0]}</span>
                            <div className="h-px bg-gray-100 flex-1"></div>
                         </div>
                         <div className="space-y-2">
                            {latestDateGroup[1].map((record) => (
                              <div key={record.id} className="relative group/item">
                                <div className="flex justify-between items-start gap-3 pl-1">
                                  <div className="flex gap-3 flex-1 min-w-0">
                                    <button 
                                      onClick={(e) => { e.stopPropagation(); onToggleProgress(contact.id, record.id); }}
                                      className={`mt-0.5 transition-colors shrink-0 ${record.completed ? 'text-gray-900' : 'text-gray-300 hover:text-gray-400'}`}
                                    >
                                       {record.completed ? <CheckSquare size={18} strokeWidth={2} /> : <Square size={18} strokeWidth={2} />}
                                    </button>
                                    <div className="flex flex-col min-w-0 flex-1">
                                      <p className={`text-sm leading-relaxed transition-all break-words ${record.completed ? 'text-gray-400 line-through' : 'text-gray-700 font-medium'}`}>
                                          {record.content}
                                      </p>
                                    </div>
                                  </div>
                                  <div className="flex gap-1 opacity-0 group-hover/item:opacity-100 transition-opacity shrink-0">
                                    <button 
                                      onClick={(e) => { e.stopPropagation(); onEditProgressRecord?.(contact.id, record); }} 
                                      className="p-1 text-gray-400 hover:text-gray-900 hover:bg-gray-100 rounded-md"
                                    >
                                      <Edit2 size={14} />
                                    </button>
                                    <button 
                                      onClick={(e) => { e.stopPropagation(); onDeleteProgress(contact.id, record.id); }} 
                                      className="p-1 text-gray-400 hover:text-gray-900 hover:bg-gray-100 rounded-md"
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
                            className="w-full py-2 flex items-center justify-center gap-2 text-[10px] font-medium text-gray-400 hover:text-gray-900 transition-all bg-gray-50 hover:bg-gray-100 rounded-md border border-dashed border-gray-200"
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
                                      <div className="h-px bg-gray-50 flex-1"></div>
                                      <span className="text-[9px] font-medium text-gray-400 uppercase tracking-widest bg-gray-50 px-2 py-0.5 rounded">{date}</span>
                                      <div className="h-px bg-gray-50 flex-1"></div>
                                   </div>
                                   <div className="space-y-2">
                                      {dateRecords.map((record) => (
                                        <div key={record.id} className="relative group/item">
                                          <div className="flex justify-between items-start gap-3 pl-1">
                                            <div className="flex gap-3 flex-1 min-w-0">
                                              <button 
                                                onClick={(e) => { e.stopPropagation(); onToggleProgress(contact.id, record.id); }}
                                                className={`mt-0.5 transition-colors shrink-0 ${record.completed ? 'text-gray-900' : 'text-gray-300 hover:text-gray-400'}`}
                                              >
                                                 {record.completed ? <CheckSquare size={16} strokeWidth={2} /> : <Square size={16} strokeWidth={2} />}
                                              </button>
                                              <div className="flex flex-col min-w-0 flex-1">
                                                <p className={`text-sm leading-relaxed transition-all break-words ${record.completed ? 'text-gray-400 line-through' : 'text-gray-600'}`}>
                                                    {record.content}
                                                </p>
                                              </div>
                                            </div>
                                            <div className="flex gap-1 opacity-0 group-hover/item:opacity-100 transition-opacity shrink-0">
                                              <button 
                                                onClick={(e) => { e.stopPropagation(); onEditProgressRecord?.(contact.id, record); }} 
                                                className="p-1 text-gray-400 hover:text-gray-900 hover:bg-gray-100 rounded-md"
                                              >
                                                <Edit2 size={12} />
                                              </button>
                                              <button 
                                                onClick={(e) => { e.stopPropagation(); onDeleteProgress(contact.id, record.id); }} 
                                                className="p-1 text-gray-400 hover:text-gray-900 hover:bg-gray-100 rounded-md"
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
                              className="w-full py-2 flex items-center justify-center gap-2 text-[10px] font-medium text-gray-400 hover:text-gray-900 transition-all bg-gray-100 rounded-md"
                            >
                              <ChevronUp size={12} strokeWidth={3} />
                              收起历史记录
                            </button>
                          </>
                        )}
                      </div>
                    )}

                    {(!contact.progressHistory || contact.progressHistory.length === 0) && contact.progress && (
                      <div className="p-3 bg-gray-50 rounded-md text-center border border-dashed border-gray-200">
                          <p className="text-xs text-gray-500 italic">{contact.progress}</p>
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
        <div className="w-full max-w-2xl pointer-events-auto shadow-lg rounded-lg overflow-visible border border-gray-200 bg-white">
          <QuickFollowUpForm contacts={contacts} onSave={onSaveQuickFollowUp} variant="compact" />
        </div>
      </div>
    </div>
  );
};

export default FollowUpDashboard;