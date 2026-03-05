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
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-gray-900/50 p-0 sm:p-4 animate-in fade-in duration-300">
      <div className="bg-white rounded-none sm:rounded-lg shadow-lg w-full max-w-lg overflow-hidden transform scale-100 transition-all flex flex-col h-full sm:h-auto sm:max-h-[85vh]">
        <div className="px-4 py-3 border-b border-gray-100 flex justify-between items-center bg-white shrink-0">
          <h3 className="text-sm sm:text-base font-medium text-gray-900 flex items-center gap-2">
            <div className={`p-1.5 rounded-md ${initialRecord ? 'bg-gray-100 text-gray-700' : 'bg-gray-100 text-gray-700'}`}>
               {initialRecord ? <Edit3 size={16} /> : <Clock size={16} />}
            </div>
            {initialRecord ? '编辑跟进记录' : '快速记录跟进'}
          </h3>
          <button onClick={onClose} className="text-gray-400 hover:text-gray-900 p-1.5 rounded-full hover:bg-gray-100 transition-all">
            <X size={18} />
          </button>
        </div>

        <div className="p-4 sm:p-5 flex-1 overflow-y-auto custom-scrollbar">
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