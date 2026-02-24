import React from 'react';
import { X, Clock, Edit3 } from 'lucide-react';
import { Contact, ProgressRecord } from '../types';
import { QuickFollowUpForm } from './QuickFollowUpForm';

interface QuickFollowUpModalProps {
  isOpen: boolean;
  onClose: () => void;
  contacts: Contact[];
  onSave: (contactId: string | null, date: string, content: string, status: 'following' | 'contacted', newContactName?: string, existingRecordId?: string, completed?: boolean) => void;
  initialContactId?: string;
  initialRecord?: ProgressRecord;
}

const QuickFollowUpModal: React.FC<QuickFollowUpModalProps> = ({ 
  isOpen, onClose, contacts, onSave, initialContactId, initialRecord 
}) => {
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 backdrop-blur-md p-0 sm:p-4 animate-in fade-in duration-300">
      <div className="bg-white rounded-none sm:rounded-3xl shadow-2xl w-full max-w-lg overflow-hidden transform scale-100 transition-all flex flex-col h-full sm:h-auto sm:max-h-[90vh] ring-1 ring-white/20">
        <div className="px-4 sm:px-6 py-4 sm:py-5 border-b border-slate-100 flex justify-between items-center bg-white shrink-0">
          <h3 className="text-base sm:text-lg font-bold text-slate-800 flex items-center gap-2">
            <div className={`p-1.5 sm:p-2 rounded-lg ${initialRecord ? 'bg-blue-50 text-blue-600' : 'bg-emerald-50 text-emerald-600'} shadow-inner`}>
               {initialRecord ? <Edit3 size={18} /> : <Clock size={18} />}
            </div>
            {initialRecord ? '编辑跟进记录' : '快速记录跟进'}
          </h3>
          <button onClick={onClose} className="text-slate-400 hover:text-rose-500 p-2 rounded-full hover:bg-rose-50 transition-all">
            <X size={20} />
          </button>
        </div>

        <div className="p-4 sm:p-8 flex-1 overflow-y-auto custom-scrollbar">
            <QuickFollowUpForm 
                contacts={contacts}
                onSave={(...args) => { onSave(...args); onClose(); }}
                initialContactId={initialContactId}
                initialRecord={initialRecord}
                onCancel={onClose}
            />
        </div>
      </div>
    </div>
  );
};

export default QuickFollowUpModal;