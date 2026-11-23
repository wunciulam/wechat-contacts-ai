import {IconButton} from './ui/Button';
import CustomerTags from './CustomerTags';
import React from 'react';
import { useSortable } from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import { Contact } from '../types';
import { Clock, Trash2, Calendar } from 'lucide-react';

interface ContactCardProps {
  contact: Contact;
  sortableId?: string;
  removalLabel?: string;
  isDragging?: boolean;
  isOverlay?: boolean;
  onClick: () => void;
  onStatusChange: (status: 'idle' | 'following') => void;
  onRemoveFromFollowUp?: (contactId: string) => void;
}

const ContactCard: React.FC<ContactCardProps> = ({
  contact,
  sortableId,
  removalLabel="移出工作台",
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
  } = useSortable({ id: sortableId || contact.id });

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
      data-contact-id={contact.id}
      ref={setNodeRef}
      style={style}
      {...attributes}
      {...listeners}
      onClick={onClick}
      onMouseDown={handleDragStart}
      className={`bg-white rounded-lg border border-gray-100 p-3 cursor-grab active:cursor-grabbing transition-colors group relative ${
        isSortableDragging || isDragging ? 'opacity-50' : ''
      } ${isOverlay ? 'shadow-md border-gray-200' : ''} ${
        'hover:border-gray-200 hover:shadow-md'
      }`}
    >
      {/* 删除按钮 - 右上角 */}
      <IconButton
        onClick={handleRemove}
        className="absolute top-2 right-2 text-gray-300 hover:text-red-500 hover:bg-red-50 rounded transition-colors opacity-100 sm:opacity-0 sm:group-hover:opacity-100 focus-visible:opacity-100"
        title={removalLabel} aria-label={removalLabel}
      >
        <Trash2 size={14} />
      </IconButton>

      <div className="flex items-start gap-3 pr-8">
        {/* Avatar */}
        <div className="w-10 h-10 rounded-lg bg-gray-100 border border-gray-200 flex items-center justify-center text-gray-600 font-semibold text-sm shrink-0">
          {initials}
        </div>

        {/* Content */}
        <div className="flex-1 min-w-0">
          <h3 className="text-sm font-semibold text-gray-900 truncate">
            {contact.remarkName || contact.nickname}
          </h3>


          <CustomerTags tags={contact.tags}/>
        </div>
      </div>

      {/* 跟进记录 - 强调显示 */}
      {latestRecord && (
        <div className="mt-3 p-2 bg-gray-50 rounded-md border-l-2 border-gray-900">
          <p className="text-xs text-gray-700 leading-relaxed font-medium">
            {latestRecord.content}
          </p>
          <p className="text-xs text-gray-400 mt-1 flex items-center gap-1">
            <Clock size={10} />
            {latestRecord.date}
          </p>
        </div>
      )}
    </div>
  );
};

export default ContactCard;
