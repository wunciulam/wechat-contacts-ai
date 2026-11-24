import React from 'react';
import type { ProgressRecord } from '../types';
import { transcriptLines } from '../services/chatTranscript';

export default function ChatFollowUpDetails({ record }: { record: ProgressRecord }) {
  const chat = record.chat;
  if (!chat) return null;
  const evidence = new Set(chat.analysis?.evidence || []);
  return <div className="mt-2 space-y-2 text-sm text-gray-700">
    {chat.analysis && <p className="break-words">
      <span className="font-medium">{chat.analysis.stage}</span>
      {chat.analysis.blocker && <span className="ml-2">{chat.analysis.blocker}</span>}
    </p>}
    {chat.nextAction && <p className="break-words">
      <span className="font-medium">{record.completed ? '已完成' : '下一步'}</span>
      <span className="ml-2">{chat.nextAction.text}</span>
      {chat.nextAction.dueDate && <time className="ml-2 whitespace-nowrap text-gray-500" dateTime={chat.nextAction.dueDate}>{chat.nextAction.dueDate}</time>}
    </p>}
    {chat.note && chat.note !== record.content && <details>
      <summary className="cursor-pointer text-gray-600">线下补充</summary>
      <p className="mt-2 whitespace-pre-wrap break-words">{chat.note}</p>
    </details>}
    {chat.transcript && <details>
      <summary className="cursor-pointer text-gray-600">查看原话</summary>
      <ol className="mt-2 space-y-1 whitespace-pre-wrap break-words">
        {transcriptLines(chat.transcript).map((line, index) => <li key={index} className={evidence.has(index + 1) ? 'border-l-2 border-gray-400 pl-2 font-medium' : 'pl-2'}>{line}</li>)}
      </ol>
    </details>}
  </div>;
}
