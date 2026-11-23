import Button, {IconButton} from './ui/Button';
import WorkspaceDialog,{WorkspaceDialogFooter} from './WorkspaceDialog';
import Field from './ui/Field';
import Input, {Textarea} from './ui/Input';
import Select from './ui/Select';
import {readPolicyNumber} from '../services/policyIdentity';
import {excludedPolicyImport,mingyaStatusLabel} from '../services/policyImportRules';
import PolicyStatus from './PolicyStatus';
import {formatMoney} from './PolicyPaymentSummary';
import React, { useState, useRef, useEffect, useMemo } from 'react';
import { X, Upload, Check, AlertCircle, Plus, FileSpreadsheet, ShoppingBag, Trash2, Sparkles, Shield, Clock, Tag, Edit2, FileText, UserCheck } from 'lucide-react';
import { extractContactsFromMedia, extractTableFromMedia } from '../services/geminiService';
import { NewContact, Contact, ProgressRecord, ExtractedTableData, Policy, ExcelCustomerRow, ExcelPolicyRow } from '../types';
import * as XLSX from 'xlsx';
import { mergePolicies } from '../services/renewal';

interface ImportModalProps {
  isOpen: boolean;
  onMingyaImport?: () => void;
  onPolicyImport?: (files: FileList) => void;
  relatedPolicies?: Policy[];
  onPolicyDetail?: (p: Policy) => void;
  onManagePolicies?: (contactId:string)=>void;
  onClose: () => void;
  onSave: (contacts: NewContact[],requestId?:string) => Promise<void>;
  onPersistFollowup?: (contactId:string,kind:'add'|'edit'|'delete',record:ProgressRecord,expected?:ProgressRecord)=>Promise<Contact>;
  onTableSave?: (data: ExtractedTableData) => void;
  initialData?: Contact | null;
  allTags?: string[];
}

const ImportModal: React.FC<ImportModalProps> = ({ isOpen, onMingyaImport, onPolicyImport, onClose, onSave, onPersistFollowup, onTableSave, initialData, allTags = [], relatedPolicies = [], onPolicyDetail, onManagePolicies }) => {
  const [historyBusy,setHistoryBusy]=useState(false),[profileBusy,setProfileBusy]=useState(false),[historyError,setHistoryError]=useState(''),[historySaved,setHistorySaved]=useState('');
  const historyBusyRef=useRef(false),historyRequestId=useRef(crypto.randomUUID()),profileRequestId=useRef(crypto.randomUUID());
  const displayedPolicies = () => mergePolicies([...(formData.policies || []), ...relatedPolicies].map(p=>({...p,payments:(p as any).payments||[]})),[]).filter(p=>!excludedPolicyImport(p.status));
  const profileBaseline=useRef<NewContact|null>(null);
  const [activeTab, setActiveTab] = useState<'manual' | 'ai' | 'table' | 'policies'>('ai');
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
      profileRequestId.current=crypto.randomUUID();historyRequestId.current=crypto.randomUUID();setHistoryError('');setHistorySaved('');
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
      profileBaseline.current=initialData?{...initialData,policies:initialData.policies||[],progressHistory:initialData.progressHistory||[]}:null;
      setShowPolicyAdd(false);setEditingPolicyId(null);setPolicyForm({policyNumber:'',productName:'',company:'',premium:'',effectiveDate:'',status:'正式保单',applicant:'',insured:'',paymentYears:'',insuranceType:'',coverage:''});
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
            policyNumber: readPolicyNumber(getRowValue(row, '保单号', '保单号')),
            productName: getRowValue(row, '产品名称', '产品名称') || '',
            company: getRowValue(row, '保险公司', '保险公司') || '',
            premium: String(getRowValue(row, '保费', '保费') || '0'),
            effectiveDate: getRowValue(row, '生效日期', '生效日期') ? formatDate(getRowValue(row, '生效日期', '生效日期')) : '',
            status: getRowValue(row, '保单状态', '状态') || (getRowValue(row,'保单状态代码')?mingyaStatusLabel(getRowValue(row,'保单状态代码')):'有效'),
            applicantName: getRowValue(row, '投保人姓名', '投保人姓名') || '',
            insuredName: getRowValue(row, '被保人', '被保人') || '',
            phoneNumber: getRowValue(row, '手机号', '手机号') || '',
            idCard: getRowValue(row, '证件号', '证件号') || '',
            paymentYears: getRowValue(row, '缴费年限', '缴费年限') || '',
            insuranceType: getRowValue(row, '险种类型', '险种类型') || '',
            coverage: getRowValue(row, '保额', '保额') || '',
          })).filter(item=>!excludedPolicyImport(item.status))
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

  const handleManualSave = async () => {
    if(profileBusy||historyBusy)return;
    if (!formData.remarkName && !formData.nickname) { setError("请填写姓名或昵称"); return; }
    if(historyForm.content?.trim()){setError('还有未保存的跟进内容，请先保存或取消该条记录。');return;}
    setProfileBusy(true);setError(null);
    try{await onSave([formData],profileRequestId.current);onClose();}catch(e){setError(e instanceof Error?e.message:'客户资料未保存，请重试。');}finally{setProfileBusy(false);}
  };
  const canLeave=()=>{
    if(historyBusy||profileBusy)return false;
    const dirty=historyForm.content?.trim()||(showPolicyAdd&&Object.entries(policyForm).some(([k,v])=>k==='status'?v!=='正式保单':Boolean(String(v||'').trim())))||editingPolicyId||(initialData&&profileBaseline.current&&JSON.stringify(formData)!==JSON.stringify(profileBaseline.current));
    return !dirty||window.confirm('有尚未保存的资料，确认放弃并离开？');
  };
  const requestClose=()=>{if(canLeave())onClose();};
  const managePolicies=()=>{if(initialData&&canLeave())onManagePolicies?.(initialData.id);};

  const addTag = (tag: string) => {
    const trimmed = tag.trim();
    if (trimmed && !formData.tags.includes(trimmed)) {
      setFormData({ ...formData, tags: [...formData.tags, trimmed] });
    }
    setTagInput('');
    setShowTagSuggestions(false);
  };

  const persistHistory = async (kind:'add'|'edit'|'delete',record:ProgressRecord,expected?:ProgressRecord) => {
    if(historyBusyRef.current)return false;
    historyBusyRef.current=true;setHistoryBusy(true);setHistoryError('');setHistorySaved('');
    try{
      if(initialData&&onPersistFollowup){
        const saved=await onPersistFollowup(initialData.id,kind,record,expected);
        setFormData(prev=>({...prev,progressHistory:saved.progressHistory,lastDate:saved.lastDate,followUpStatus:saved.followUpStatus}));
        if(profileBaseline.current)profileBaseline.current={...profileBaseline.current,progressHistory:saved.progressHistory,lastDate:saved.lastDate,followUpStatus:saved.followUpStatus};
      }else{
        setFormData(prev=>({...prev,progressHistory:kind==='add'?[record,...(prev.progressHistory||[])]:kind==='delete'?(prev.progressHistory||[]).filter(r=>r.id!==record.id):(prev.progressHistory||[]).map(r=>r.id===record.id?record:r),lastDate:record.date}));
      }
      setHistorySaved(initialData?'跟进记录已保存到数据库。':'记录已加入草稿，保存客户后写入数据库。');
      return true;
    }catch(e){setHistoryError(e instanceof Error?e.message:'跟进记录未保存，请重试。');return false;}
    finally{historyBusyRef.current=false;setHistoryBusy(false);}
  };
  const handleAddHistory = async () => {
    if(!historyForm.content?.trim())return;
    const record:ProgressRecord={id:historyRequestId.current,date:historyForm.date||new Date().toISOString().slice(0,10),content:historyForm.content.trim(),completed:false};
    if(await persistHistory('add',record)){historyRequestId.current=crypto.randomUUID();setHistoryForm({date:new Date().toISOString().slice(0,10),content:''});setShowHistoryAdd(false);}
  };
  const handleEditHistory = (id:string) => {
    const record=formData.progressHistory?.find(r=>r.id===id);if(record){setEditingHistoryId(id);setHistoryForm({...record});}
  };
  const handleSaveEditHistory = async () => {
    const previous=formData.progressHistory?.find(r=>r.id===editingHistoryId);if(!previous||!historyForm.content?.trim())return;
    if(await persistHistory('edit',{...previous,date:historyForm.date!,content:historyForm.content.trim()},previous)){setEditingHistoryId(null);setHistoryForm({date:new Date().toISOString().slice(0,10),content:''});}
  };
  const handleDeleteHistory = async (id:string) => {const record=formData.progressHistory?.find(r=>r.id===id);if(record)await persistHistory('delete',record,record);};

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
        policies: [...(prev.policies || []), newPolicy],
        dealProducts: Array.from(new Set([...(prev.dealProducts || []), newPolicy.productName]))
      }));
      setPolicyForm({ policyNumber: '', productName: '', company: '', premium: '', effectiveDate: '', status: '正式保单', applicant: '', insured: '', paymentYears: '', insuranceType: '', coverage: '' });
      setShowPolicyAdd(false);
    }
  };

  const handleEditPolicy = (id: string) => {
    const policy = formData.policies?.find(p => p.id === id);
    if (policy) {
      setEditingPolicyId(id);
      setPolicyForm({ ...policy });
    }
  };

  const handleSaveEditPolicy = () => {
    if (editingPolicyId && policyForm.productName?.trim()) {
      setFormData(prev => {
        const oldName = prev.policies?.find(p => p.id === editingPolicyId)?.productName;
        const policies = (prev.policies || []).map(p =>
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
        );
        const productNames = (prev.dealProducts || []).filter(name => name !== oldName || policies.some(p => p.productName === name));
        return {
          ...prev,
          policies,
          dealProducts: Array.from(new Set([...productNames, policyForm.productName!.trim()]))
        };
      });
      setEditingPolicyId(null);
      setPolicyForm({ policyNumber: '', productName: '', company: '', premium: '', effectiveDate: '', status: '正式保单', applicant: '', insured: '', paymentYears: '', insuranceType: '', coverage: '' });
    }
  };

  const handleDeletePolicy = (id: string) => {
    setFormData(prev => {
      const deletedName = prev.policies?.find(p => p.id === id)?.productName;
      const policies = (prev.policies || []).filter(p => p.id !== id);
      return {
        ...prev,
        policies,
        dealProducts: (prev.dealProducts || []).filter(name => name !== deletedName || policies.some(p => p.productName === name))
      };
    });
  };

  const handleTableConfirm = () => {
    if (extractedTableData && onTableSave) {
      onTableSave(extractedTableData);
      onClose();
    }
  };

  if (!isOpen) return null;

  return (
    <WorkspaceDialog title={initialData?'编辑联系人资料':'添加 / 导入'} size={!initialData&&activeTab==='policies'?'import':'contact'} onClose={requestClose} closeDisabled={profileBusy||historyBusy} bodyClassName="min-h-0 flex flex-1 flex-col overflow-hidden">
        {!initialData && (
          <div className="px-5 pt-4 pb-0 flex shrink-0 gap-2 overflow-x-auto">
            <Button onClick={() => setActiveTab('policies')} className={`px-4 py-2 text-sm font-medium rounded-md border transition-colors whitespace-nowrap ${activeTab === 'policies' ? 'border-gray-200 bg-gray-100 text-gray-900' : 'border-transparent text-gray-500 hover:bg-gray-50'}`} variant="plain">明亚采集</Button>
            <Button onClick={() => setActiveTab('ai')} className={`px-4 py-2 text-sm font-medium rounded-md border transition-colors ${activeTab === 'ai' ? 'border-gray-200 bg-gray-100 text-gray-900' : 'border-transparent text-gray-500 hover:bg-gray-50'} cursor-pointer`} variant="plain">Excel导入</Button>
            <Button onClick={() => setActiveTab('table')} className={`px-4 py-2 text-sm font-medium rounded-md border transition-colors ${activeTab === 'table' ? 'border-gray-200 bg-gray-100 text-gray-900' : 'border-transparent text-gray-500 hover:bg-gray-50'} cursor-pointer`} variant="plain">截图识别</Button>
            <Button onClick={() => setActiveTab('manual')} className={`px-4 py-2 text-sm font-medium rounded-md border transition-colors ${activeTab === 'manual' ? 'border-gray-200 bg-gray-100 text-gray-900' : 'border-transparent text-gray-500 hover:bg-gray-50'} cursor-pointer`} variant="plain">手动录入</Button>
          </div>
        )}
        <div data-contact-scroll className="min-h-0 flex-1 overflow-y-auto overscroll-contain">
        <fieldset disabled={profileBusy} className="min-w-0 p-5 space-y-4">
          {error && activeTab!=='manual' && <div className="p-4 bg-red-50 text-red-700 rounded-xl flex gap-2 text-sm border border-red-100"><AlertCircle size={18} />{error}</div>}

          {activeTab === 'policies' && onMingyaImport && (
            <section>
              <Button type="button" className="" onClick={onMingyaImport} variant="primary">
                <Upload size={16} />导入采集文件
              </Button>
            </section>
          )}
          {activeTab === 'manual' && (
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              {/* 左侧：基础信息 */}
              <div className="space-y-4">
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-x-6 gap-y-4">
                  <Field className="" label={<>备注名<span className="text-danger-600"> *</span></>}>

                    <Input type="text" className="" value={formData.remarkName} onChange={e => setFormData({...formData, remarkName: e.target.value})} placeholder="请输入备注名" />
                  </Field>
                  <Field className="" label={<>昵称</>}>

                    <Input type="text" className="" value={formData.nickname} onChange={e => setFormData({...formData, nickname: e.target.value})} placeholder="请输入昵称" />
                  </Field>
                  <Field className="" label={<>微信号</>}>

                    <Input type="text" className="" value={formData.wxid} onChange={e => setFormData({...formData, wxid: e.target.value})} placeholder="请输入微信号" />
                  </Field>
                  <Field className="" label={<>手机号</>}>

                    <Input type="text" className="" value={String(formData.phoneNumber || '')} onChange={e => setFormData({...formData, phoneNumber: e.target.value})} placeholder="请输入手机号" />
                  </Field>
                  <Field label="证件号">
                    <Input value={String(formData.idCard || '')} onChange={e => setFormData({...formData, idCard:e.target.value})} />
                  </Field>
                  <Field label="生日">
                    <Input type="date" value={String(formData.birthday || '')} onChange={e => setFormData({...formData, birthday:e.target.value})} />
                  </Field>
                  <Field className="sm:col-span-2" label="地址">
                    <Input value={String(formData.address || '')} onChange={e => setFormData({...formData, address:e.target.value})} />
                  </Field>
                </div>

                <div className="space-y-1.5 relative" ref={tagInputContainerRef}>
                  <label className="block text-xs font-medium text-gray-700">标签管理</label>
                  <div
                    className={`ui-token-field flex flex-wrap gap-2 p-3 min-h-[50px] border rounded-lg transition-colors ${showTagSuggestions ? 'border-gray-900 ring-1 ring-gray-900/10' : 'border-gray-200'}`}
                    onClick={() => setShowTagSuggestions(true)}
                  >
                    {formData.tags.map(t => <span key={t} className="inline-flex items-center gap-1 px-2.5 py-1 bg-gray-100 border border-gray-200 rounded-full text-xs font-medium text-gray-700">{t}<IconButton onClick={(e) => { e.stopPropagation(); setFormData({...formData, tags: formData.tags.filter(x => x !== t)}); }} className="hover:text-gray-900 transition-colors" aria-label="关闭"><X size={10} strokeWidth={3}/></IconButton></span>)}
                    <Input
                      type="text"
                      appearance="embedded" aria-label="标签" placeholder="输入标签…"
                      className="flex-1 min-w-[120px]"
                      value={tagInput}
                      onChange={e => { setTagInput(e.target.value); setShowTagSuggestions(true); }}
                      onFocus={() => setShowTagSuggestions(true)}
                      onKeyDown={e => e.key === 'Enter' && (addTag(tagInput))}
                    />
                  </div>
                  {showTagSuggestions && (tagSuggestions.length > 0 || tagInput.trim()) && (
                    <div className="absolute top-full left-0 right-0 mt-2 bg-white rounded-lg shadow-lg border border-gray-200 z-50 overflow-hidden max-h-48 overflow-y-auto">
                      {tagSuggestions.map(tag => (
                        <Button key={tag} onClick={() => addTag(tag)} className="w-full text-left px-4 py-2 text-sm text-gray-700 hover:bg-gray-100 hover:text-gray-900 transition-colors cursor-pointer flex items-center justify-between" variant="plain">
                          <span>{tag}</span>
                          <Tag size={14} className="text-gray-300" />
                        </Button>
                      ))}
                      {tagInput.trim() && !tagSuggestions.includes(tagInput.trim()) && !formData.tags.includes(tagInput.trim()) && (
                         <Button onClick={() => addTag(tagInput)} className="w-full text-left px-4 py-2 text-sm text-gray-900 bg-gray-50 hover:bg-gray-100 transition-colors flex items-center gap-2 cursor-pointer" variant="plain">
                           <Plus size={14} />
                           <span>新增标签："{tagInput}"</span>
                         </Button>
                      )}
                    </div>
                  )}
                </div>

                <Field className="" label={<>详细描述</>}>

                  <Textarea id="contact-description" rows={5} className="min-h-[120px] resize-y" placeholder="输入相关业务描述…" value={formData.remarkInfo} onChange={e => setFormData({...formData, remarkInfo: e.target.value})} />
                </Field>

                {/* 成交产品 - 保单表格 */}
                <div className="space-y-2">
                  <div className="flex flex-wrap items-center justify-between gap-2">
                    <label className="mr-auto block text-xs font-medium text-gray-700">成交产品</label>
                    {initialData&&onManagePolicies&&<Button type="button" className="" disabled={historyBusy||profileBusy} onClick={managePolicies} variant="secondary" size="sm">管理保单</Button>}
                    <Button
                      onClick={() => setShowPolicyAdd(!showPolicyAdd)}
                      className="" variant="ghost" size="sm"
                    >
                      <Plus size={14} /> 添加保单
                    </Button>
                  </div>

                  {showPolicyAdd && (
                    <div className="p-4 bg-gray-50 rounded-lg space-y-3 border border-gray-200">
                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-x-6 gap-y-4">
                        <Field className="" label={<>产品名称*</>}>

                          <Input
                            type="text"
                            className=""
                            value={policyForm.productName || ''}
                            onChange={e => setPolicyForm({...policyForm, productName: e.target.value})}
                            placeholder="产品名称"
                          />
                        </Field>
                        <Field className="" label={<>保险公司</>}>

                          <Input
                            type="text"
                            className=""
                            value={policyForm.company || ''}
                            onChange={e => setPolicyForm({...policyForm, company: e.target.value})}
                            placeholder="保险公司"
                          />
                        </Field>
                        <Field className="" label={<>保单号</>}>

                          <Input
                            type="text"
                            className=""
                            value={policyForm.policyNumber || ''}
                            onChange={e => setPolicyForm({...policyForm, policyNumber: e.target.value})}
                            placeholder="保单号"
                          />
                        </Field>
                        <Field className="" label={<>保费</>}>

                          <Input
                            type="text"
                            className=""
                            value={policyForm.premium || ''}
                            onChange={e => setPolicyForm({...policyForm, premium: e.target.value})}
                            placeholder="保费金额"
                          />
                        </Field>
                        <Field className="" label={<>生效日期</>}>

                          <Input
                            type="date"
                            className=""
                            value={policyForm.effectiveDate || ''}
                            onChange={e => setPolicyForm({...policyForm, effectiveDate: e.target.value})}
                          />
                        </Field>
                        <Field className="" label={<>状态</>}>

                          <Select
                            className=""
                            value={policyForm.status || '正式保单'}
                            onValueChange={selectedValue => setPolicyForm({...policyForm, status: selectedValue})}
                          >
                            <option value="正式保单">正式保单</option>
                            <option value="待生效">待生效</option>
                            <option value="已失效">已失效</option>
                            <option value="已退保">已退保</option>
                          </Select>
                        </Field>
                        <Field className="" label={<>投保人</>}>

                          <Input
                            type="text"
                            className=""
                            value={policyForm.applicant || ''}
                            onChange={e => setPolicyForm({...policyForm, applicant: e.target.value})}
                            placeholder="投保人"
                          />
                        </Field>
                        <Field className="" label={<>被保人</>}>

                          <Input
                            type="text"
                            className=""
                            value={policyForm.insured || ''}
                            onChange={e => setPolicyForm({...policyForm, insured: e.target.value})}
                            placeholder="被保人"
                          />
                        </Field>
                      </div>
                      <div className="flex justify-end gap-2">
                        <Button onClick={() => { setShowPolicyAdd(false); setPolicyForm({ policyNumber: '', productName: '', company: '', premium: '', effectiveDate: '', status: '正式保单', applicant: '', insured: '', paymentYears: '', insuranceType: '', coverage: '' }); }} className="px-3 py-1.5 text-xs text-gray-500 hover:text-gray-700" variant="plain">取消</Button>
                        <Button onClick={handleAddPolicy} disabled={!policyForm.productName?.trim()} className="disabled:opacity-50" variant="primary" validate>确认添加</Button>
                      </div>
                    </div>
                  )}

                  {/* 保单列表 */}
                  {displayedPolicies().length > 0 ? (
                    <div className="max-w-full border border-gray-200 rounded-lg overflow-x-auto">
                      <table data-contact-policy-table className="w-full table-fixed text-sm" style={{minWidth:editingPolicyId?900:852}}>
                        <colgroup>{[260,144,120,128,128,editingPolicyId?120:72].map((w,i)=><col key={i} style={i===0?undefined:{width:w}}/>)}</colgroup>
                        <thead className="table-header border-b border-gray-200">
                          <tr>
                            <th className="text-left px-3 py-2 font-medium text-gray-600">产品名称</th>
                            <th className="text-left px-3 py-2 font-medium text-gray-600">公司</th>
                            <th className="text-left px-3 py-2 font-medium text-gray-600">保费</th>
                            <th className="text-left px-3 py-2 font-medium text-gray-600">状态</th>
                            <th className="text-left px-3 py-2 font-medium text-gray-600">生效日期</th>
                            <th className="sticky right-0 z-20 border-l border-gray-200 bg-gray-50 text-right px-3 py-2 font-medium text-gray-600 whitespace-nowrap">操作</th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-gray-100">
                          {displayedPolicies().map(policy => (
                            <tr key={policy.id} className="hover:bg-gray-50">
                              {editingPolicyId === policy.id ? (
                                <>
                                  <td className="px-3 py-2"><Input className="input-sm w-full" value={policyForm.productName} onChange={e => setPolicyForm({...policyForm, productName: e.target.value})} /></td>
                                  <td className="px-3 py-2"><Input className="input-sm w-full" value={policyForm.company} onChange={e => setPolicyForm({...policyForm, company: e.target.value})} /></td>
                                  <td className="px-3 py-2"><Input className="input-sm w-20" value={policyForm.premium} onChange={e => setPolicyForm({...policyForm, premium: e.target.value})} /></td>
                                  <td className="px-3 py-2">
                                    <Select className="w-24 input-sm" value={policyForm.status} onValueChange={selectedValue => setPolicyForm({...policyForm, status: selectedValue})}>
                                      <option value="正式保单">正式保单</option>
                                      <option value="待生效">待生效</option>
                                      <option value="已失效">已失效</option>
                                      <option value="已退保">已退保</option>
                                    </Select>
                                  </td>
                                  <td className="px-3 py-2"><Input type="date" className="input-sm w-28" value={policyForm.effectiveDate} onChange={e => setPolicyForm({...policyForm, effectiveDate: e.target.value})} /></td>
                                  <td className="sticky right-0 z-10 border-l border-gray-200 bg-white px-3 py-2 text-right whitespace-nowrap">
                                    <Button onClick={handleSaveEditPolicy} className="text-primary-600 hover:bg-primary-50 px-2 py-1 rounded text-xs" variant="plain">保存</Button>
                                    <Button onClick={() => { setEditingPolicyId(null); }} className="text-gray-500 hover:bg-gray-100 px-2 py-1 rounded text-xs ml-1" variant="plain">取消</Button>
                                  </td>
                                </>
                              ) : (
                                <>
                                  <td className="px-3 py-2 font-medium text-gray-800"><Button type="button" className="text-left hover:underline" onClick={()=>onPolicyDetail?.(policy)} variant="plain">{policy.productName}</Button></td>
                                  <td className="px-3 py-2 text-gray-600">{policy.company || '-'}</td>
                                  <td className="px-3 py-2 text-gray-600">{formatMoney(policy.premium,policy.mingya?.currency)}</td>
                                  <td className="px-3 py-2">
                                    <PolicyStatus status={policy.status}/>
                                  </td>
                                  <td className="px-3 py-2 text-gray-500">{policy.effectiveDate || '-'}</td>
                                  <td className="sticky right-0 z-10 border-l border-gray-200 bg-white px-3 py-2 text-right whitespace-nowrap">
                                    <Button type="button" aria-label={onPolicyDetail&&initialData?'保单详情':'编辑保单'} onClick={() => onPolicyDetail && initialData ? onPolicyDetail(policy) : handleEditPolicy(policy.id)} size="sm" variant="ghost">{onPolicyDetail&&initialData?'详情':<Edit2 size={12}/>}</Button>
                                    {!(onPolicyDetail && initialData) && <IconButton onClick={() => handleDeletePolicy(policy.id)} className="text-gray-400 hover:text-red-500 hover:bg-red-50 rounded ml-1" aria-label="删除"><Trash2 size={12} /></IconButton>}
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
                  <label className="block text-xs font-medium text-gray-700">意向产品</label>
                  <div className="ui-token-field flex flex-wrap gap-2 p-3 min-h-[50px] border border-gray-200 rounded-lg">
                    {(formData.intentProducts || []).map((product, idx) => (
                      <span key={idx} className="inline-flex items-center gap-1 px-2.5 py-1 bg-blue-50 border border-blue-100 rounded-full text-xs font-medium text-blue-700">
                        {product}
                        <IconButton onClick={() => { const newProducts = [...formData.intentProducts]; newProducts.splice(idx, 1); setFormData({...formData, intentProducts: newProducts}); }} className="hover:text-red-600 transition-colors" aria-label="关闭"><X size={10} strokeWidth={3}/></IconButton>
                      </span>
                    ))}
                    <Input
                      type="text"
                      appearance="embedded" aria-label="意向产品" placeholder="添加意向产品…"
                      className="flex-1 min-w-[120px]"
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
                    <Button
                      type="button"
                      onClick={() => setFormData({...formData, followUpStatus: 'following'})}
                      className={`px-3 py-1.5 rounded-md text-xs font-medium transition-colors ${
                        formData.followUpStatus === 'following'
                          ? 'bg-gray-900 text-white'
                          : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                      }`} variant="plain"
                    >
                      跟进中
                    </Button>
                    <Button
                      type="button"
                      onClick={() => setFormData({...formData, followUpStatus: 'idle'})}
                      className={`px-3 py-1.5 rounded-md text-xs font-medium transition-colors ${
                        !formData.followUpStatus || formData.followUpStatus === 'idle'
                          ? 'bg-gray-900 text-white'
                          : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                      }`} variant="plain"
                    >
                      暂未跟进
                    </Button>
                  </div>
                </div>

                {/* 跟进历史 */}
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2 text-sm font-medium text-gray-700"><Clock size={16} strokeWidth={2}/> 跟进历史</div>
                  <Button
                    disabled={historyBusy||profileBusy} onClick={() => setShowHistoryAdd(!showHistoryAdd)}
                    className="text-xs font-medium text-primary-600 hover:bg-primary-50 px-3 py-1.5 rounded-lg transition-colors cursor-pointer flex items-center gap-1" variant="plain"
                  >
                    <Plus size={14} /> 新增记录
                  </Button>
                </div>

                {historyError&&<p role="alert" className="text-sm text-danger-600">{historyError}</p>}
                {historySaved&&!historyError&&!historyBusy&&<p role="status" className="text-xs text-gray-500">{historySaved}</p>}
                {showHistoryAdd && (
                  <div className="p-4 bg-gray-50 rounded-lg space-y-3 animate-fade-in">
                    <Input
                      type="date"
                      className=""
                      aria-label="跟进日期" readOnly={historyBusy} value={historyForm.date}
                      onChange={e => setHistoryForm({...historyForm, date: e.target.value})}
                    />
                    <Textarea
                      disabled={historyBusy} aria-label="跟进内容" placeholder="记录本次沟通…"
                      className="min-h-[80px] resize-none"
                      readOnly={historyBusy} value={historyForm.content}
                      onChange={e => setHistoryForm({...historyForm, content: e.target.value})}
                    />
                    <div className="flex justify-end gap-2">
                      <Button disabled={historyBusy} onClick={() => {setShowHistoryAdd(false);setHistoryForm({date:new Date().toISOString().slice(0,10),content:''});}} className="px-4 py-2 text-sm text-gray-500 hover:text-gray-700 transition-colors" variant="plain">取消</Button>
                      <Button disabled={historyBusy||profileBusy} onClick={handleAddHistory} className="" variant="primary" validate>{historyBusy?'正在保存…':initialData?'保存到数据库':'添加到客户草稿'}</Button>
                    </div>
                  </div>
                )}

                <div data-followup-history className="space-y-2">
                  {[...(formData.progressHistory || [])].sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime()).map((record) => (
                    <div key={record.id} className="p-4 bg-white border border-gray-200 rounded-lg group relative hover:border-gray-300 transition-colors">
                      {editingHistoryId === record.id ? (
                        <div className="space-y-3 py-1">
                           <Input
                            type="date"
                            className=""
                            aria-label="跟进日期" readOnly={historyBusy} value={historyForm.date}
                            onChange={e => setHistoryForm({...historyForm, date: e.target.value})}
                          />
                          <Textarea
                            className="min-h-[70px] resize-none"
                            readOnly={historyBusy} value={historyForm.content}
                            onChange={e => setHistoryForm({...historyForm, content: e.target.value})}
                          />
                          <div className="flex justify-end gap-2">
                             <Button disabled={historyBusy} onClick={() => {setEditingHistoryId(null);setHistoryForm({date:new Date().toISOString().slice(0,10),content:''});}} className="text-sm text-gray-500" variant="plain">取消</Button>
                             <Button disabled={historyBusy||profileBusy} onClick={handleSaveEditHistory} className="" variant="primary" validate>{historyBusy?'正在保存…':'保存修改'}</Button>
                          </div>
                        </div>
                      ) : (
                        <>
                          <div className="flex justify-between items-center">
                            <span className="text-xs font-medium text-gray-500 bg-gray-100 px-2 py-0.5 rounded">{record.date}</span>
                          </div>
                          <p className="text-sm text-gray-800 mt-2 leading-relaxed pr-8">{record.content}</p>
                          <div className="absolute top-4 right-4 flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                             <IconButton disabled={historyBusy||profileBusy} aria-label="编辑跟进记录" onClick={() => handleEditHistory(record.id)} className="text-gray-400 hover:text-primary-600 hover:bg-primary-50 rounded transition-colors cursor-pointer"><Edit2 size={14}/></IconButton>
                             <IconButton disabled={historyBusy||profileBusy} aria-label="删除跟进记录" onClick={() => handleDeleteHistory(record.id)} className="text-gray-400 hover:text-red-600 hover:bg-red-50 rounded transition-colors cursor-pointer"><Trash2 size={14}/></IconButton>
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
            <div onClick={() => excelFileInputRef.current?.click()} className="border-2 border-dashed border-gray-200 rounded-xl p-12 flex flex-col items-center justify-center text-gray-400 hover:border-gray-400 hover:bg-gray-50/20 transition-colors cursor-pointer min-h-[280px]">
              <div className="w-16 h-16 bg-gray-50 rounded-xl flex items-center justify-center mb-4"><FileSpreadsheet size={28} className="text-gray-300" strokeWidth={2} /></div>
              <p className="font-medium text-gray-700 text-lg">上传 Excel 表格</p>
              <p className="text-sm text-gray-500 mt-2 text-center max-w-sm">支持客户信息表和保单信息表，自动识别表头并去重合并。</p>
              <p className="text-xs text-gray-400 mt-1">支持 .xlsx, .xls 格式</p>
              <input type="file" ref={excelFileInputRef} className="hidden" accept=".xlsx,.xls" onChange={e => e.target.files?.[0] && processExcelFile(e.target.files[0])} />
            </div>
          )}

          {activeTab === 'table' && !loading && !extractedTableData && (
            <div onClick={() => tableFileInputRef.current?.click()} className="border-2 border-dashed border-gray-200 rounded-xl p-12 flex flex-col items-center justify-center text-gray-400 hover:border-gray-400 hover:bg-gray-50/20 transition-colors cursor-pointer min-h-[280px]">
              <div className="w-16 h-16 bg-gray-50 rounded-xl flex items-center justify-center mb-4"><FileSpreadsheet size={28} className="text-gray-300" strokeWidth={2} /></div>
              <p className="font-medium text-gray-700 text-lg">上传保单/客户表截图</p>
              <p className="text-sm text-gray-500 mt-2 text-center max-w-sm">AI 将自动识别表格类型并提取数据。</p>
              <input type="file" ref={tableFileInputRef} className="hidden" accept="image/*" onChange={e => e.target.files?.[0] && processFile(e.target.files[0], 'table')} />
            </div>
          )}

          {loading && <div className="py-24 flex flex-col items-center justify-center"><div className="w-12 h-12 border-4 border-gray-200 border-t-primary-600 rounded-full animate-spin"></div><p className="mt-4 text-gray-600 font-medium">{activeTab === 'ai' ? '正在解析 Excel 文件...' : 'AI 深度分析数据中...'}</p></div>}

          {extractedList.length > 0 && activeTab === 'ai' && (
            <div className="space-y-4 animate-fade-in">
              <div className="flex items-center justify-between"><div className="font-medium text-gray-900">成功识别 {extractedList.length} 位联系人</div><Button onClick={() => setExtractedList([])} className="text-sm text-gray-500 hover:text-gray-700 px-3 py-1.5 rounded-lg hover:bg-gray-100 transition-colors" variant="plain">取消</Button></div>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">{extractedList.map((c, i) => <div key={i} className="p-4 bg-gray-50 rounded-lg flex gap-3 items-center border border-gray-100"><div className="w-10 h-10 bg-primary-50 rounded-lg flex items-center justify-center font-medium text-primary-700 text-lg">{c.remarkName?.[0]}</div><div className="flex-1 min-w-0"><div className="font-medium text-gray-900 truncate">{c.remarkName}</div><div className="text-xs text-gray-500 font-mono mt-0.5">{c.wxid || '无微信号'}</div></div></div>)}</div>
              <Button disabled={profileBusy} onClick={async()=>{setProfileBusy(true);setError(null);try{await onSave(extractedList,profileRequestId.current);onClose();}catch(e){setError(e instanceof Error?e.message:'导入未保存，请重试。');}finally{setProfileBusy(false);}}} className="w-full" variant="primary" validate>{profileBusy?'正在保存…':'确认并立即导入'}</Button>
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
                  <Button onClick={() => setExtractedTableData(null)} className="ml-auto text-xs text-gray-400 hover:text-gray-600 cursor-pointer" variant="plain">重新上传</Button>
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

                <Button
                  onClick={handleTableConfirm}
                  className="w-full" variant="primary" validate
                >
                  确认导入表格数据
                </Button>
             </div>
           )}
         </fieldset>
         </div>

         {/* 底部操作区 - 仅在手动录入时显示 */}
         {(activeTab === 'manual' || initialData) && (
           <WorkspaceDialogFooter>
             {error&&<p role="alert" className="mr-auto text-sm text-danger-600">{error}</p>}
             <Button disabled={profileBusy||historyBusy} onClick={requestClose} className="" variant="secondary">取消</Button>
             <Button disabled={profileBusy||historyBusy} onClick={handleManualSave} className="" variant="primary" validate>{profileBusy?'正在保存…':'保存'}</Button>
           </WorkspaceDialogFooter>
         )}
    </WorkspaceDialog>
   );
 };

export default ImportModal;
