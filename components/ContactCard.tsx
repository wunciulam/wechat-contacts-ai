import React from 'react';
import { useSortable } from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import { Contact } from '../types';
import { Clock, ArrowRight, MessageSquare } from 'lucide-react';

interface ContactCardProps {
  contact: Contact;
  isDragging?: boolean;
  isOverlay?: boolean;
  onClick: () => void;
  showFollowUpInfo?: boolean;
}

const ContactCard: React.FC<ContactCardProps> = ({
  contact,
  isDragging,
  isOverlay,
  onClick,
  showFollowUpInfo = false
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

  const latestProgress = contact.progressHistory && contact.progressHistory.length > 0 
    ? contact.progressHistory[0] 
    : null;

  return (
    <div
      ref={setNodeRef}
      style={style}
      {...attributes}
      {...listeners}
      onClick={onClick}
      className={`bg-white rounded-lg border border-gray-100 p-3 cursor-grab active:cursor-grabbing transition-all group ${
        isSortableDragging || isDragging ? 'opacity-50 rotate-2 shadow-lg' : ''
      } ${isOverlay ? 'rotate-3 shadow-xl border-gray-200' : ''} ${
        'hover:border-gray-200 hover:shadow-sm'
      }`}
    >
      <div className="flex items-start gap-3">
        <div className="w-9 h-9 rounded-lg bg-gray-100 border border-gray-200 flex items-center justify-center text-gray-600 font-bold text-xs shrink-0">
          {initials}
        </div>

        <div className="flex-1 min-w-0">
          <div className="flex items-center justify-between gap-2">
            <h3 className="text-xs font-bold text-gray-900 truncate">
              {contact.remarkName || contact.nickname}
            </h3>
            <ArrowRight size={12} className="text-gray-300 opacity-0 group-hover:opacity-100 transition-opacity shrink-0" />
          </div>

          {showFollowUpInfo && latestProgress ? (
            <div className="mt-1.5 p-1.5 bg-amber-50 border border-amber-100 rounded text-xs">
              <div className="flex items-start gap-1">
                <MessageSquare size={10} className="text-amber-600 mt-0.5 shrink-0" />
                <div className="flex-1">
                  <p className="text-amber-900 font-medium leading-tight">{latestProgress.content}</p>
                  <p className="text-amber-600 text-[10px] mt-0.5">{latestProgress.date}</p>
                </div>
              </div>
            </div>
          ) : (
            <div className="flex items-center gap-1 mt-0.5">
              <Clock size={10} className="text-gray-400" />
              <span className="text-[10px] text-gray-500">
                {contact.lastDate || '从未'}
              </span>
            </div>
          )}

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
    </div>
  );
};

export default ContactCard;
