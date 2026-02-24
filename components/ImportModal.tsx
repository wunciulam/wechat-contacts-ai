
import React, { useState, useRef, useEffect, useMemo } from 'react';
import { X, Upload, Check, AlertCircle, Plus, FileSpreadsheet, ShoppingBag, Trash2, Sparkles, Shield, Clock, Tag, Edit2, FileText, UserCheck } from 'lucide-react';
import { extractContactsFromMedia, extractTableFromMedia } from '../services/geminiService';
import { NewContact, Contact, ProgressRecord, ExtractedTableData, Policy, ExcelCustomerRow, ExcelPolicyRow } from '../types';
import * as XLSX from 'xlsx';

interface ImportModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSave: (contacts: NewContact[]) => void;
  onTableSave?: (data: ExtractedTableData) => void;
  initialData?: Contact | null;
  allTags?: string[];
}

const ImportModal: React.FC<ImportModalProps> = ({ isOpen, onClose, onSave, onTableSave, initialData, allTags = [] }) => {
  const [activeTab, setActiveTab] = useState<'manual' | 'ai' | 'table'>('ai');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [extractedList, setExtractedList] = useState<NewContact[]>([]);
  const [extractedTableData, setExtractedTableData] = useState<ExtractedTableData | null>(null);
  
  const [formData, setFormData] = useState<NewContact>({
    wxid: '', nickname: '', remarkName: '', remarkInfo: '', tags: [],
    dealProducts: [], intentProducts: [], lastDate: '', progressHistory: [],
    followUpStatus: 'following', policies: []
  });

  const [tagInput, setTagInput] = useState('');
  const [showTagSuggestions, setShowTagSuggestions] = useState(false);
  const [editingHistoryId, setEditingHistoryId] = useState<string | null>(null);
  const [historyForm, setHistoryForm] = useState<Partial<ProgressRecord>>({ date: new Date().toISOString().split('T')[0], content: '' });
  const [showHistoryAdd, setShowHistoryAdd] = useState(false);

  const fileInputRef = useRef<HTMLInputElement>(null);
  const tableFileInputRef = useRef<HTMLInputElement>(null);
  const excelFileInputRef = useRef<HTMLInputElement>(null);
  const tagInputContainerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (isOpen) {
      if (initialData) {
        setFormData({ 
          ...initialData, 
          policies: initialData.policies || [],
          progressHistory: initialData.progressHistory || []
        });
        setActiveTab('manual');
      } else {
        setFormData({ wxid: '', nickname: '', remarkName: '', remarkInfo: '', tags: [], dealProducts: [], intentProducts: [], lastDate: new Date().toISOString().split('T')[0], progressHistory: [], followUpStatus: 'following', policies: [] });
        setActiveTab('ai');
        setExtractedList([]);
        setExtractedTableData(null);
      }
      setShowHistoryAdd(false);
      setEditingHistoryId(null);
      setError(null);
    }
  }, [isOpen, initialData]);

  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (tagInputContainerRef.current && !tagInputContainerRef.current.contains(e.target as Node)) {
        setShowTagSuggestions(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const tagSuggestions = useMemo(() => {
    const currentTags = new Set(formData.tags);
    return allTags.filter(tag => !currentTags.has(tag) && tag.toLowerCase().includes(tagInput.toLowerCase()));
  }, [allTags, formData.tags, tagInput]);

  const processFile = async (file: File, mode: 'contact' | 'table') => {
    setLoading(true); setError(null);
    try {
      const reader = new FileReader();
      reader.readAsDataURL(file);
      reader.onload = async () => {
        const base64Data = (reader.result as string).split(',')[1];
        if (mode === 'contact') {
          const results = await extractContactsFromMedia(base64Data, file.type);
          setExtractedList(results.map(r => ({ ...r, wxid: r.wxid || '', nickname: r.nickname || '', remarkName: r.remarkName || '', remarkInfo: r.remarkInfo || '', tags: r.tags || [], dealProducts: r.dealProducts || [], intentProducts: r.intentProducts || [], lastDate: new Date().toISOString().split('T')[0], progressHistory: [], followUpStatus: 'following', policies: [] })));
        } else {
          const tableResult = await extractTableFromMedia(base64Data, file.type);
          setExtractedTableData(tableResult);
        }
        setLoading(false);
      };
    } catch (err: any) { setError(err.message || "解析失败"); setLoading(false); }
  };

  const processExcelFile = async (file: File) => {
    setLoading(true);
    setError(null);
    try {
      const data = await file.arrayBuffer();
      const workbook = XLSX.read(data);
      const sheetName = workbook.SheetNames[0];
      const worksheet = workbook.Sheets[sheetName];
      const jsonData = XLSX.utils.sheet_to_json(worksheet) as any[];
      
      if (jsonData.length === 0) {
        setError('Excel 文件为空');
        setLoading(false);
        return;
      }

      const firstRow = jsonData[0];
      // 清理列名（去除前后空格）
      const columns = Object.keys(firstRow).map(k => k.trim());
      
      let tableData: ExtractedTableData;

      // 检查是否为保单表
      const isPolicyTable = columns.some(c => 
        c.includes('保单号') || c.includes('产品名称') || c.includes('投保人') || c.includes('保费') || c.includes('保险公司')
      );
      
      // 检查是否为客户表
      const isCustomerTable = columns.some(c => 
        c.includes('客户姓名') || c.includes('证件号') || c.includes('手机号') || c.includes('地址') || c.includes('银行账号')
      );

      if (isPolicyTable || (!isCustomerTable && columns.includes('保单号'))) {
        // 保单信息表 - 处理列名中的空格
        const getRowValue = (row: any, ...keys: string[]) => {
          for (const key of keys) {
            if (row[key] !== undefined) return row[key];
            const trimmedKey = key.trim();
            if (row[trimmedKey] !== undefined) return row[trimmedKey];
          }
          return '';
        };
        
        tableData = {
          type: 'policy',
          items: jsonData.map((row: any) => ({
            policyNumber: getRowValue(row, '保单号', '保单号') || '',
            productName: getRowValue(row, '产品名称', '产品名称') || '',
            company: getRowValue(row, '保险公司', '保险公司') || '',
            premium: String(getRowValue(row, '保费', '保费') || '0'),
            effectiveDate: getRowValue(row, '生效日期', '生效日期') ? formatDate(getRowValue(row, '生效日期', '生效日期')) : '',
            status: getRowValue(row, '保单状态', '保单状态') || '有效',
            applicantName: getRowValue(row, '投保人姓名', '投保人姓名') || '',
            insuredName: getRowValue(row, '被保人', '被保人') || '',
            phoneNumber: getRowValue(row, '手机号', '手机号') || '',
            idCard: getRowValue(row, '证件号', '证件号') || '',
          }))
        };
      } else if (isCustomerTable || columns.includes('客户姓名')) {
        // 客户信息表 - 处理列名中的空格
        const getRowValue = (row: any, ...keys: string[]) => {
          for (const key of keys) {
            if (row[key] !== undefined) return row[key];
            // 尝试带空格和不带空格的版本
            const trimmedKey = key.trim();
            if (row[trimmedKey] !== undefined) return row[trimmedKey];
          }
          return '';
        };
        
        tableData = {
          type: 'customer',
          items: jsonData.map((row: any) => ({
            customerName: getRowValue(row, '客户姓名', ' 客户姓名') || '',
            idCard: getRowValue(row, '证件号', ' 证件号') || '',
            phoneNumber: getRowValue(row, '手机号', ' 手机号') || '',
            address: getRowValue(row, '地址', ' 地址') || '',
            bankAccount: getRowValue(row, '银行账号 ', '银行账号', ' 银行账号') || '',
          }))
        };
      } else {
        setError('无法识别表格类型，请确保表头包含"客户姓名"或"保单号"等关键词');
        setLoading(false);
        return;
      }

      setExtractedTableData(tableData);
      setLoading(false);
      // Excel导入完成后，切换到表格预览状态
      setActiveTab('table');
    } catch (err: any) {
      setError('Excel 解析失败: ' + (err.message || '请确保文件格式正确'));
      setLoading(false);
    }
  };

  const formatDate = (dateValue: any): string => {
    if (!dateValue) return '';
    if (typeof dateValue === 'string') return dateValue;
    if (dateValue instanceof Date) return dateValue.toISOString().split('T')[0];
    // Excel日期序列号处理 (如 45979 = 2025-11-18)
    if (typeof dateValue === 'number') {
      const date = new Date(Math.round((dateValue - 25569) * 86400 * 1000));
      const year = date.getFullYear();
      const month = String(date.getMonth() + 1).padStart(2, '0');
      const day = String(date.getDate()).padStart(2, '0');
      return `${year}-${month}-${day}`;
    }
    return String(dateValue);
  };

  const handleManualSave = () => {
    if (!formData.remarkName && !formData.nickname) { setError("请填写姓名或昵称"); return; }
    onSave([formData]); onClose();
  };

  const addTag = (tag: string) => {
    const trimmed = tag.trim();
    if (trimmed && !formData.tags.includes(trimmed)) {
      setFormData({ ...formData, tags: [...formData.tags, trimmed] });
    }
    setTagInput('');
    setShowTagSuggestions(false);
  };

  const handleAddHistory = () => {
    if (historyForm.content?.trim()) {
      const newRecord: ProgressRecord = {
        id: Date.now().toString(),
        date: historyForm.date || new Date().toISOString().split('T')[0],
        content: historyForm.content.trim(),
        completed: false
      };
      setFormData(prev => ({
        ...prev,
        progressHistory: [newRecord, ...(prev.progressHistory || [])],
        lastDate: newRecord.date
      }));
      setHistoryForm({ date: new Date().toISOString().split('T')[0], content: '' });
      setShowHistoryAdd(false);
    }
  };

  const handleEditHistory = (id: string) => {
    const record = formData.progressHistory?.find(r => r.id === id);
    if (record) {
      setEditingHistoryId(id);
      setHistoryForm({ date: record.date, content: record.content });
    }
  };

  const handleSaveEditHistory = () => {
    if (editingHistoryId && historyForm.content?.trim()) {
      setFormData(prev => ({
        ...prev,
        progressHistory: (prev.progressHistory || []).map(r => 
          r.id === editingHistoryId ? { ...r, date: historyForm.date!, content: historyForm.content! } : r
        )
      }));
      setEditingHistoryId(null);
      setHistoryForm({ date: new Date().toISOString().split('T')[0], content: '' });
    }
  };

  const handleDeleteHistory = (id: string) => {
    setFormData(prev => ({
      ...prev,
      progressHistory: (prev.progressHistory || []).filter(r => r.id !== id)
    }));
  };

  const handleTableConfirm = () => {
    if (extractedTableData && onTableSave) {
      onTableSave(extractedTableData);
      onClose();
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 backdrop-blur-md p-0 sm:p-4 animate-in fade-in duration-300">
      <div className="bg-white rounded-none sm:rounded-[2rem] shadow-2xl w-full max-w-2xl overflow-hidden flex flex-col h-full sm:h-auto sm:max-h-[95vh] ring-1 ring-white/20">
        <div className="px-4 sm:px-8 py-4 sm:py-5 border-b border-slate-200 flex justify-between items-center bg-white shrink-0">
          <h2 className="text-lg sm:text-xl font-bold text-slate-800 tracking-tight">{initialData ? '编辑联系人资料' : '添加联系人'}</h2>
          <button onClick={onClose} className="p-2 rounded-full text-slate-400 hover:bg-rose-50 hover:text-rose-500 transition-all shadow-sm"><X size={24} /></button>
        </div>
        {!initialData && (
          <div className="px-4 sm:px-8 pt-4 sm:pt-5 pb-0 flex gap-2 sm:gap-3 shrink-0 overflow-x-auto no-scrollbar">
            <button onClick={() => setActiveTab('ai')} className={`flex-1 min-w-[100px] py-2.5 sm:py-3 text-xs sm:text-sm font-bold rounded-xl sm:rounded-2xl transition-all ${activeTab === 'ai' ? 'bg-emerald-50 text-emerald-700 ring-2 ring-emerald-200 shadow-sm' : 'text-slate-500 hover:bg-slate-50 border border-slate-200'}`}>Excel导入</button>
            <button onClick={() => setActiveTab('table')} className={`flex-1 min-w-[100px] py-2.5 sm:py-3 text-xs sm:text-sm font-bold rounded-xl sm:rounded-2xl transition-all ${activeTab === 'table' ? 'bg-indigo-50 text-indigo-700 ring-2 ring-indigo-200 shadow-sm' : 'text-slate-500 hover:bg-slate-50 border border-slate-200'}`}>截图识别</button>
            <button onClick={() => setActiveTab('manual')} className={`flex-1 min-w-[100px] py-2.5 sm:py-3 text-xs sm:text-sm font-bold rounded-xl sm:rounded-2xl transition-all ${activeTab === 'manual' ? 'bg-emerald-50 text-emerald-700 ring-2 ring-emerald-200 shadow-sm' : 'text-slate-500 hover:bg-slate-50 border border-slate-200'}`}>手动录入</button>
          </div>
        )}
        <div className="flex-1 overflow-y-auto p-4 sm:p-8 custom-scrollbar space-y-6 sm:space-y-10 pb-32 sm:pb-8">
          {error && <div className="p-4 sm:p-5 bg-rose-50 text-rose-700 rounded-xl sm:rounded-2xl flex gap-3 border border-rose-200 font-bold text-sm"><AlertCircle size={20} />{error}</div>}
          
          {activeTab === 'manual' && (
            <div className="space-y-6 sm:space-y-8">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 sm:gap-6">
                <div className="space-y-2"><label className="text-xs font-bold text-slate-700 uppercase tracking-widest ml-1">备注名*</label><input type="text" className="w-full px-4 sm:px-5 py-3 sm:py-3.5 rounded-xl sm:rounded-2xl bg-slate-50 border-2 border-slate-200 outline-none focus:border-emerald-500 focus:bg-white focus:ring-4 focus:ring-emerald-500/5 transition-all font-bold text-slate-900" value={formData.remarkName} onChange={e => setFormData({...formData, remarkName: e.target.value})} /></div>
                <div className="space-y-2"><label className="text-xs font-bold text-slate-700 uppercase tracking-widest ml-1">昵称</label><input type="text" className="w-full px-4 sm:px-5 py-3 sm:py-3.5 rounded-xl sm:rounded-2xl bg-slate-50 border-2 border-slate-200 outline-none focus:border-emerald-500 focus:bg-white focus:ring-4 focus:ring-emerald-500/5 transition-all font-bold text-slate-900" value={formData.nickname} onChange={e => setFormData({...formData, nickname: e.target.value})} /></div>
                <div className="space-y-2"><label className="text-xs font-bold text-slate-700 uppercase tracking-widest ml-1">微信号</label><input type="text" className="w-full px-4 sm:px-5 py-3 sm:py-3.5 rounded-xl sm:rounded-2xl bg-slate-50 border-2 border-slate-200 outline-none focus:border-emerald-500 focus:bg-white focus:ring-4 focus:ring-emerald-500/5 transition-all font-mono text-slate-900 font-bold" value={formData.wxid} onChange={e => setFormData({...formData, wxid: e.target.value})} /></div>
                <div className="space-y-2"><label className="text-xs font-bold text-slate-700 uppercase tracking-widest ml-1">手机号</label><input type="text" className="w-full px-4 sm:px-5 py-3 sm:py-3.5 rounded-xl sm:rounded-2xl bg-slate-50 border-2 border-slate-200 outline-none focus:border-emerald-500 focus:bg-white focus:ring-4 focus:ring-emerald-500/5 transition-all font-mono text-slate-900 font-bold" value={formData.phoneNumber || ''} onChange={e => setFormData({...formData, phoneNumber: e.target.value})} /></div>
              </div>
              
              <div className="space-y-2 relative" ref={tagInputContainerRef}>
                <label className="text-xs font-bold text-slate-700 uppercase tracking-widest ml-1">标签管理</label>
                <div 
                  className={`flex flex-wrap gap-2.5 p-4 bg-slate-50 rounded-2xl min-h-[60px] border-2 transition-all ${showTagSuggestions ? 'border-emerald-500 bg-white ring-4 ring-emerald-500/5' : 'border-slate-200'}`}
                  onClick={() => setShowTagSuggestions(true)}
                >
                  {formData.tags.map(t => <span key={t} className="px-3 py-1 bg-emerald-50 border border-emerald-200 rounded-xl text-[11px] font-bold flex gap-2 items-center shadow-sm text-emerald-800">{t}<button onClick={(e) => { e.stopPropagation(); setFormData({...formData, tags: formData.tags.filter(x => x !== t)}); }} className="hover:text-rose-600 transition-colors"><X size={12} strokeWidth={3}/></button></span>)}
                  <input 
                    type="text" 
                    placeholder="输入标签..." 
                    className="bg-transparent outline-none text-sm flex-1 font-bold min-w-[150px] text-slate-900 placeholder:text-slate-400" 
                    value={tagInput} 
                    onChange={e => { setTagInput(e.target.value); setShowTagSuggestions(true); }}
                    onFocus={() => setShowTagSuggestions(true)}
                    onKeyDown={e => e.key === 'Enter' && (addTag(tagInput))} 
                  />
                </div>
                {showTagSuggestions && (tagSuggestions.length > 0 || tagInput.trim()) && (
                  <div className="absolute top-full left-0 right-0 mt-3 bg-white rounded-2xl shadow-2xl border border-slate-200 z-50 overflow-hidden max-h-60 overflow-y-auto custom-scrollbar animate-in fade-in slide-in-from-top-2">
                    {tagSuggestions.map(tag => (
                      <button key={tag} onClick={() => addTag(tag)} className="w-full text-left px-5 py-3 text-sm font-bold text-slate-700 hover:bg-emerald-50 hover:text-emerald-800 transition-colors border-b border-slate-50 last:border-0 flex items-center justify-between group">
                        <span>{tag}</span>
                        <Tag size={16} className="text-slate-300 group-hover:text-emerald-500 transition-colors" />
                      </button>
                    ))}
                    {tagInput.trim() && !tagSuggestions.includes(tagInput.trim()) && !formData.tags.includes(tagInput.trim()) && (
                       <button onClick={() => addTag(tagInput)} className="w-full text-left px-5 py-4 text-sm font-bold text-emerald-700 bg-emerald-50/50 hover:bg-emerald-100 transition-colors flex items-center gap-3">
                         <Plus size={18} strokeWidth={3} />
                         <span>新增标签: "{tagInput}"</span>
                       </button>
                    )}
                  </div>
                )}
              </div>

              <div className="space-y-2">
                 <label className="text-xs font-bold text-slate-700 uppercase tracking-widest ml-1">详细描述</label>
                 <textarea className="w-full p-5 bg-slate-50 rounded-[1.5rem] border-2 border-slate-200 outline-none focus:border-emerald-500 focus:bg-white focus:ring-4 focus:ring-emerald-500/5 transition-all min-h-[120px] resize-none text-slate-900 font-bold leading-relaxed" placeholder="输入相关业务描述..." value={formData.remarkInfo} onChange={e => setFormData({...formData, remarkInfo: e.target.value})} />
              </div>

              {/* 成交产品 */}
              <div className="space-y-2">
                <label className="text-xs font-bold text-slate-700 uppercase tracking-widest ml-1">成交产品</label>
                <div className="flex flex-wrap gap-2 p-4 bg-slate-50 rounded-2xl min-h-[60px] border-2 border-slate-200">
                  {(formData.dealProducts || []).map((product, idx) => (
                    <span key={idx} className="px-3 py-1 bg-orange-50 border border-orange-200 rounded-xl text-[11px] font-bold flex gap-2 items-center shadow-sm text-orange-800">
                      {product}
                      <button onClick={() => {
                        const newProducts = [...formData.dealProducts];
                        newProducts.splice(idx, 1);
                        setFormData({...formData, dealProducts: newProducts});
                      }} className="hover:text-rose-600 transition-colors">
                        <X size={12} strokeWidth={3}/>
                      </button>
                    </span>
                  ))}
                  <input 
                    type="text" 
                    placeholder="添加成交产品..." 
                    className="bg-transparent outline-none text-sm flex-1 font-bold min-w-[150px] text-slate-900 placeholder:text-slate-400" 
                    onKeyDown={e => {
                      if (e.key === 'Enter' && e.currentTarget.value.trim()) {
                        const newProducts = [...(formData.dealProducts || []), e.currentTarget.value.trim()];
                        setFormData({...formData, dealProducts: newProducts});
                        e.currentTarget.value = '';
                      }
                    }}
                  />
                </div>
              </div>

              {/* 意向产品 */}
              <div className="space-y-2">
                <label className="text-xs font-bold text-slate-700 uppercase tracking-widest ml-1">意向产品</label>
                <div className="flex flex-wrap gap-2 p-4 bg-slate-50 rounded-2xl min-h-[60px] border-2 border-slate-200">
                  {(formData.intentProducts || []).map((product, idx) => (
                    <span key={idx} className="px-3 py-1 bg-purple-50 border border-purple-200 rounded-xl text-[11px] font-bold flex gap-2 items-center shadow-sm text-purple-800">
                      {product}
                      <button onClick={() => {
                        const newProducts = [...formData.intentProducts];
                        newProducts.splice(idx, 1);
                        setFormData({...formData, intentProducts: newProducts});
                      }} className="hover:text-rose-600 transition-colors">
                        <X size={12} strokeWidth={3}/>
                      </button>
                    </span>
                  ))}
                  <input 
                    type="text" 
                    placeholder="添加意向产品..." 
                    className="bg-transparent outline-none text-sm flex-1 font-bold min-w-[150px] text-slate-900 placeholder:text-slate-400" 
                    onKeyDown={e => {
                      if (e.key === 'Enter' && e.currentTarget.value.trim()) {
                        const newProducts = [...(formData.intentProducts || []), e.currentTarget.value.trim()];
                        setFormData({...formData, intentProducts: newProducts});
                        e.currentTarget.value = '';
                      }
                    }}
                  />
                </div>
              </div>

              <div className="space-y-5 pt-6 border-t-2 border-slate-100">
                <div className="flex items-center justify-between px-2">
                  <div className="flex items-center gap-2 text-blue-700 font-bold text-sm uppercase tracking-wider"><Clock size={20} strokeWidth={2.5}/> 跟进历史</div>
                  <button 
                    onClick={() => setShowHistoryAdd(!showHistoryAdd)}
                    className="text-xs font-bold text-blue-700 hover:bg-blue-50 transition-all bg-white px-4 py-2 rounded-xl border-2 border-blue-200 shadow-sm active:scale-95 flex items-center gap-2"
                  >
                    <Plus size={16} strokeWidth={3}/> 新增记录
                  </button>
                </div>
                
                {showHistoryAdd && (
                  <div className="bg-blue-50/30 p-6 rounded-[1.5rem] border-2 border-blue-100 space-y-4 animate-in fade-in slide-in-from-top-2 duration-200 shadow-inner">
                    <input 
                      type="date" 
                      className="w-full px-5 py-3 rounded-2xl bg-white border-2 border-blue-100 text-sm font-bold text-slate-900 focus:border-blue-500 focus:ring-4 focus:ring-blue-500/5 outline-none" 
                      value={historyForm.date} 
                      onChange={e => setHistoryForm({...historyForm, date: e.target.value})} 
                    />
                    <textarea 
                      placeholder="记录本次沟通..." 
                      className="w-full p-5 bg-white border-2 border-blue-100 rounded-2xl text-base font-bold min-h-[100px] focus:border-blue-500 outline-none resize-none text-slate-900 shadow-sm" 
                      value={historyForm.content} 
                      onChange={e => setHistoryForm({...historyForm, content: e.target.value})}
                    />
                    <div className="flex justify-end gap-3 pt-2">
                      <button onClick={() => setShowHistoryAdd(false)} className="px-6 py-2 text-sm font-bold text-slate-500 hover:text-slate-800 transition-colors">取消</button>
                      <button onClick={handleAddHistory} className="px-10 py-3 bg-blue-600 text-white rounded-2xl text-sm font-bold shadow-lg shadow-blue-200/50 hover:bg-blue-700 active:scale-95 transition-all">确认保存</button>
                    </div>
                  </div>
                )}

                <div className="space-y-4">
                  {(formData.progressHistory || []).map((record) => (
                    <div key={record.id} className="p-5 bg-white rounded-3xl flex flex-col gap-3 border-2 border-slate-100 group relative hover:shadow-xl hover:border-blue-100 transition-all">
                      {editingHistoryId === record.id ? (
                        <div className="space-y-4 py-1">
                           <input 
                            type="date" 
                            className="w-full px-4 py-3 rounded-xl bg-slate-50 border-2 border-blue-100 text-sm font-bold text-slate-900" 
                            value={historyForm.date} 
                            onChange={e => setHistoryForm({...historyForm, date: e.target.value})} 
                          />
                          <textarea 
                            className="w-full p-4 bg-slate-50 border-2 border-blue-100 rounded-2xl text-base font-bold min-h-[80px] resize-none text-slate-900" 
                            value={historyForm.content} 
                            onChange={e => setHistoryForm({...historyForm, content: e.target.value})}
                          />
                          <div className="flex justify-end gap-4">
                             <button onClick={() => setEditingHistoryId(null)} className="text-sm font-bold text-slate-500">取消</button>
                             <button onClick={handleSaveEditHistory} className="text-sm font-bold text-blue-700 bg-blue-50 px-5 py-2 rounded-xl border-2 border-blue-100 active:scale-95 transition-all">保存修改</button>
                          </div>
                        </div>
                      ) : (
                        <>
                          <div className="flex justify-between items-center">
                            <span className="text-[10px] font-bold text-slate-500 uppercase tracking-widest bg-slate-100 px-3 py-1 rounded-lg border border-slate-200 shadow-inner">{record.date}</span>
                          </div>
                          <p className="text-base text-slate-900 leading-relaxed pr-14 font-bold">{record.content}</p>
                          <div className="absolute top-5 right-5 flex gap-2 opacity-0 group-hover:opacity-100 transition-all">
                             <button onClick={() => handleEditHistory(record.id)} className="p-2 text-slate-400 hover:text-blue-700 hover:bg-blue-50 rounded-xl transition-all border border-transparent hover:border-blue-100 shadow-sm"><Edit2 size={16}/></button>
                             <button onClick={() => handleDeleteHistory(record.id)} className="p-2 text-slate-400 hover:text-rose-700 hover:bg-rose-50 rounded-xl transition-all border border-transparent hover:border-rose-100 shadow-sm"><Trash2 size={16}/></button>
                          </div>
                        </>
                      )}
                    </div>
                  ))}
                </div>
              </div>

              <div className="flex flex-col sm:flex-row justify-end gap-3 sm:gap-5 pt-8 border-t-2 border-slate-100 sticky bottom-0 bg-white/95 backdrop-blur-md z-10 -mx-4 sm:-mx-8 px-4 sm:px-8 py-4 sm:py-5 w-full sm:w-auto sm:static">
                <button onClick={onClose} className="order-2 sm:order-1 px-8 py-3 sm:py-4 text-sm sm:text-base font-bold text-slate-500 hover:text-slate-900 hover:bg-slate-100 rounded-xl sm:rounded-2xl transition-all">放弃修改</button>
                <button onClick={handleManualSave} className="order-1 sm:order-2 px-14 py-3.5 sm:py-4 bg-emerald-600 text-white rounded-xl sm:rounded-2xl font-bold shadow-xl shadow-emerald-200 hover:bg-emerald-700 active:scale-95 transition-all text-base sm:text-lg">保存资料</button>
              </div>
            </div>
          )}

          {activeTab === 'ai' && !loading && extractedList.length === 0 && !extractedTableData && (
            <div onClick={() => excelFileInputRef.current?.click()} className="border-4 border-dashed border-emerald-200 rounded-[1.5rem] sm:rounded-[2.5rem] p-8 sm:p-20 flex flex-col items-center justify-center text-slate-400 hover:border-emerald-400 hover:bg-emerald-50/20 transition-all cursor-pointer min-h-[300px] sm:min-h-[400px] bg-slate-50/20 group">
              <div className="w-16 h-16 sm:w-24 sm:h-24 bg-white rounded-2xl flex items-center justify-center mb-6 sm:mb-8 shadow-xl border-2 border-slate-100 group-hover:border-emerald-200 transition-all duration-300"><FileSpreadsheet size={32} className="text-emerald-500 sm:w-12 sm:h-12" strokeWidth={3} /></div>
              <p className="font-bold text-slate-800 text-lg sm:text-2xl tracking-tight">上传 Excel 表格</p>
              <p className="text-xs sm:text-base text-slate-500 mt-3 sm:mt-4 font-bold text-center max-w-sm leading-relaxed">支持客户信息表和保单信息表，自动识别表头并去重合并。</p>
              <p className="text-xs text-slate-400 mt-2">支持 .xlsx, .xls 格式</p>
              <input type="file" ref={excelFileInputRef} className="hidden" accept=".xlsx,.xls" onChange={e => e.target.files?.[0] && processExcelFile(e.target.files[0])} />
            </div>
          )}

          {activeTab === 'table' && !loading && !extractedTableData && (
            <div onClick={() => tableFileInputRef.current?.click()} className="border-4 border-dashed border-indigo-200 rounded-[1.5rem] sm:rounded-[2.5rem] p-8 sm:p-20 flex flex-col items-center justify-center text-slate-400 hover:border-indigo-400 hover:bg-indigo-50/20 transition-all cursor-pointer min-h-[300px] sm:min-h-[400px] bg-slate-50/20 group">
              <div className="w-16 h-16 sm:w-24 sm:h-24 bg-white rounded-2xl flex items-center justify-center mb-6 sm:mb-8 shadow-xl border-2 border-slate-100 group-hover:border-indigo-200 transition-all duration-300"><FileSpreadsheet size={32} className="text-indigo-500 sm:w-12 sm:h-12" strokeWidth={3} /></div>
              <p className="font-bold text-slate-800 text-lg sm:text-2xl tracking-tight">上传保单/客户表截图</p>
              <p className="text-xs sm:text-base text-slate-500 mt-3 sm:mt-4 font-bold text-center max-w-sm leading-relaxed">AI 将自动识别表格类型（客户清单或保单明细）并提取数据。</p>
              <input type="file" ref={tableFileInputRef} className="hidden" accept="image/*" onChange={e => e.target.files?.[0] && processFile(e.target.files[0], 'table')} />
            </div>
          )}

          {loading && <div className="py-32 flex flex-col items-center justify-center"><div className="w-20 h-20 border-4 border-emerald-100 border-t-emerald-600 rounded-full animate-spin shadow-inner"></div><p className="mt-10 font-bold text-slate-800 text-2xl tracking-wide animate-pulse">{activeTab === 'ai' ? '正在解析 Excel 文件...' : 'AI 深度分析数据中...'}</p></div>}
          
          {extractedList.length > 0 && activeTab === 'ai' && (
            <div className="space-y-8 animate-in fade-in zoom-in-95 duration-500">
              <div className="flex items-center justify-between"><div className="font-bold text-slate-900 text-xl">成功识别 {extractedList.length} 位联系人</div><button onClick={() => setExtractedList([])} className="text-sm text-rose-700 font-bold hover:bg-rose-50 px-4 py-2 rounded-xl transition-colors">取消</button></div>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">{extractedList.map((c, i) => <div key={i} className="p-6 bg-white rounded-3xl flex gap-5 items-center border-2 border-slate-100 shadow-sm hover:border-emerald-300 transition-all group"><div className="w-14 h-14 bg-emerald-50 rounded-2xl flex items-center justify-center font-bold text-emerald-700 text-2xl border-2 border-emerald-100 transition-all">{c.remarkName?.[0]}</div><div className="flex-1 min-w-0"><div className="font-bold text-slate-900 text-lg leading-none truncate">{c.remarkName}</div><div className="text-xs text-slate-500 font-mono mt-2 bg-slate-100 w-fit px-2 py-0.5 rounded-md truncate">{c.wxid || '无微信号'}</div></div></div>)}</div>
              <button onClick={() => (onSave(extractedList), onClose())} className="w-full py-6 bg-emerald-600 text-white rounded-3xl font-bold shadow-xl shadow-emerald-200 hover:bg-emerald-700 active:scale-95 transition-all text-xl">确认并立即导入</button>
            </div>
          )}

          {extractedTableData && activeTab === 'table' && (
             <div className="space-y-8 animate-in fade-in zoom-in-95 duration-500">
                <div className="p-6 bg-indigo-50 border-2 border-indigo-100 rounded-3xl flex items-center gap-6">
                   <div className="w-16 h-16 bg-white rounded-2xl shadow-sm flex items-center justify-center text-indigo-600">
                      {extractedTableData.type === 'policy' ? <Shield size={32} /> : <UserCheck size={32} />}
                   </div>
                   <div>
                      <div className="text-xl font-bold text-indigo-900">
                         识别为：{extractedTableData.type === 'policy' ? '保单明细表' : '客户清单表'}
                      </div>
                      <div className="text-sm text-indigo-700 font-bold mt-1">
                         成功提取 {extractedTableData.items.length} 行有效数据
                      </div>
                   </div>
                   <button onClick={() => setExtractedTableData(null)} className="ml-auto text-xs font-bold text-indigo-400 hover:text-indigo-600">重新上传</button>
                </div>

                <div className="max-h-[300px] overflow-y-auto rounded-2xl border-2 border-slate-100 p-2 space-y-2 custom-scrollbar">
                   {extractedTableData.items.map((item, idx) => (
                      <div key={idx} className="p-4 bg-slate-50 rounded-xl text-sm border border-slate-100">
                         <div className="font-bold text-slate-800">
                            {extractedTableData.type === 'policy' 
                              ? `${item.productName || '未知产品'} (投保人: ${item.applicantName || '未知'})` 
                              : `客户: ${item.customerName || '未知'}`}
                         </div>
                         <div className="text-xs text-slate-400 mt-1 flex gap-4">
                            <span>{item.phoneNumber || '无号码'}</span>
                            {item.premium && <span>保费: ¥{item.premium}</span>}
                            {item.policyNumber && <span className="font-mono">{item.policyNumber}</span>}
                         </div>
                      </div>
                   ))}
                </div>

                <button 
                  onClick={handleTableConfirm} 
                  className="w-full py-6 bg-indigo-600 text-white rounded-3xl font-bold shadow-xl shadow-indigo-200 hover:bg-indigo-700 active:scale-95 transition-all text-xl"
                >
                  确认导入表格数据
                </button>
             </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default ImportModal;
