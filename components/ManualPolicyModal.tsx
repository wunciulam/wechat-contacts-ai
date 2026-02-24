
import React, { useState, useMemo } from 'react';
import { X, Shield, Search, Check, ChevronDown, User } from 'lucide-react';
import { Contact, Policy } from '../types';

interface ManualPolicyModalProps {
  isOpen: boolean;
  onClose: () => void;
  contacts: Contact[];
  onSave: (contactId: string, policy: Policy) => void;
}

const ManualPolicyModal: React.FC<ManualPolicyModalProps> = ({ isOpen, onClose, contacts, onSave }) => {
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedContactId, setSelectedContactId] = useState<string>('');
  const [isDropdownOpen, setIsDropdownOpen] = useState(false);

  const [policyData, setPolicyData] = useState<Partial<Policy>>({
    productName: '',
    policyNumber: '',
    company: '',
    premium: '',
    effectiveDate: '',
    status: '有效',
    applicant: '',
    insured: ''
  });

  const filteredContacts = useMemo(() => {
    if (!searchTerm) return contacts.slice(0, 50); 
    return contacts.filter(c => 
      (c.remarkName && c.remarkName.toLowerCase().includes(searchTerm.toLowerCase())) ||
      (c.nickname && c.nickname.toLowerCase().includes(searchTerm.toLowerCase()))
    );
  }, [contacts, searchTerm]);

  const selectedContact = contacts.find(c => c.id === selectedContactId);

  // Auto-fill applicant/insured when contact is selected
  const handleSelectContact = (contact: Contact) => {
    setSelectedContactId(contact.id);
    setIsDropdownOpen(false);
    setSearchTerm('');
    setPolicyData(prev => ({
        ...prev,
        applicant: prev.applicant || contact.remarkName || contact.nickname || '',
        insured: prev.insured || contact.remarkName || contact.nickname || ''
    }));
  };

  const handleSave = () => {
    if (selectedContactId && policyData.productName) {
        const newPolicy: Policy = {
            id: Date.now().toString() + Math.random().toString(36).substr(2, 5),
            productName: policyData.productName,
            policyNumber: policyData.policyNumber || '暂无单号',
            company: policyData.company || '',
            premium: policyData.premium || '0',
            effectiveDate: policyData.effectiveDate || '',
            status: policyData.status || '有效',
            applicant: policyData.applicant || '',
            insured: policyData.insured || ''
        };
        onSave(selectedContactId, newPolicy);
        handleClose();
    }
  };

  const handleClose = () => {
    setSelectedContactId('');
    setSearchTerm('');
    setPolicyData({
        productName: '',
        policyNumber: '',
        company: '',
        premium: '',
        effectiveDate: '',
        status: '有效',
        applicant: '',
        insured: ''
    });
    onClose();
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 backdrop-blur-md p-0 sm:p-4 animate-in fade-in duration-200">
      <div className="bg-white rounded-none sm:rounded-3xl shadow-2xl w-full max-w-lg overflow-hidden transform scale-100 transition-all ring-1 ring-white/20 flex flex-col h-full sm:h-auto sm:max-h-[90vh]">
        {/* Header */}
        <div className="px-4 sm:px-6 py-4 sm:py-5 border-b border-slate-100 flex justify-between items-center bg-white shrink-0">
          <h3 className="text-base sm:text-lg font-bold text-slate-800 flex items-center gap-2">
            <div className="p-1.5 sm:p-2 rounded-lg bg-emerald-50 text-emerald-600">
               <Shield size={18} />
            </div>
            录入新保单
          </h3>
          <button onClick={handleClose} className="text-slate-400 hover:text-slate-600 p-1 rounded-full hover:bg-slate-50 transition-colors">
            <X size={20} />
          </button>
        </div>

        <div className="p-4 sm:p-6 flex-1 overflow-y-auto custom-scrollbar space-y-4 sm:space-y-6">
            
            {/* Contact Selector */}
            <div className="space-y-2 relative">
                <label className="text-[10px] sm:text-xs font-bold text-slate-400 uppercase tracking-widest block">关联客户</label>
                {selectedContactId ? (
                    <div className="flex items-center justify-between p-3 bg-emerald-50/50 border border-emerald-100 rounded-xl">
                        <div className="flex items-center gap-3">
                            <div className="w-8 h-8 rounded-lg bg-white flex items-center justify-center text-xs font-bold text-slate-600 shadow-sm">
                                {selectedContact?.remarkName?.[0] || selectedContact?.nickname?.[0] || '?'}
                            </div>
                            <div>
                                <div className="font-bold text-slate-800 text-sm">{selectedContact?.remarkName || selectedContact?.nickname}</div>
                            </div>
                        </div>
                        <button 
                            onClick={() => setSelectedContactId('')}
                            className="text-xs text-emerald-600 hover:text-emerald-800 font-medium px-2 py-1"
                        >
                            更换
                        </button>
                    </div>
                ) : (
                    <div className="relative">
                        <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={16} />
                        <input
                            type="text"
                            placeholder="搜索客户姓名..."
                            value={searchTerm}
                            onChange={(e) => {
                                setSearchTerm(e.target.value);
                                setIsDropdownOpen(true);
                            }}
                            onFocus={() => setIsDropdownOpen(true)}
                            className="w-full pl-9 pr-4 py-2.5 sm:py-3 rounded-xl border-0 bg-slate-50 text-sm sm:text-base text-slate-800 focus:bg-white focus:ring-2 focus:ring-emerald-500/20 focus:outline-none transition-all placeholder:text-slate-400"
                        />
                        {isDropdownOpen && (
                            <div className="absolute left-0 right-0 top-full mt-2 bg-white rounded-xl shadow-xl border border-slate-100 max-h-48 overflow-y-auto z-20 custom-scrollbar">
                                {filteredContacts.map(c => (
                                    <div 
                                        key={c.id}
                                        onClick={() => handleSelectContact(c)}
                                        className="p-3 hover:bg-slate-50 cursor-pointer flex items-center gap-3 border-b border-slate-50 last:border-0"
                                    >
                                        <div className="w-6 h-6 rounded bg-slate-100 flex items-center justify-center text-[10px] font-bold text-slate-500">
                                            {c.remarkName?.[0] || c.nickname?.[0]}
                                        </div>
                                        <div className="text-sm text-slate-700 font-medium">{c.remarkName || c.nickname}</div>
                                    </div>
                                ))}
                                {filteredContacts.length === 0 && (
                                    <div className="p-3 text-center text-xs text-slate-400">无匹配联系人</div>
                                )}
                            </div>
                        )}
                    </div>
                )}
            </div>

            {/* Policy Form */}
            <div className="space-y-4">
                 <div className="grid grid-cols-2 gap-3 sm:gap-4">
                    <div className="space-y-1.5 col-span-2">
                        <label className="text-[10px] sm:text-xs font-bold text-slate-400 uppercase tracking-widest block">产品名称 <span className="text-rose-500">*</span></label>
                        <input 
                            type="text" 
                            className="w-full px-4 py-2.5 bg-slate-50 border-0 rounded-xl text-sm focus:ring-2 focus:ring-emerald-500/20 focus:bg-white transition-all"
                            placeholder="例如：平安福2024"
                            value={policyData.productName}
                            onChange={e => setPolicyData({...policyData, productName: e.target.value})}
                        />
                    </div>
                    <div className="space-y-1.5 col-span-2 sm:col-span-1">
                        <label className="text-[10px] sm:text-xs font-bold text-slate-400 uppercase tracking-widest block">保单号</label>
                        <input 
                            type="text" 
                            className="w-full px-4 py-2.5 bg-slate-50 border-0 rounded-xl text-sm focus:ring-2 focus:ring-emerald-500/20 focus:bg-white transition-all"
                            placeholder="Policy No."
                            value={policyData.policyNumber}
                            onChange={e => setPolicyData({...policyData, policyNumber: e.target.value})}
                        />
                    </div>
                    <div className="space-y-1.5 col-span-2 sm:col-span-1">
                        <label className="text-[10px] sm:text-xs font-bold text-slate-400 uppercase tracking-widest block">保费 (元)</label>
                        <input 
                            type="text" 
                            className="w-full px-4 py-2.5 bg-slate-50 border-0 rounded-xl text-sm focus:ring-2 focus:ring-emerald-500/20 focus:bg-white transition-all"
                            placeholder="0.00"
                            value={policyData.premium}
                            onChange={e => setPolicyData({...policyData, premium: e.target.value})}
                        />
                    </div>
                    <div className="space-y-1.5 col-span-2 sm:col-span-1">
                        <label className="text-[10px] sm:text-xs font-bold text-slate-400 uppercase tracking-widest block">保险公司</label>
                        <input 
                            type="text" 
                            className="w-full px-4 py-2.5 bg-slate-50 border-0 rounded-xl text-sm focus:ring-2 focus:ring-emerald-500/20 focus:bg-white transition-all"
                            placeholder="公司名称"
                            value={policyData.company}
                            onChange={e => setPolicyData({...policyData, company: e.target.value})}
                        />
                    </div>
                    <div className="space-y-1.5 col-span-2 sm:col-span-1">
                        <label className="text-[10px] sm:text-xs font-bold text-slate-400 uppercase tracking-widest block">状态</label>
                        <select 
                            className="w-full px-4 py-2.5 bg-slate-50 border-0 rounded-xl text-sm focus:ring-2 focus:ring-emerald-500/20 focus:bg-white transition-all appearance-none"
                            value={policyData.status}
                            onChange={e => setPolicyData({...policyData, status: e.target.value})}
                        >
                            <option value="有效">有效</option>
                            <option value="失效">失效</option>
                            <option value="终止">终止</option>
                        </select>
                    </div>
                    <div className="space-y-1.5 col-span-2 sm:col-span-1">
                        <label className="text-[10px] sm:text-xs font-bold text-slate-400 uppercase tracking-widest block">投保人</label>
                        <input 
                            type="text" 
                            className="w-full px-4 py-2.5 bg-slate-50 border-0 rounded-xl text-sm focus:ring-2 focus:ring-emerald-500/20 focus:bg-white transition-all"
                            value={policyData.applicant}
                            onChange={e => setPolicyData({...policyData, applicant: e.target.value})}
                        />
                    </div>
                    <div className="space-y-1.5 col-span-2 sm:col-span-1">
                        <label className="text-[10px] sm:text-xs font-bold text-slate-400 uppercase tracking-widest block">被保人</label>
                        <input 
                            type="text" 
                            className="w-full px-4 py-2.5 bg-slate-50 border-0 rounded-xl text-sm focus:ring-2 focus:ring-emerald-500/20 focus:bg-white transition-all"
                            value={policyData.insured}
                            onChange={e => setPolicyData({...policyData, insured: e.target.value})}
                        />
                    </div>
                    <div className="space-y-1.5 col-span-2">
                        <label className="text-[10px] sm:text-xs font-bold text-slate-400 uppercase tracking-widest block">生效日期</label>
                        <input 
                            type="date" 
                            className="w-full px-4 py-2.5 bg-slate-50 border-0 rounded-xl text-sm focus:ring-2 focus:ring-emerald-500/20 focus:bg-white transition-all"
                            value={policyData.effectiveDate}
                            onChange={e => setPolicyData({...policyData, effectiveDate: e.target.value})}
                        />
                    </div>
                 </div>
            </div>

        </div>

        <div className="p-4 sm:p-6 border-t border-slate-100 flex flex-col sm:flex-row justify-end gap-3 bg-white shrink-0">
            <button
                onClick={handleClose}
                className="order-2 sm:order-1 px-5 py-2.5 text-sm font-medium text-slate-600 hover:bg-slate-50 rounded-xl transition-colors"
            >
                取消
            </button>
            <button
                onClick={handleSave}
                disabled={!selectedContactId || !policyData.productName}
                className="order-1 sm:order-2 px-6 py-3 sm:py-2.5 text-sm text-white bg-emerald-600 hover:bg-emerald-700 rounded-xl font-bold shadow-lg shadow-emerald-200 transition-all transform hover:-translate-y-0.5 active:scale-95 flex items-center justify-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed disabled:transform-none"
            >
                <Check size={18} />
                保存保单
            </button>
        </div>
      </div>
    </div>
  );
};

export default ManualPolicyModal;
