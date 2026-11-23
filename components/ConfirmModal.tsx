import WorkspaceDialog,{WorkspaceDialogFooter} from './WorkspaceDialog';
import Button from './ui/Button';
import React from 'react';

interface ConfirmModalProps {
  isOpen: boolean;
  title: string;
  message: string;
  confirmText?: string;
  cancelText?: string;
  onConfirm: () => void;
  onCancel: () => void;
  isDestructive?: boolean;
}

const ConfirmModal: React.FC<ConfirmModalProps> = ({
  isOpen,
  title,
  message,
  confirmText = "确认",
  cancelText = "取消",
  onConfirm,
  onCancel,
  isDestructive = false
}) => {
  if (!isOpen) return null;

  return <WorkspaceDialog title={title} size="confirm" onClose={onCancel}>
    <p className="text-sm leading-relaxed text-gray-600 whitespace-pre-wrap">{message}</p>
    <WorkspaceDialogFooter><Button variant="secondary" onClick={onCancel}>{cancelText}</Button><Button variant={isDestructive?'danger':'primary'} onClick={onConfirm}>{confirmText}</Button></WorkspaceDialogFooter>
  </WorkspaceDialog>;

};

export default ConfirmModal;
