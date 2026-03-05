import React from 'react';
import { AlertTriangle, X } from 'lucide-react';

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

  return (
    <div className="fixed inset-0 z-[60] flex items-center justify-center bg-gray-900/50 backdrop-blur-sm p-4 animate-fade-in">
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-sm overflow-hidden border border-gray-200">
        <div className="p-6">
          <div className="flex flex-col items-center text-center gap-3">
            <div className={`p-3 rounded-xl ${isDestructive ? 'bg-red-50 text-red-600' : 'bg-gray-100 text-gray-700'}`}>
              <AlertTriangle size={24} strokeWidth={2} />
            </div>
            <div>
              <h3 className="font-semibold text-gray-900 text-base">{title}</h3>
              <p className="text-sm text-gray-500 mt-2 leading-relaxed whitespace-pre-wrap">{message}</p>
            </div>
          </div>
        </div>
        <div className="p-5 pt-0 flex flex-col gap-2">
          <button
            onClick={onConfirm}
            className={`w-full btn text-sm font-medium text-white rounded-md transition-all cursor-pointer ${
              isDestructive
                ? 'bg-red-600 hover:bg-red-700'
                : 'bg-gray-900 hover:bg-gray-800'
            }`}
          >
            {confirmText}
          </button>
          <button
            onClick={onCancel}
            className="w-full btn btn-secondary text-sm font-medium rounded-md transition-colors cursor-pointer"
          >
            {cancelText}
          </button>
        </div>
      </div>
    </div>
  );
};

export default ConfirmModal;
