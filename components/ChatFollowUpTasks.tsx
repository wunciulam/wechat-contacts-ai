import React, { useState } from 'react';
import { Square } from 'lucide-react';
import type { Contact, ProgressRecord } from '../types';
import { chinaDate } from '../services/chatAnalysis';
import Button, { IconButton } from './ui/Button';

export default function ChatFollowUpTasks({ contacts, onContactClick, onComplete }: {
  contacts: Contact[];
  onContactClick: (contact: Contact) => void;
  onComplete: (contactId: string, record: ProgressRecord) => Promise<void>;
}) {
  const [pending, setPending] = useState<string | null>(null);
  const [error, setError] = useState('');
  const today = chinaDate();
  const items = contacts.flatMap(contact => (contact.progressHistory || []).flatMap(record => {
    const task = record.chat?.nextAction;
    return task && !record.completed ? [{ contact, record, task }] : [];
  })).sort((a, b) => (a.task.dueDate || '9999').localeCompare(b.task.dueDate || '9999'));
  if (!items.length) return null;

  async function complete(contactId: string, record: ProgressRecord) {
    setPending(record.id);
    setError('');
    try { await onComplete(contactId, record); }
    catch (reason) { setError(reason instanceof Error ? reason.message : '待办未更新，请重试。'); }
    finally { setPending(null); }
  }

  return <details className="shrink-0 border-b border-gray-100 px-4 py-3 md:px-6" open>
    <summary className="cursor-pointer text-sm font-medium">跟进待办 <span className="text-gray-500">{items.length}</span></summary>
    {error && <p role="alert" className="mt-2 text-sm text-danger-600">{error}</p>}
    <ul className="mt-2 max-h-44 space-y-2 overflow-auto">
      {items.map(({contact, record, task}) => <li key={contact.id + ':' + record.id} className="flex items-start gap-2 text-sm">
        <IconButton disabled={Boolean(pending)} aria-label={'完成待办：' + task.text} onClick={() => complete(contact.id, record)}>
          <Square size={16} aria-hidden="true" />
        </IconButton>
        <div className="min-w-0 flex-1 py-1">
          <Button variant="plain" className="mr-2 inline text-left text-gray-600" onClick={() => onContactClick(contact)}>
            {contact.remarkName || contact.nickname}
          </Button>
          <span className="break-words">{task.text}</span>
        </div>
        {task.dueDate && <time dateTime={task.dueDate} className={task.dueDate < today ? 'shrink-0 py-1 text-xs text-danger-600' : 'shrink-0 py-1 text-xs text-gray-500'}>
          {task.dueDate < today ? '逾期 ' : ''}{task.dueDate}
        </time>}
      </li>)}
    </ul>
  </details>;
}
