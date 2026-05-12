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
    followUpStatus: 'idle', policies: []
  });

  // 保单管理
  const [editingPolicyId, setEditingPolicyId] = useState<string | null>(null);
  const [policyForm, setPolicyForm] = useState<Partial<Policy>>({
    policyNumber: '', productName: '', company: '', premium: '',
    effectiveDate: '', status: '正式保单', applicant: '', insured: '',
    paymentYears: '', insuranceType: '', coverage: ''
  });
  const [showPolicyAdd, setShowPolicyAdd] = useState(false);

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
        setFormData({ wxid: '', nickname: '', remarkName: '', remarkInfo: '', tags: [], dealProducts: [], intentProducts: [], lastDate: new Date().toISOString().split('T')[0], progressHistory: [], followUpStatus: 'idle', policies: [] });
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
          setExtractedList(results.map(r => ({ ...r, wxid: r.wxid || '', nickname: r.nickname || '', remarkName: r.remarkName || '', remarkInfo: r.remarkInfo || '', tags: r.tags || [], dealProducts: r.dealProducts || [], intentProducts: r.intentProducts || [], lastDate: new Date().toISOString().split('T')[0], progressHistory: [], followUpStatus: 'idle', policies: [] })));
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
      const columns = Object.keys(firstRow).map(k => k.trim());

      let tableData: ExtractedTableData;

      const isPolicyTable = columns.some(c =>
        c.includes('保单号') || c.includes('产品名称') || c.includes('投保人') || c.includes('保费') || c.includes('保险公司')
      );

      const isCustomerTable = columns.some(c =>
        c.includes('客户姓名') || c.includes('证件号') || c.includes('手机号') || c.includes('地址') || c.includes('银行账号')
      );

      if (isPolicyTable || (!isCustomerTable && columns.includes('保单号'))) {
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
            paymentYears: getRowValue(row, '缴费年限', '缴费年限') || '',
            insuranceType: getRowValue(row, '险种类型', '险种类型') || '',
            coverage: getRowValue(row, '保额', '保额') || '',
          }))
        };
      } else if (isCustomerTable || columns.includes('客户姓名')) {
        const getRowValue = (row: any, ...keys: string[]) => {
          for (const key of keys) {
            if (row[key] !== undefined) return row[key];
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
        id: Math.random().toString(36).substr(2, 9),
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

  // 保单管理
  const handleAddPolicy = () => {
    if (policyForm.productName?.trim()) {
      const newPolicy: Policy = {
        id: Math.random().toString(36).substr(2, 9),
        policyNumber: policyForm.policyNumber || '',
        productName: policyForm.productName!.trim(),
        company: policyForm.company || '',
        premium: policyForm.premium || '',
        effectiveDate: policyForm.effectiveDate || '',
        status: policyForm.status || '正式保单',
        applicant: policyForm.applicant || '',
        insured: policyForm.insured || '',
        paymentYears: policyForm.paymentYears || '',
        insuranceType: policyForm.insuranceType || '',
        coverage: policyForm.coverage || ''
      };
      setFormData(prev => ({
        ...prev,
        dealProducts: [...(prev.dealProducts || []), newPolicy]
      }));
      setPolicyForm({ policyNumber: '', productName: '', company: '', premium: '', effectiveDate: '', status: '正式保单', applicant: '', insured: '', paymentYears: '', insuranceType: '', coverage: '' });
      setShowPolicyAdd(false);
    }
  };

  const handleEditPolicy = (id: string) => {
    const policy = formData.dealProducts?.find(p => p.id === id);
    if (policy) {
      setEditingPolicyId(id);
      setPolicyForm({ ...policy });
    }
  };

  const handleSaveEditPolicy = () => {
    if (editingPolicyId && policyForm.productName?.trim()) {
      setFormData(prev => ({
        ...prev,
        dealProducts: (prev.dealProducts || []).map(p =>
          p.id === editingPolicyId ? {
            ...p,
            policyNumber: policyForm.policyNumber || '',
            productName: policyForm.productName!.trim(),
            company: policyForm.company || '',
            premium: policyForm.premium || '',
            effectiveDate: policyForm.effectiveDate || '',
            status: policyForm.status || '正式保单',
            applicant: policyForm.applicant || '',
            insured: policyForm.insured || '',
            paymentYears: policyForm.paymentYears || '',
            insuranceType: policyForm.insuranceType || '',
            coverage: policyForm.coverage || ''
          } : p
        )
      }));
      setEditingPolicyId(null);
      setPolicyForm({ policyNumber: '', productName: '', company: '', premium: '', effectiveDate: '', status: '正式保单', applicant: '', insured: '', paymentYears: '', insuranceType: '', coverage: '' });
    }
  };

  const handleDeletePolicy = (id: string) => {
    setFormData(prev => ({
      ...prev,
      dealProducts: (prev.dealProducts || []).filter(p => p.id !== id)
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
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-gray-900/50 backdrop-blur-sm p-4 animate-fade-in">
      <div className="bg-white shadow-2xl w-full max-w-5xl overflow-hidden flex flex-col max-h-[90vh] rounded-2xl border border-slate-200">
        <div className="px-5 py-4 border-b border-slate-100 flex justify-between items-center">
          <h2 className="text-base font-semibold text-slate-800">{initialData ? '编辑联系人资料' : '添加联系人'}</h2>
          <button onClick={onClose} className="p-2 text-slate-400 hover:text-slate-600 hover:bg-slate-100 rounded-lg transition-all cursor-pointer">
            <X size={20} />
          </button>
        </div>
        {!initialData && (
          <div className="px-5 pt-4 pb-0 flex gap-2 overflow-x-auto">
            <button onClick={() => setActiveTab('ai')} className={`px-4 py-2 text-sm font-medium rounded-lg transition-all ${activeTab === 'ai' ? 'bg-primary-50 text-primary-700' : 'text-slate-500 hover:bg-slate-50'} cursor-pointer`}>Excel导入</button>
            <button onClick={() => setActiveTab('table')} className={`px-4 py-2 text-sm font-medium rounded-lg transition-all ${activeTab === 'table' ? 'bg-primary-50 text-primary-700' : 'text-slate-500 hover:bg-slate-50'} cursor-pointer`}>截图识别</button>
            <button onClick={() => setActiveTab('manual')} className={`px-4 py-2 text-sm font-medium rounded-lg transition-all ${activeTab === 'manual' ? 'bg-primary-50 text-primary-700' : 'text-slate-500 hover:bg-slate-50'} cursor-pointer`}>手动录入</button>
          </div>
        )}
        <div className="flex-1 overflow-y-auto p-5 space-y-4">
          {error && <div className="p-4 bg-red-50 text-red-700 rounded-xl flex gap-2 text-sm border border-red-100"><AlertCircle size={18} />{error}</div>}

          {activeTab === 'manual' && (
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              {/* 左侧：基础信息 */}
              <div className="space-y-4">
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-1.5">
                    <label className="text-xs font-medium text-gray-700">备注名*</label>
                    <input type="text" className="input" value={formData.remarkName} onChange={e => setFormData({...formData, remarkName: e.target.value})} placeholder="请输入备注名" />
                  </div>
                  <div className="space-y-1.5">
                    <label className="text-xs font-medium text-gray-700">昵称</label>
                    <input type="text" className="input" value={formData.nickname} onChange={e => setFormData({...formData, nickname: e.target.value})} placeholder="请输入昵称" />
                  </div>
                  <div className="space-y-1.5">
                    <label className="text-xs font-medium text-gray-700">微信号</label>
                    <input type="text" className="input font-mono" value={formData.wxid} onChange={e => setFormData({...formData, wxid: e.target.value})} placeholder="请输入微信号" />
                  </div>
                  <div className="space-y-1.5">
                    <label className="text-xs font-medium text-gray-700">手机号</label>
                    <input type="text" className="input font-mono" value={formData.phoneNumber || ''} onChange={e => setFormData({...formData, phoneNumber: e.target.value})} placeholder="请输入手机号" />
                  </div>
                </div>

                <div className="space-y-1.5 relative" ref={tagInputContainerRef}>
                  <label className="text-xs font-medium text-gray-700">标签管理</label>
                  <div
                    className={`flex flex-wrap gap-2 p-3 min-h-[50px] border rounded-lg transition-all ${showTagSuggestions ? 'border-gray-900 ring-1 ring-gray-900/10' : 'border-gray-200'}`}
                    onClick={() => setShowTagSuggestions(true)}
                  >
                    {formData.tags.map(t => <span key={t} className="inline-flex items-center gap-1 px-2.5 py-1 bg-gray-100 border border-gray-200 rounded-full text-xs font-medium text-gray-700">{t}<button onClick={(e) => { e.stopPropagation(); setFormData({...formData, tags: formData.tags.filter(x => x !== t)}); }} className="hover:text-gray-900 transition-colors"><X size={10} strokeWidth={3}/></button></span>)}
                    <input
                      type="text"
                      placeholder="输入标签..."
                      className="bg-transparent outline-none text-sm flex-1 min-w-[120px] text-gray-900 placeholder:text-gray-400"
                      value={tagInput}
                      onChange={e => { setTagInput(e.target.value); setShowTagSuggestions(true); }}
                      onFocus={() => setShowTagSuggestions(true)}
                      onKeyDown={e => e.key === 'Enter' && (addTag(tagInput))}
                    />
                  </div>
                  {showTagSuggestions && (tagSuggestions.length > 0 || tagInput.trim()) && (
                    <div className="absolute top-full left-0 right-0 mt-2 bg-white rounded-lg shadow-lg border border-gray-200 z-50 overflow-hidden max-h-48 overflow-y-auto">
                      {tagSuggestions.map(tag => (
                        <button key={tag} onClick={() => addTag(tag)} className="w-full text-left px-4 py-2 text-sm text-gray-700 hover:bg-gray-100 hover:text-gray-900 transition-colors cursor-pointer flex items-center justify-between">
                          <span>{tag}</span>
                          <Tag size={14} className="text-gray-300" />
                        </button>
                      ))}
                      {tagInput.trim() && !tagSuggestions.includes(tagInput.trim()) && !formData.tags.includes(tagInput.trim()) && (
                         <button onClick={() => addTag(tagInput)} className="w-full text-left px-4 py-2 text-sm text-gray-900 bg-gray-50 hover:bg-gray-100 transition-colors flex items-center gap-2 cursor-pointer">
                           <Plus size={14} />
                           <span>新增标签："{tagInput}"</span>
                         </button>
                      )}
                    </div>
                  )}
                </div>

                <div className="space-y-1.5">
                  <label className="text-xs font-medium text-gray-700">详细描述</label>
                  <textarea className="input min-h-[80px] resize-none" placeholder="输入相关业务描述..." value={formData.remarkInfo} onChange={e => setFormData({...formData, remarkInfo: e.target.value})} />
                </div>

                {/* 成交产品 - 保单表格 */}
                <div className="space-y-2">
                  <div className="flex items-center justify-between">
                    <label className="text-xs font-medium text-gray-700">成交产品</label>
                    <button
                      onClick={() => setShowPolicyAdd(!showPolicyAdd)}
                      className="text-xs font-medium text-primary-600 hover:bg-primary-50 px-3 py-1.5 rounded-lg transition-colors cursor-pointer flex items-center gap-1"
                    >
                      <Plus size={14} /> 添加保单
                    </button>
                  </div>

                  {showPolicyAdd && (
                    <div className="p-4 bg-gray-50 rounded-lg space-y-3 border border-gray-200">
                      <div className="grid grid-cols-2 gap-3">
                        <div className="space-y-1">
                          <label className="text-[10px] text-gray-500">产品名称*</label>
                          <input
                            type="text"
                            className="input text-xs py-1.5"
                            value={policyForm.productName || ''}
                            onChange={e => setPolicyForm({...policyForm, productName: e.target.value})}
                            placeholder="产品名称"
                          />
                        </div>
                        <div className="space-y-1">
                          <label className="text-[10px] text-gray-500">保险公司</label>
                          <input
                            type="text"
                            className="input text-xs py-1.5"
                            value={policyForm.company || ''}
                            onChange={e => setPolicyForm({...policyForm, company: e.target.value})}
                            placeholder="保险公司"
                          />
                        </div>
                        <div className="space-y-1">
                          <label className="text-[10px] text-gray-500">保单号</label>
                          <input
                            type="text"
                            className="input text-xs py-1.5 font-mono"
                            value={policyForm.policyNumber || ''}
                            onChange={e => setPolicyForm({...policyForm, policyNumber: e.target.value})}
                            placeholder="保单号"
                          />
                        </div>
                        <div className="space-y-1">
                          <label className="text-[10px] text-gray-500">保费</label>
                          <input
                            type="text"
                            className="input text-xs py-1.5"
                            value={policyForm.premium || ''}
                            onChange={e => setPolicyForm({...policyForm, premium: e.target.value})}
                            placeholder="保费金额"
                          />
                        </div>
                        <div className="space-y-1">
                          <label className="text-[10px] text-gray-500">生效日期</label>
                          <input
                            type="date"
                            className="input text-xs py-1.5"
                            value={policyForm.effectiveDate || ''}
                            onChange={e => setPolicyForm({...policyForm, effectiveDate: e.target.value})}
                          />
                        </div>
                        <div className="space-y-1">
                          <label className="text-[10px] text-gray-500">状态</label>
                          <select
                            className="input text-xs py-1.5"
                            value={policyForm.status || '正式保单'}
                            onChange={e => setPolicyForm({...policyForm, status: e.target.value})}
                          >
                            <option value="正式保单">正式保单</option>
                            <option value="待生效">待生效</option>
                            <option value="已失效">已失效</option>
                            <option value="已退保">已退保</option>
                          </select>
                        </div>
                        <div className="space-y-1">
                          <label className="text-[10px] text-gray-500">投保人</label>
                          <input
                            type="text"
                            className="input text-xs py-1.5"
                            value={policyForm.applicant || ''}
                            onChange={e => setPolicyForm({...policyForm, applicant: e.target.value})}
                            placeholder="投保人"
                          />
                        </div>
                        <div className="space-y-1">
                          <label className="text-[10px] text-gray-500">被保人</label>
                          <input
                            type="text"
                            className="input text-xs py-1.5"
                            value={policyForm.insured || ''}
                            onChange={e => setPolicyForm({...policyForm, insured: e.target.value})}
                            placeholder="被保人"
                          />
                        </div>
                      </div>
                      <div className="flex justify-end gap-2">
                        <button onClick={() => { setShowPolicyAdd(false); setPolicyForm({ policyNumber: '', productName: '', company: '', premium: '', effectiveDate: '', status: '正式保单', applicant: '', insured: '', paymentYears: '', insuranceType: '', coverage: '' }); }} className="px-3 py-1.5 text-xs text-gray-500 hover:text-gray-700">取消</button>
                        <button onClick={handleAddPolicy} disabled={!policyForm.productName?.trim()} className="btn btn-primary text-xs py-1.5 disabled:opacity-50">确认添加</button>
                      </div>
                    </div>
                  )}

                  {/* 保单列表 */}
                  {(formData.dealProducts || []).length > 0 ? (
                    <div className="border border-gray-200 rounded-lg overflow-hidden">
                      <table className="w-full text-xs">
                        <thead className="bg-gray-50 border-b border-gray-200">
                          <tr>
                            <th className="text-left px-3 py-2 font-medium text-gray-600">产品名称</th>
                            <th className="text-left px-3 py-2 font-medium text-gray-600">公司</th>
                            <th className="text-left px-3 py-2 font-medium text-gray-600">保费</th>
                            <th className="text-left px-3 py-2 font-medium text-gray-600">状态</th>
                            <th className="text-left px-3 py-2 font-medium text-gray-600">生效日期</th>
                            <th className="text-right px-3 py-2 font-medium text-gray-600">操作</th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-gray-100">
                          {(formData.dealProducts || []).map(policy => (
                            <tr key={policy.id} className="hover:bg-gray-50">
                              {editingPolicyId === policy.id ? (
                                <>
                                  <td className="px-3 py-2"><input className="input text-xs py-1 w-full" value={policyForm.productName} onChange={e => setPolicyForm({...policyForm, productName: e.target.value})} /></td>
                                  <td className="px-3 py-2"><input className="input text-xs py-1 w-full" value={policyForm.company} onChange={e => setPolicyForm({...policyForm, company: e.target.value})} /></td>
                                  <td className="px-3 py-2"><input className="input text-xs py-1 w-20" value={policyForm.premium} onChange={e => setPolicyForm({...policyForm, premium: e.target.value})} /></td>
                                  <td className="px-3 py-2">
                                    <select className="input text-xs py-1 w-24" value={policyForm.status} onChange={e => setPolicyForm({...policyForm, status: e.target.value})}>
                                      <option value="正式保单">正式保单</option>
                                      <option value="待生效">待生效</option>
                                      <option value="已失效">已失效</option>
                                      <option value="已退保">已退保</option>
                                    </select>
                                  </td>
                                  <td className="px-3 py-2"><input type="date" className="input text-xs py-1 w-28" value={policyForm.effectiveDate} onChange={e => setPolicyForm({...policyForm, effectiveDate: e.target.value})} /></td>
                                  <td className="px-3 py-2 text-right">
                                    <button onClick={handleSaveEditPolicy} className="text-primary-600 hover:bg-primary-50 px-2 py-1 rounded text-xs">保存</button>
                                    <button onClick={() => { setEditingPolicyId(null); }} className="text-gray-500 hover:bg-gray-100 px-2 py-1 rounded text-xs ml-1">取消</button>
                                  </td>
                                </>
                              ) : (
                                <>
                                  <td className="px-3 py-2 font-medium text-gray-800">{policy.productName}</td>
                                  <td className="px-3 py-2 text-gray-600">{policy.company || '-'}</td>
                                  <td className="px-3 py-2 text-gray-600">{policy.premium ? `¥${policy.premium}` : '-'}</td>
                                  <td className="px-3 py-2">
                                    <span className={`px-2 py-0.5 rounded text-[10px] font-medium ${
                                      policy.status === '正式保单' ? 'bg-green-100 text-green-700' :
                                      policy.status === '待生效' ? 'bg-amber-100 text-amber-700' :
                                      'bg-gray-100 text-gray-600'
                                    }`}>{policy.status || '正式保单'}</span>
                                  </td>
                                  <td className="px-3 py-2 text-gray-500">{policy.effectiveDate || '-'}</td>
                                  <td className="px-3 py-2 text-right">
                                    <button onClick={() => handleEditPolicy(policy.id)} className="text-gray-400 hover:text-gray-600 hover:bg-gray-100 p-1 rounded"><Edit2 size={12} /></button>
                                    <button onClick={() => handleDeletePolicy(policy.id)} className="text-gray-400 hover:text-red-500 hover:bg-red-50 p-1 rounded ml-1"><Trash2 size={12} /></button>
                                  </td>
                                </>
                              )}
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  ) : (
                    <div className="text-center py-6 text-gray-400 text-xs border border-dashed border-gray-200 rounded-lg">
                      暂无成交保单
                    </div>
                  )}
                </div>

                <div className="space-y-1.5">
                  <label className="text-xs font-medium text-gray-700">意向产品</label>
                  <div className="flex flex-wrap gap-2 p-3 min-h-[50px] border border-gray-200 rounded-lg">
                    {(formData.intentProducts || []).map((product, idx) => (
                      <span key={idx} className="inline-flex items-center gap-1 px-2.5 py-1 bg-blue-50 border border-blue-100 rounded-full text-xs font-medium text-blue-700">
                        {product}
                        <button onClick={() => { const newProducts = [...formData.intentProducts]; newProducts.splice(idx, 1); setFormData({...formData, intentProducts: newProducts}); }} className="hover:text-red-600 transition-colors"><X size={10} strokeWidth={3}/></button>
                      </span>
                    ))}
                    <input
                      type="text"
                      placeholder="添加意向产品..."
                      className="bg-transparent outline-none text-sm flex-1 min-w-[120px] text-gray-900 placeholder:text-gray-400"
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
              </div>

              {/* 右侧：跟进状态和历史 */}
              <div className="space-y-3 border-t lg:border-t-0 lg:border-l border-gray-100 lg:pl-6 pt-4 lg:pt-0">
                {/* 跟进状态 */}
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2 text-sm font-medium text-gray-700">
                    <Clock size={16} strokeWidth={2}/> 跟进状态
                  </div>
                  <div className="flex items-center gap-1.5">
                    <button
                      type="button"
                      onClick={() => setFormData({...formData, followUpStatus: 'following'})}
                      className={`px-3 py-1.5 rounded-md text-xs font-medium transition-all ${
                        formData.followUpStatus === 'following'
                          ? 'bg-gray-900 text-white'
                          : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                      }`}
                    >
                      跟进中
                    </button>
                    <button
                      type="button"
                      onClick={() => setFormData({...formData, followUpStatus: 'idle'})}
                      className={`px-3 py-1.5 rounded-md text-xs font-medium transition-all ${
                        !formData.followUpStatus || formData.followUpStatus === 'idle'
                          ? 'bg-gray-900 text-white'
                          : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                      }`}
                    >
                      暂未跟进
                    </button>
                  </div>
                </div>

                {/* 跟进历史 */}
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2 text-sm font-medium text-gray-700"><Clock size={16} strokeWidth={2}/> 跟进历史</div>
                  <button
                    onClick={() => setShowHistoryAdd(!showHistoryAdd)}
                    className="text-xs font-medium text-primary-600 hover:bg-primary-50 px-3 py-1.5 rounded-lg transition-colors cursor-pointer flex items-center gap-1"
                  >
                    <Plus size={14} /> 新增记录
                  </button>
                </div>

                {showHistoryAdd && (
                  <div className="p-4 bg-gray-50 rounded-lg space-y-3 animate-fade-in">
                    <input
                      type="date"
                      className="input"
                      value={historyForm.date}
                      onChange={e => setHistoryForm({...historyForm, date: e.target.value})}
                    />
                    <textarea
                      placeholder="记录本次沟通..."
                      className="input min-h-[80px] resize-none"
                      value={historyForm.content}
                      onChange={e => setHistoryForm({...historyForm, content: e.target.value})}
                    />
                    <div className="flex justify-end gap-2">
                      <button onClick={() => setShowHistoryAdd(false)} className="px-4 py-2 text-sm text-gray-500 hover:text-gray-700 transition-colors">取消</button>
                      <button onClick={handleAddHistory} className="btn btn-primary text-sm">确认保存</button>
                    </div>
                  </div>
                )}

                <div className="space-y-2 max-h-[300px] overflow-y-auto pr-1">
                  {[...(formData.progressHistory || [])].sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime()).map((record) => (
                    <div key={record.id} className="p-4 bg-white border border-gray-200 rounded-lg group relative hover:border-gray-300 transition-all">
                      {editingHistoryId === record.id ? (
                        <div className="space-y-3 py-1">
                           <input
                            type="date"
                            className="input"
                            value={historyForm.date}
                            onChange={e => setHistoryForm({...historyForm, date: e.target.value})}
                          />
                          <textarea
                            className="input min-h-[70px] resize-none"
                            value={historyForm.content}
                            onChange={e => setHistoryForm({...historyForm, content: e.target.value})}
                          />
                          <div className="flex justify-end gap-2">
                             <button onClick={() => setEditingHistoryId(null)} className="text-sm text-gray-500">取消</button>
                             <button onClick={handleSaveEditHistory} className="btn btn-primary text-sm">保存修改</button>
                          </div>
                        </div>
                      ) : (
                        <>
                          <div className="flex justify-between items-center">
                            <span className="text-xs font-medium text-gray-500 bg-gray-100 px-2 py-0.5 rounded">{record.date}</span>
                          </div>
                          <p className="text-sm text-gray-800 mt-2 leading-relaxed pr-8">{record.content}</p>
                          <div className="absolute top-4 right-4 flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                             <button onClick={() => handleEditHistory(record.id)} className="p-1.5 text-gray-400 hover:text-primary-600 hover:bg-primary-50 rounded transition-colors cursor-pointer"><Edit2 size={14}/></button>
                             <button onClick={() => handleDeleteHistory(record.id)} className="p-1.5 text-gray-400 hover:text-red-600 hover:bg-red-50 rounded transition-colors cursor-pointer"><Trash2 size={14}/></button>
                          </div>
                        </>
                      )}
                    </div>
                  ))}
                </div>
              </div>
            </div>
          )}

          {activeTab === 'ai' && !loading && extractedList.length === 0 && !extractedTableData && (
            <div onClick={() => excelFileInputRef.current?.click()} className="border-2 border-dashed border-gray-200 rounded-xl p-12 flex flex-col items-center justify-center text-gray-400 hover:border-gray-400 hover:bg-gray-50/20 transition-all cursor-pointer min-h-[280px]">
              <div className="w-16 h-16 bg-gray-50 rounded-xl flex items-center justify-center mb-4"><FileSpreadsheet size={28} className="text-gray-300" strokeWidth={2} /></div>
              <p className="font-medium text-gray-700 text-lg">上传 Excel 表格</p>
              <p className="text-sm text-gray-500 mt-2 text-center max-w-sm">支持客户信息表和保单信息表，自动识别表头并去重合并。</p>
              <p className="text-xs text-gray-400 mt-1">支持 .xlsx, .xls 格式</p>
              <input type="file" ref={excelFileInputRef} className="hidden" accept=".xlsx,.xls" onChange={e => e.target.files?.[0] && processExcelFile(e.target.files[0])} />
            </div>
          )}

          {activeTab === 'table' && !loading && !extractedTableData && (
            <div onClick={() => tableFileInputRef.current?.click()} className="border-2 border-dashed border-gray-200 rounded-xl p-12 flex flex-col items-center justify-center text-gray-400 hover:border-gray-400 hover:bg-gray-50/20 transition-all cursor-pointer min-h-[280px]">
              <div className="w-16 h-16 bg-gray-50 rounded-xl flex items-center justify-center mb-4"><FileSpreadsheet size={28} className="text-gray-300" strokeWidth={2} /></div>
              <p className="font-medium text-gray-700 text-lg">上传保单/客户表截图</p>
              <p className="text-sm text-gray-500 mt-2 text-center max-w-sm">AI 将自动识别表格类型并提取数据。</p>
              <input type="file" ref={tableFileInputRef} className="hidden" accept="image/*" onChange={e => e.target.files?.[0] && processFile(e.target.files[0], 'table')} />
            </div>
          )}

          {loading && <div className="py-24 flex flex-col items-center justify-center"><div className="w-12 h-12 border-4 border-gray-200 border-t-primary-600 rounded-full animate-spin"></div><p className="mt-4 text-gray-600 font-medium">{activeTab === 'ai' ? '正在解析 Excel 文件...' : 'AI 深度分析数据中...'}</p></div>}

          {extractedList.length > 0 && activeTab === 'ai' && (
            <div className="space-y-4 animate-fade-in">
              <div className="flex items-center justify-between"><div className="font-medium text-gray-900">成功识别 {extractedList.length} 位联系人</div><button onClick={() => setExtractedList([])} className="text-sm text-gray-500 hover:text-gray-700 px-3 py-1.5 rounded-lg hover:bg-gray-100 transition-colors">取消</button></div>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">{extractedList.map((c, i) => <div key={i} className="p-4 bg-gray-50 rounded-lg flex gap-3 items-center border border-gray-100"><div className="w-10 h-10 bg-primary-50 rounded-lg flex items-center justify-center font-medium text-primary-700 text-lg">{c.remarkName?.[0]}</div><div className="flex-1 min-w-0"><div className="font-medium text-gray-900 truncate">{c.remarkName}</div><div className="text-xs text-gray-500 font-mono mt-0.5">{c.wxid || '无微信号'}</div></div></div>)}</div>
              <button onClick={() => (onSave(extractedList), onClose())} className="w-full btn btn-primary">确认并立即导入</button>
            </div>
          )}

          {extractedTableData && activeTab === 'table' && (
             <div className="space-y-4 animate-fade-in">
               <div className="p-4 bg-primary-50 border border-primary-100 rounded-lg flex items-center gap-4">
                  <div className="w-12 h-12 bg-white rounded-lg shadow-sm flex items-center justify-center text-primary-600">
                     {extractedTableData.type === 'policy' ? <Shield size={24} /> : <UserCheck size={24} />}
                  </div>
                  <div>
                     <div className="font-medium text-gray-900">识别为：{extractedTableData.type === 'policy' ? '保单明细表' : '客户清单表'}</div>
                     <div className="text-sm text-gray-600">成功提取 {extractedTableData.items.length} 行有效数据</div>
                  </div>
                  <button onClick={() => setExtractedTableData(null)} className="ml-auto text-xs text-gray-400 hover:text-gray-600 cursor-pointer">重新上传</button>
               </div>

               <div className="max-h-[280px] overflow-y-auto rounded-lg border border-gray-200 p-2 space-y-2">
                  {extractedTableData.items.map((item, idx) => (
                     <div key={idx} className="p-3 bg-gray-50 rounded-lg text-sm border border-gray-100">
                        <div className="font-medium text-gray-800">
                           {extractedTableData.type === 'policy'
                             ? `${item.productName || '未知产品'} (投保人: ${item.applicantName || '未知'})`
                             : `客户: ${item.customerName || '未知'}`}
                        </div>
                        <div className="text-xs text-gray-500 mt-1 flex gap-3">
                           <span>{item.phoneNumber || '无号码'}</span>
                           {item.premium && <span>保费: ¥{item.premium}</span>}
                        </div>
                     </div>
                  ))}
               </div>

                <button
                  onClick={handleTableConfirm}
                  className="w-full btn btn-primary"
                >
                  确认导入表格数据
                </button>
             </div>
           )}
         </div>

         {/* 底部操作区 - 仅在手动录入时显示 */}
         {(activeTab === 'manual' || initialData) && (
           <div className="px-5 py-4 border-t border-gray-100 bg-white flex justify-end gap-2 shrink-0">
             <button onClick={onClose} className="btn btn-secondary text-xs py-2">取消</button>
             <button onClick={handleManualSave} className="btn btn-primary text-xs py-2">保存</button>
           </div>
         )}
       </div>
     </div>
   );
 };

export default ImportModal;
