
import React, { useState, useMemo } from 'react';
import { X, Shield, Search, Check } from 'lucide-react';
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
            id: Math.random().toString(36).substr(2, 9),
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
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-gray-900/50 backdrop-blur-sm p-4 animate-fade-in">
      <div className="bg-white shadow-2xl w-full max-w-lg overflow-hidden flex flex-col max-h-[90vh] rounded-2xl border border-gray-200">
        <div className="px-5 py-4 border-b border-gray-100 flex justify-between items-center">
          <h3 className="text-base font-semibold text-gray-800 flex items-center gap-2">
            <div className="p-1.5 rounded-lg bg-primary-50 text-primary-600">
               <Shield size={16} />
            </div>
            录入新保单
          </h3>
          <button onClick={handleClose} className="p-2 text-gray-400 hover:text-gray-600 hover:bg-gray-100 rounded-lg transition-all cursor-pointer">
            <X size={20} />
          </button>
        </div>

        <div className="flex-1 overflow-y-auto p-5 space-y-5">
            <div className="space-y-2 relative">
                <label className="text-[10px] font-medium text-gray-400 uppercase tracking-wider block">关联客户</label>
                {selectedContactId ? (
                    <div className="flex items-center justify-between p-3 bg-gray-50 border border-gray-100 rounded-lg">
                        <div className="flex items-center gap-3">
                            <div className="w-8 h-8 rounded-lg bg-gray-200 flex items-center justify-center text-xs font-medium text-gray-600">
                                {selectedContact?.remarkName?.[0] || selectedContact?.nickname?.[0] || '?'}
                            </div>
                            <div>
                                <div className="font-medium text-gray-900 text-sm">{selectedContact?.remarkName || selectedContact?.nickname}</div>
                            </div>
                        </div>
                        <button 
                            onClick={() => setSelectedContactId('')}
                            className="text-xs text-gray-600 hover:text-gray-900 font-medium px-2 py-1 hover:bg-gray-100 rounded transition-colors cursor-pointer"
                        >
                            更换
                        </button>
                    </div>
                ) : (
                    <div className="relative">
                        <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" size={16} />
                        <input
                            type="text"
                            placeholder="搜索客户姓名..."
                            value={searchTerm}
                            onChange={(e) => {
                                setSearchTerm(e.target.value);
                                setIsDropdownOpen(true);
                            }}
                            onFocus={() => setIsDropdownOpen(true)}
                            className="w-full pl-10 pr-4 py-2.5 rounded-md border border-gray-200 bg-white text-sm text-gray-900 focus:outline-none focus:border-gray-400 transition-all placeholder:text-gray-400"
                        />
                        {isDropdownOpen && (
                            <div className="absolute top-full left-0 right-0 mt-2 bg-white border border-gray-200 rounded-lg shadow-lg z-50 max-h-60 overflow-y-auto">
                                {filteredContacts.length === 0 ? (
                                    <div className="p-4 text-center text-sm text-gray-400">未找到匹配的客户</div>
                                ) : (
                                    filteredContacts.map(contact => (
                                        <button
                                            key={contact.id}
                                            onClick={() => handleSelectContact(contact)}
                                            className="w-full flex items-center gap-3 px-4 py-3 text-left hover:bg-gray-50 transition-colors cursor-pointer border-b border-gray-50 last:border-0"
                                        >
                                            <div className="w-8 h-8 rounded-lg bg-gray-200 flex items-center justify-center text-xs font-medium text-gray-600">
                                                {contact.remarkName?.[0] || contact.nickname?.[0] || '?'}
                                            </div>
                                            <div>
                                                <div className="font-medium text-gray-900 text-sm">{contact.remarkName || contact.nickname}</div>
                                                {contact.phoneNumber && <div className="text-xs text-gray-400">{contact.phoneNumber}</div>}
                                            </div>
                                        </button>
                                    ))
                                )}
                            </div>
                        )}
                    </div>
                )}
            </div>

            <div className="space-y-4">
                <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-1.5">
                        <label className="text-[10px] font-medium text-gray-400 uppercase tracking-wider block">险种名称 *</label>
                        <input 
                            type="text" 
                            className="input"
                            placeholder="例如：平安福终身寿险"
                            value={policyData.productName}
                            onChange={e => setPolicyData({...policyData, productName: e.target.value})}
                        />
                    </div>
                    <div className="space-y-1.5">
                        <label className="text-[10px] font-medium text-gray-400 uppercase tracking-wider block">保单号</label>
                        <input 
                            type="text" 
                            className="input font-mono"
                            placeholder="例如：P123456789"
                            value={policyData.policyNumber}
                            onChange={e => setPolicyData({...policyData, policyNumber: e.target.value})}
                        />
                    </div>
                    <div className="space-y-1.5">
                        <label className="text-[10px] font-medium text-gray-400 uppercase tracking-wider block">保费</label>
                        <input 
                            type="text" 
                            className="input"
                            placeholder="例如：5000"
                            value={policyData.premium}
                            onChange={e => setPolicyData({...policyData, premium: e.target.value})}
                        />
                    </div>
                    <div className="space-y-1.5">
                        <label className="text-[10px] font-medium text-gray-400 uppercase tracking-wider block">保险公司</label>
                        <input 
                            type="text" 
                            className="input"
                            placeholder="例如：中国平安"
                            value={policyData.company}
                            onChange={e => setPolicyData({...policyData, company: e.target.value})}
                        />
                    </div>
                    <div className="space-y-1.5">
                        <label className="text-[10px] font-medium text-gray-400 uppercase tracking-wider block">投保人</label>
                        <input 
                            type="text" 
                            className="input"
                            value={policyData.applicant}
                            onChange={e => setPolicyData({...policyData, applicant: e.target.value})}
                        />
                    </div>
                    <div className="space-y-1.5">
                        <label className="text-[10px] font-medium text-gray-400 uppercase tracking-wider block">被保人</label>
                        <input 
                            type="text" 
                            className="input"
                            value={policyData.insured}
                            onChange={e => setPolicyData({...policyData, insured: e.target.value})}
                        />
                    </div>
                    <div className="col-span-2 space-y-1.5">
                        <label className="text-[10px] font-medium text-gray-400 uppercase tracking-wider block">生效日期</label>
                        <input 
                            type="date" 
                            className="input"
                            value={policyData.effectiveDate}
                            onChange={e => setPolicyData({...policyData, effectiveDate: e.target.value})}
                        />
                    </div>
                 </div>
            </div>
        </div>

        <div className="px-5 py-4 border-t border-gray-100 bg-white flex justify-end gap-2 shrink-0">
            <button
                onClick={handleClose}
                className="btn btn-secondary text-xs py-2"
            >
                取消
            </button>
            <button
                onClick={handleSave}
                disabled={!selectedContactId || !policyData.productName}
                className="btn btn-primary text-xs py-2 flex items-center gap-1.5 disabled:opacity-50 disabled:cursor-not-allowed"
            >
                <Check size={14} />
                保存保单
            </button>
        </div>
      </div>
    </div>
  );
};

export default ManualPolicyModal;
