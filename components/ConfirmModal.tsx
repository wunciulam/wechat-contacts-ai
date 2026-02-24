
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
    <div className="fixed inset-0 z-[60] flex items-center justify-center bg-slate-900/60 backdrop-blur-md p-4 animate-in fade-in duration-200">
      <div className="bg-white rounded-3xl shadow-2xl w-full max-w-sm overflow-hidden scale-100 transform transition-all ring-1 ring-white/20">
        <div className="p-6 sm:p-8 pb-4 sm:pb-6">
          <div className="flex flex-col items-center text-center gap-3 sm:gap-4">
            <div className={`p-3 sm:p-4 rounded-2xl shadow-inner shrink-0 ${isDestructive ? 'bg-rose-50 text-rose-500' : 'bg-blue-50 text-blue-500'}`}>
              <AlertTriangle size={28} className="sm:w-8 sm:h-8" strokeWidth={2.5} />
            </div>
            <div>
              <h3 className="text-lg sm:text-xl font-bold text-slate-800 mb-1 sm:mb-2">{title}</h3>
              <p className="text-xs sm:text-sm text-slate-500 leading-relaxed whitespace-pre-wrap">{message}</p>
            </div>
          </div>
        </div>
        <div className="p-4 sm:p-6 pt-2 flex flex-col gap-2 sm:gap-3">
          <button
            onClick={onConfirm}
            className={`w-full py-2.5 sm:py-3 text-sm font-bold text-white rounded-xl focus:outline-none transition-all shadow-lg active:scale-95 ${
              isDestructive 
                ? 'bg-rose-500 hover:bg-rose-600 shadow-rose-200' 
                : 'bg-emerald-500 hover:bg-emerald-600 shadow-emerald-200'
            }`}
          >
            {confirmText}
          </button>
          <button
            onClick={onCancel}
            className="w-full py-2.5 sm:py-3 text-sm font-bold text-slate-600 bg-white hover:bg-slate-50 rounded-xl transition-colors"
          >
            {cancelText}
          </button>
        </div>
      </div>
    </div>
  );
};

export default ConfirmModal;