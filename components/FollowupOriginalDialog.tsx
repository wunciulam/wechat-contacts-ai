import React from 'react';
import type {ProgressRecord} from '../types';
import WorkspaceDialog from './WorkspaceDialog';import Tag from './ui/Tag';
export default function FollowupOriginalDialog({record,onClose}:{record:ProgressRecord;onClose:()=>void}){
 return <WorkspaceDialog title="聊天原话" subtitle={record.date} size="chat" onClose={onClose}><div className="followup-original-messages">{record.chat?.messages?.length?record.chat.messages.map((m,i)=><div key={m.id+'-'+i}><header><strong>{m.speaker==='self'?'我':m.speaker==='customer'?'客户':'待核对'}</strong>{m.time&&<time>{m.time}</time>}{m.reviewRequired&&<Tag tone="amber">原文待核对</Tag>}</header><p className="whitespace-pre-wrap break-words">{m.text}</p></div>):<p className="whitespace-pre-wrap">{record.chat?.transcript}</p>}</div></WorkspaceDialog>;
}
