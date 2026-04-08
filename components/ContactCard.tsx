import React from 'react';
import { useSortable } from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import { Contact } from '../types';
import { Clock, Trash2, Calendar } from 'lucide-react';

interface ContactCardProps {
  contact: Contact;
  isDragging?: boolean;
  isOverlay?: boolean;
  onClick: () => void;
  onStatusChange: (status: 'idle' | 'following') => void;
  onRemoveFromFollowUp?: (contactId: string) => void;
}

const ContactCard: React.FC<ContactCardProps> = ({
  contact,
  isDragging,
  isOverlay,
  onClick,
  onStatusChange,
  onRemoveFromFollowUp
}) => {
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging: isSortableDragging
  } = useSortable({ id: contact.id });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
  };

  const initials = contact.remarkName?.[0] || contact.nickname?.[0] || '?';

  // 获取最近一条跟进记录
  const latestRecord = contact.progressHistory && contact.progressHistory.length > 0
    ? contact.progressHistory[0]
    : null;

  const handleRemove = (e: React.MouseEvent) => {
    e.stopPropagation();
    onRemoveFromFollowUp?.(contact.id);
  };

  const handleDragStart = (e: React.MouseEvent) => {
    e.stopPropagation();
  };

  return (
    <div
      ref={setNodeRef}
      style={style}
      {...attributes}
      {...listeners}
      onClick={onClick}
      onMouseDown={handleDragStart}
      className={`bg-white rounded-lg border border-gray-100 p-3 cursor-grab active:cursor-grabbing transition-all group relative ${
        isSortableDragging || isDragging ? 'opacity-50 rotate-2 shadow-lg' : ''
      } ${isOverlay ? 'rotate-3 shadow-xl border-gray-200' : ''} ${
        'hover:border-gray-200 hover:shadow-md'
      }`}
    >
      {/* 删除按钮 - 右上角 */}
      <button
        onClick={handleRemove}
        className="absolute top-2 right-2 p-1.5 text-gray-300 hover:text-red-500 hover:bg-red-50 rounded transition-all opacity-0 group-hover:opacity-100"
        title="移出工作台"
      >
        <Trash2 size={14} />
      </button>

      <div className="flex items-start gap-3 pr-8">
        {/* Avatar */}
        <div className="w-10 h-10 rounded-lg bg-gray-100 border border-gray-200 flex items-center justify-center text-gray-600 font-bold text-sm shrink-0">
          {initials}
        </div>

        {/* Content */}
        <div className="flex-1 min-w-0">
          <h3 className="text-sm font-bold text-gray-900 truncate">
            {contact.remarkName || contact.nickname}
          </h3>

          <div className="flex items-center gap-1 mt-0.5">
            <Calendar size={10} className="text-gray-400" />
            <span className="text-[10px] text-gray-500">
              {contact.lastDate || '从未更新'}
            </span>
          </div>

          {/* Tags */}
          {contact.tags.length > 0 && (
            <div className="flex flex-wrap gap-1 mt-2">
              {contact.tags.slice(0, 2).map(tag => (
                <span
                  key={tag}
                  className="text-[9px] px-1.5 py-0.5 rounded-full bg-gray-100 text-gray-500"
                >
                  {tag}
                </span>
              ))}
              {contact.tags.length > 2 && (
                <span className="text-[9px] px-1.5 py-0.5 rounded-full bg-gray-100 text-gray-500">
                  +{contact.tags.length - 2}
                </span>
              )}
            </div>
          )}
        </div>
      </div>

      {/* 跟进记录 - 强调显示 */}
      {latestRecord && (
        <div className="mt-3 p-2 bg-gray-50 rounded-md border-l-2 border-gray-900">
          <p className="text-xs text-gray-700 leading-relaxed font-medium">
            {latestRecord.content}
          </p>
          <p className="text-[10px] text-gray-400 mt-1 flex items-center gap-1">
            <Clock size={10} />
            {latestRecord.date}
          </p>
        </div>
      )}
    </div>
  );
};

export default ContactCard;
