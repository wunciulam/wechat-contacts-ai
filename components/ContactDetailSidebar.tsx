import React, { useState, useRef, useEffect } from 'react';
import { Contact, ProgressRecord } from '../types';
import { X, Edit2, Trash2, Plus, Calendar, Tag, User, Target, ShoppingBag, Clock, RotateCcw, CheckCircle2, CircleDashed, AlertCircle, Gift, ArrowRight, Send, Shield, FileText } from 'lucide-react';

interface ContactDetailSidebarProps {
  contact: Contact | null;
  isOpen: boolean;
  onClose: () => void;
  onEdit: (contact: Contact) => void;
  onDelete: (id: string) => void;
  onAddProgress: (contactId: string) => void;
  onDeleteProgress: (contactId: string, progressId: string) => void;
  onUpdateStatus: (contactId: string, newStatus: 'idle' | 'following') => void;
  onAddToFollowing: (contactId: string) => void;
  onRemoveTag: (contactId: string, tag: string) => void;
  showAddToFollowing?: boolean;
  onQuickAddProgress?: (contactId: string, date: string, content: string) => void;
  onAddPolicy?: (contactId: string) => void;
  onDeletePolicy?: (contactId: string, policyId: string) => void;
  onEditPolicy?: (contactId: string, policy: any) => void;
}

const ContactDetailSidebar: React.FC<ContactDetailSidebarProps> = ({
  contact,
  isOpen,
  onClose,
  onEdit,
  onDelete,
  onAddProgress,
  onDeleteProgress,
  onUpdateStatus,
  onAddToFollowing,
  onRemoveTag,
  showAddToFollowing = false,
  onQuickAddProgress,
  onAddPolicy,
  onDeletePolicy,
  onEditPolicy
}) => {
  const [copiedWxid, setCopiedWxid] = useState<string | null>(null);
  
  // 常驻输入框状态
  const [isInputFocused, setIsInputFocused] = useState(false);
  const [progressContent, setProgressContent] = useState('');
  const [progressDate, setProgressDate] = useState(new Date().toISOString().split('T')[0]);
  const inputRef = useRef<HTMLTextAreaElement>(null);

  // 自动调整文本框高度 - 必须在条件判断之前
  useEffect(() => {
    if (inputRef.current) {
      inputRef.current.style.height = 'auto';
      inputRef.current.style.height = Math.min(inputRef.current.scrollHeight, 120) + 'px';
    }
  }, [progressContent]);

  // 当侧边栏打开时，重置输入框状态
  useEffect(() => {
    if (isOpen) {
      setProgressContent('');
      setIsInputFocused(false);
      setProgressDate(new Date().toISOString().split('T')[0]);
    }
  }, [isOpen]);

  if (!contact || !isOpen) return null;

  const handleSubmitProgress = () => {
    if (!progressContent.trim() || !onQuickAddProgress) return;
    
    onQuickAddProgress(contact.id, progressDate, progressContent.trim());
    setProgressContent('');
    setIsInputFocused(false);
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSubmitProgress();
    }
  };

  const handleCopyWxid = (e: React.MouseEvent, wxid: string) => {
    e.stopPropagation();
    navigator.clipboard.writeText(wxid);
    setCopiedWxid(wxid);
    setTimeout(() => setCopiedWxid(null), 2000);
  };

  // 计算距离上次跟进的天数
  const getDaysSinceLastContact = () => {
    if (!contact.lastDate) return null;
    const lastDate = new Date(contact.lastDate);
    const today = new Date();
    const diffTime = today.getTime() - lastDate.getTime();
    return Math.ceil(diffTime / (1000 * 60 * 60 * 24));
  };

  const daysSinceLastContact = getDaysSinceLastContact();
  const isOverdue = daysSinceLastContact !== null && daysSinceLastContact > 30;

  // 计算是否快过生日
  const isBirthdaySoon = () => {
    if (!contact.birthday) return false;
    const today = new Date();
    const currentMonth = today.getMonth() + 1;
    const currentDay = today.getDate();
    
    const [birthMonth, birthDay] = contact.birthday.split('-').map(Number);
    
    // 计算距离生日的天数
    const currentDate = new Date(today.getFullYear(), currentMonth - 1, currentDay);
    let birthdayThisYear = new Date(today.getFullYear(), birthMonth - 1, birthDay);
    
    if (birthdayThisYear < currentDate) {
      birthdayThisYear = new Date(today.getFullYear() + 1, birthMonth - 1, birthDay);
    }
    
    const diffTime = birthdayThisYear.getTime() - currentDate.getTime();
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
    
    return diffDays <= 7 && diffDays >= 0;
  };

  const birthdaySoon = isBirthdaySoon();

  return (
    <>
      {/* Backdrop */}
      <div 
        className="fixed inset-0 bg-black/30 z-40 transition-opacity duration-300"
        onClick={onClose}
      />
      
      {/* Sidebar */}
      <div className="fixed right-0 top-0 h-full w-[500px] bg-white shadow-lg z-50 flex flex-col animate-in slide-in-from-right duration-300">
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-gray-100 bg-gray-50">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-lg bg-gray-900 flex items-center justify-center text-white font-medium text-lg">
              {contact.remarkName?.[0] || contact.nickname?.[0] || '?'}
            </div>
            <div>
              <h2 className="text-lg font-medium text-gray-900">
                {contact.remarkName || contact.nickname || "未知名称"}
              </h2>
              {contact.remarkName && contact.nickname && contact.remarkName !== contact.nickname && (
                <p className="text-xs text-gray-400">{contact.nickname}</p>
              )}
            </div>
          </div>
          <div className="flex items-center gap-2">
            <button
              onClick={() => onEdit(contact)}
              className="p-2 text-gray-400 hover:text-gray-900 hover:bg-gray-100 rounded-md transition-colors"
              title="编辑联系人"
            >
              <Edit2 size={18} />
            </button>
            <button
              onClick={() => {
                if (confirm(`确定要删除联系人「${contact.remarkName || contact.nickname}」吗？\n\n此操作不可撤销，该联系人的所有跟进记录和保单信息都会被删除。`)) {
                  onDelete(contact.id);
                  onClose();
                }
              }}
              className="p-2 text-gray-400 hover:text-red-600 hover:bg-red-50 rounded-md transition-colors"
              title="删除联系人"
            >
              <Trash2 size={18} />
            </button>
            <button
              onClick={onClose}
              className="p-2 text-gray-400 hover:text-gray-900 hover:bg-gray-100 rounded-md transition-colors ml-2"
              title="关闭"
            >
              <X size={20} />
            </button>
          </div>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto custom-scrollbar">
          {/* Status Bar */}
          <div className="px-6 py-3 bg-gray-50 border-b border-gray-100 flex items-center justify-between">
            <div className="flex items-center gap-4">
              {/* Follow-up Status */}
              <div className="flex items-center gap-2">
                <span className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-medium ${
                  contact.followUpStatus === 'following' 
                    ? 'bg-gray-900 text-white' 
                    : 'bg-gray-50 text-gray-400'
                }`}>
                  {contact.followUpStatus === 'following' ? (
                    <><Clock size={12} /> 跟进中</>
                  ) : (
                    <><CircleDashed size={12} /> 暂未跟进</>
                  )}
                </span>
                
                {/* Status Toggle Buttons */}
                <div className="flex items-center gap-1">
                  <button
                    onClick={() => onUpdateStatus(contact.id, 'following')}
                    className={`text-xs px-2 py-1 rounded transition-colors ${
                      contact.followUpStatus === 'following'
                        ? 'bg-gray-900 text-white'
                        : 'text-gray-400 hover:text-gray-900 hover:bg-gray-100'
                    }`}
                  >
                    跟进中
                  </button>
                  <button
                    onClick={() => onUpdateStatus(contact.id, 'idle')}
                    className={`text-xs px-2 py-1 rounded transition-colors ${
                      !contact.followUpStatus || contact.followUpStatus === 'idle'
                        ? 'bg-gray-900 text-white'
                        : 'text-gray-400 hover:text-gray-900 hover:bg-gray-100'
                    }`}
                  >
                    暂未跟进
                  </button>
                </div>
              </div>

              {/* Reminders */}
              {isOverdue && (
                <span className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-bold bg-rose-100 text-rose-700">
                  <AlertCircle size={12} />
                  {daysSinceLastContact}天未联系
                </span>
              )}
              {birthdaySoon && (
                <span className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-bold bg-pink-100 text-pink-700">
                  <Gift size={12} />
                  快过生日
                </span>
              )}
            </div>

            {/* Add to Following Button (only for deal customers) */}
            {showAddToFollowing && contact.followUpStatus !== 'following' && (
              <button
                onClick={() => onAddToFollowing(contact.id)}
                className="flex items-center gap-1.5 px-3 py-1.5 rounded-md text-xs font-medium bg-gray-900 text-white hover:bg-gray-800 transition-colors"
              >
                <RotateCcw size={12} />
                添加到待跟进
              </button>
            )}
          </div>

          {/* Progress Records Section (Priority 1) */}
          <div className="p-6 border-b border-gray-100">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-sm font-medium text-gray-900 flex items-center gap-2">
                <Calendar size={16} className="text-gray-900" />
                跟进记录
                <span className="text-xs font-normal text-gray-400">
                  ({contact.progressHistory?.length || 0})
                </span>
              </h3>
            </div>
            
            {/* 常驻输入框 */}
            <div className="mb-6 bg-white border border-gray-200 rounded-lg overflow-hidden transition-all duration-200 focus-within:border-gray-400">
              {/* 日期选择器 - 始终显示 */}
              <div className="px-3 py-2 border-b border-gray-100 bg-gray-50 flex items-center gap-2">
                <Calendar size={14} className="text-gray-400" />
                <input
                  type="date"
                  value={progressDate}
                  onChange={(e) => setProgressDate(e.target.value)}
                  className="text-sm text-gray-600 bg-transparent outline-none cursor-pointer"
                />
              </div>
              
              {/* 输入区域 */}
              <div className="relative">
                <textarea
                  ref={inputRef}
                  value={progressContent}
                  onChange={(e) => setProgressContent(e.target.value)}
                  onFocus={() => setIsInputFocused(true)}
                  onKeyDown={handleKeyDown}
                  placeholder="输入跟进内容，按回车发送..."
                  rows={1}
                  className="w-full px-3 py-3 pr-12 text-sm text-gray-700 placeholder:text-gray-400 outline-none resize-none bg-transparent min-h-[44px]"
                  style={{ maxHeight: '120px' }}
                />
                
                {/* 发送按钮 */}
                <button
                  onClick={handleSubmitProgress}
                  disabled={!progressContent.trim()}
                  className="absolute right-2 bottom-2 p-1.5 rounded-md text-gray-600 hover:bg-gray-100 disabled:text-gray-300 disabled:hover:bg-transparent transition-colors"
                  title="发送 (Enter)"
                >
                  <Send size={16} className={progressContent.trim() ? 'rotate-0' : 'rotate-45 opacity-50'} />
                </button>
              </div>
              
              {/* 快捷键提示 - 仅在聚焦时显示 */}
              {isInputFocused && (
                <div className="px-3 py-1.5 border-t border-gray-100 bg-gray-50 flex items-center justify-between text-[10px] text-gray-400 animate-in slide-in-from-bottom-1">
                  <span>Enter 发送，Shift+Enter 换行</span>
                  <button
                    onClick={() => setIsInputFocused(false)}
                    className="text-gray-400 hover:text-gray-900"
                  >
                    收起
                  </button>
                </div>
              )}
            </div>
            
            {(!contact.progressHistory || contact.progressHistory.length === 0) ? (
              <div className="text-center py-8 text-gray-400">
                <div className="w-12 h-12 bg-gray-100 rounded-full flex items-center justify-center mx-auto mb-2">
                  <Calendar size={20} className="text-gray-300" />
                </div>
                <p className="text-sm">暂无跟进记录</p>
                <p className="text-xs text-gray-400 mt-1">在上方输入框添加第一条跟进</p>
              </div>
            ) : (
              <div className="space-y-4">
                {contact.progressHistory?.map((record, idx) => (
                  <div key={record.id || idx} className="relative pl-6 pb-4 last:pb-0">
                    {/* Timeline line */}
                    {idx < (contact.progressHistory?.length || 0) - 1 && (
                      <div className="absolute left-[5px] top-3 bottom-0 w-0.5 bg-gray-200"></div>
                    )}
                    {/* Timeline dot */}
                    <div className={`absolute left-0 top-1.5 w-3 h-3 rounded-full border-2 border-white ${
                      idx === 0 ? 'bg-gray-900' : 'bg-gray-300'
                    }`}></div>
                    
                    <div className="bg-gray-50 rounded-lg p-4 group">
                      <div className="flex items-center justify-between mb-2">
                        <span className={`text-xs font-mono font-medium ${idx === 0 ? 'text-gray-900' : 'text-gray-500'}`}>
                          {record.date}
                        </span>
                        <button
                          onClick={() => onDeleteProgress(contact.id, record.id)}
                          className="opacity-0 group-hover:opacity-100 p-1 text-gray-400 hover:text-gray-900 hover:bg-gray-100 rounded transition-all"
                          title="删除此记录"
                        >
                          <Trash2 size={14} />
                        </button>
                      </div>
                      <p className={`text-sm leading-relaxed whitespace-pre-wrap ${idx === 0 ? 'text-gray-900 font-medium' : 'text-gray-600'}`}>
                        {record.content}
                      </p>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Basic Info Section (Priority 2) */}
          <div className="p-6">
            <h3 className="text-sm font-medium text-gray-900 flex items-center gap-2 mb-4">
              <User size={16} className="text-gray-900" />
              基本信息
            </h3>
            
            <div className="space-y-4">
              {/* WeChat ID */}
              {contact.wxid && (
                <div className="flex items-start gap-3">
                  <span className="text-xs font-medium text-gray-400 w-16 shrink-0 pt-1">微信号</span>
                  <div 
                    className="flex items-center gap-2 cursor-pointer group"
                    onClick={(e) => handleCopyWxid(e, contact.wxid)}
                  >
                    <span className="text-sm font-mono text-gray-700 bg-gray-100 px-2 py-1 rounded group-hover:bg-gray-200 group-hover:text-gray-900 transition-colors">
                      {contact.wxid}
                    </span>
                    {copiedWxid === contact.wxid ? (
                      <span className="text-xs text-gray-900">已复制</span>
                    ) : (
                      <span className="text-xs text-gray-400 opacity-0 group-hover:opacity-100">点击复制</span>
                    )}
                  </div>
                </div>
              )}

              {/* Birthday */}
              {contact.birthday && (
                <div className="flex items-start gap-3">
                  <span className="text-xs font-medium text-gray-400 w-16 shrink-0 pt-1">生日</span>
                  <div className="flex items-center gap-2">
                    <span className="text-sm text-gray-700">{contact.birthday}</span>
                    {birthdaySoon && (
                      <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-medium bg-gray-900 text-white">
                        <Gift size={10} />
                        快过生日
                      </span>
                    )}
                  </div>
                </div>
              )}

              {/* Tags */}
              {contact.tags?.length > 0 && (
                <div className="flex items-start gap-3">
                  <span className="text-xs font-medium text-gray-400 w-16 shrink-0 pt-1">标签</span>
                  <div className="flex flex-wrap gap-1.5">
                    {contact.tags.map(tag => (
                      <span 
                        key={tag} 
                        className="group inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-medium bg-gray-100 text-gray-600 hover:bg-gray-200 hover:text-gray-900 transition-colors cursor-pointer"
                        onClick={() => onRemoveTag(contact.id, tag)}
                      >
                        {tag}
                        <span className="opacity-0 group-hover:opacity-100 text-gray-900">×</span>
                      </span>
                    ))}
                  </div>
                </div>
              )}

              {/* Deal Products - 表格展示 */}
              {contact.dealProducts?.length > 0 && (
                <div className="flex items-start gap-3">
                  <span className="text-xs font-medium text-gray-400 w-16 shrink-0 pt-1">
                    <ShoppingBag size={12} className="inline mr-1" />
                    成交产品
                  </span>
                  <div className="flex-1 bg-gray-50 rounded-lg border border-gray-200 overflow-hidden">
                    <table className="w-full text-sm">
                      <thead className="bg-gray-100 text-gray-500 text-xs font-medium">
                        <tr>
                          <th className="px-3 py-2 text-left">产品名称</th>
                          <th className="px-3 py-2 text-right">操作</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-gray-100">
                        {contact.dealProducts.map((product, idx) => (
                          <tr key={`${product}-${idx}`} className="hover:bg-gray-50">
                            <td className="px-3 py-2 text-gray-700">{product}</td>
                            <td className="px-3 py-2 text-right">
                              <button 
                                onClick={(e) => {
                                  e.stopPropagation();
                                  // 删除成交产品标签
                                  const updatedDealProducts = contact.dealProducts?.filter((_, i) => i !== idx) || [];
                                  // 触发更新（通过编辑联系人方式）
                                  onEdit({ ...contact, dealProducts: updatedDealProducts });
                                }}
                                className="text-gray-400 hover:text-red-600 p-1"
                                title="删除产品标签"
                              >
                                <Trash2 size={12} />
                              </button>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>
              )}

              {/* Intent Products */}
              {contact.intentProducts?.length > 0 && (
                <div className="flex items-start gap-3">
                  <span className="text-xs font-medium text-gray-400 w-16 shrink-0 pt-1">
                    <Target size={12} className="inline mr-1" />
                    意向产品
                  </span>
                  <div className="flex flex-wrap gap-1.5">
                    {contact.intentProducts.map(product => (
                      <span 
                        key={product} 
                        className="px-2.5 py-1 rounded-full text-xs font-medium bg-gray-100 text-gray-700 border border-gray-200"
                      >
                        {product}
                      </span>
                    ))}
                  </div>
                </div>
              )}

              {/* Remark Info */}
              {contact.remarkInfo && (
                <div className="flex items-start gap-3">
                  <span className="text-xs font-medium text-gray-400 w-16 shrink-0 pt-1">备注</span>
                  <p className="text-sm text-gray-700 leading-relaxed flex-1">
                    {contact.remarkInfo}
                  </p>
                </div>
              )}

              {/* Added At */}
              <div className="flex items-start gap-3 pt-4 border-t border-gray-100">
                <span className="text-xs font-medium text-gray-400 w-16 shrink-0 pt-1">添加时间</span>
                <span className="text-xs text-gray-400">
                  {new Date(contact.addedAt).toLocaleDateString('zh-CN')}
                </span>
              </div>
            </div>
          </div>

          {/* Policies Section - 表格展示 */}
          {contact.policies && contact.policies.length > 0 && (
            <div className="p-6 border-t border-gray-100">
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-sm font-medium text-gray-900 flex items-center gap-2">
                  <Shield size={16} className="text-gray-900" />
                  保单信息
                  <span className="text-xs font-normal text-gray-400">
                    ({contact.policies.length})
                  </span>
                </h3>
                {onAddPolicy && (
                  <button
                    onClick={() => onAddPolicy(contact.id)}
                    className="text-xs flex items-center gap-1 text-gray-600 hover:text-gray-900"
                  >
                    <Plus size={14} />
                    添加保单
                  </button>
                )}
              </div>
              
              <div className="bg-gray-50 rounded-lg border border-gray-200 overflow-x-auto">
                <table className="w-full text-sm min-w-[600px]">
                  <thead className="bg-gray-100 text-gray-500 text-xs font-medium">
                    <tr>
                      <th className="px-3 py-2 text-left">险种名称</th>
                      <th className="px-3 py-2 text-left">保单号</th>
                      <th className="px-3 py-2 text-right">保费</th>
                      <th className="px-3 py-2 text-center">状态</th>
                      <th className="px-3 py-2 text-right">操作</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-100">
                    {contact.policies.map((policy, idx) => (
                      <tr key={policy.id || idx} className="hover:bg-gray-50">
                        <td className="px-3 py-2 font-medium text-gray-700">{policy.productName}</td>
                        <td className="px-3 py-2 font-mono text-gray-600 text-xs">{policy.policyNumber || '-'}</td>
                        <td className="px-3 py-2 text-right font-medium text-gray-900">¥ {policy.premium}</td>
                        <td className="px-3 py-2 text-center">
                          <span className={`px-2 py-0.5 rounded text-[10px] font-medium ${
                            policy.status.includes('有效') ? 'bg-gray-900 text-white' : 'bg-gray-100 text-gray-600'
                          }`}>
                            {policy.status}
                          </span>
                        </td>
                        <td className="px-3 py-2 text-right">
                          <div className="flex items-center justify-end gap-1">
                            {onEditPolicy && (
                              <button
                                onClick={(e) => {
                                  e.stopPropagation();
                                  onEditPolicy(contact.id, policy);
                                }}
                                className="text-gray-400 hover:text-blue-600 p-1"
                                title="编辑保单"
                              >
                                <Edit2 size={12} />
                              </button>
                            )}
                            {onDeletePolicy && (
                              <button
                                onClick={(e) => {
                                  e.stopPropagation();
                                  if (confirm(`确定要删除这份保单吗？\n\n${policy.productName}\n保单号：${policy.policyNumber}`)) {
                                    onDeletePolicy(contact.id, policy.id);
                                  }
                                }}
                                className="text-gray-400 hover:text-red-600 p-1"
                                title="删除保单"
                              >
                                <Trash2 size={12} />
                              </button>
                            )}
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}
        </div>
      </div>
    </>
  );
};

export default ContactDetailSidebar;
