import type {FollowUpSave} from '../types';
import React, {useState} from 'react';
import WorkspaceDialog from './WorkspaceDialog';
import { X, Clock, Edit3 } from 'lucide-react';
import { Contact, ProgressRecord } from '../types';
import { QuickFollowUpForm } from './QuickFollowUpForm';

interface QuickFollowUpModalProps {
  isOpen: boolean;
  onClose: () => void;
  contacts: Contact[];
  onSave: FollowUpSave;
  initialContactId?: string;
  initialRecord?: ProgressRecord;
}

const QuickFollowUpModal: React.FC<QuickFollowUpModalProps> = ({ 
  isOpen, onClose, contacts, onSave, initialContactId, initialRecord 
}) => {
  const [saving,setSaving]=useState(false);
  if (!isOpen) return null;
  return <WorkspaceDialog title={initialRecord?'编辑跟进记录':'快速记录跟进'} compact onClose={()=>{if(!saving)onClose();}}>
    <QuickFollowUpForm contacts={contacts} onSave={onSave} onSaved={onClose} onSavingChange={setSaving} initialContactId={initialContactId} initialRecord={initialRecord} onCancel={onClose}/>
  </WorkspaceDialog>;
};
export default QuickFollowUpModal;
