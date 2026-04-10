import React from 'react';
import { useSortable } from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import { Contact } from '../types';
import { Clock, ArrowRight, CheckCircle2, CircleDashed, MoreVertical, Trash2 } from 'lucide-react';

interface ContactCardProps {
  contact: Contact;
  isDragging?: boolean;
  isOverlay?: boolean;
  onClick: () => void;
  onStatusChange: (status: 'idle' | 'following' | 'contacted') => void;
}

const ContactCard: React.FC<ContactCardProps> = ({
  contact,
  isDragging,
  isOverlay,
  onClick,
  onStatusChange
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

  const handleStatusChange = (e: React.MouseEvent, status: 'idle' | 'following' | 'contacted') => {
    e.stopPropagation();
    onStatusChange(status);
  };

  const handleDragStart = (e: React.MouseEvent) => {
    // 开始拖拽时阻止冒泡
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
      className={`bg-white rounded-lg border border-gray-100 p-3 cursor-grab active:cursor-grabbing transition-all group ${
        isSortableDragging || isDragging ? 'opacity-50 rotate-2 shadow-lg' : ''
      } ${isOverlay ? 'rotate-3 shadow-xl border-gray-200' : ''} ${
        'hover:border-gray-200 hover:shadow-sm'
      }`}
    >
      <div className="flex items-start gap-3">
        {/* Avatar */}
        <div className="w-9 h-9 rounded-lg bg-gray-100 border border-gray-200 flex items-center justify-center text-gray-600 font-bold text-xs shrink-0">
          {initials}
        </div>

        {/* Content */}
        <div className="flex-1 min-w-0">
          <div className="flex items-center justify-between gap-2">
            <h3 className="text-xs font-bold text-gray-900 truncate">
              {contact.remarkName || contact.nickname}
            </h3>
            <ArrowRight size={12} className="text-gray-300 opacity-0 group-hover:opacity-100 transition-opacity shrink-0" />
          </div>

          <div className="flex items-center gap-1 mt-0.5">
            <Clock size={10} className="text-gray-400" />
            <span className="text-[10px] text-gray-500">
              {contact.lastDate || '从未'}
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

      {/* Status Actions */}
      <div className="flex items-center justify-between mt-3 pt-2 border-t border-gray-50">
        <div className="flex gap-1">
          {contact.followUpStatus === 'following' ? (
            <button
              onClick={(e) => handleStatusChange(e, 'contacted')}
              className="text-[9px] font-medium px-2 py-1 rounded bg-gray-100 text-gray-600 hover:bg-gray-200 transition-all flex items-center gap-1"
            >
              <CheckCircle2 size={10} /> 已沟通
            </button>
          ) : contact.followUpStatus === 'contacted' ? (
            <button
              onClick={(e) => handleStatusChange(e, 'following')}
              className="text-[9px] font-medium px-2 py-1 rounded bg-gray-100 text-gray-600 hover:bg-gray-200 transition-all flex items-center gap-1"
            >
              <CircleDashed size={10} /> 重新跟进
            </button>
          ) : (
            <button
              onClick={(e) => handleStatusChange(e, 'following')}
              className="text-[9px] font-medium px-2 py-1 rounded bg-gray-900 text-white hover:bg-gray-800 transition-all"
            >
              开始跟进
            </button>
          )}
        </div>
        <button
          onClick={(e) => {
            e.stopPropagation();
            onStatusChange('idle');
          }}
          className="p-1 text-gray-300 hover:text-red-500 hover:bg-red-50 rounded transition-all"
          title="设为暂未跟进"
        >
          <Trash2 size={12} />
        </button>
      </div>
    </div>
  );
};

export default ContactCard;
