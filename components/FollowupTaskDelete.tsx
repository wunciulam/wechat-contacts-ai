import React,{useState} from 'react';
import {Trash2} from 'lucide-react';
import type {Contact,ProgressRecord} from '../types';
import {IconButton} from './ui/Button';
import FollowupRecordDialog from './FollowupRecordDialog';
export type DeleteTask=(id:string,task:ProgressRecord)=>Promise<Contact>;
export default function FollowupTaskDelete({contactId,task,onDelete}:{contactId:string;task:ProgressRecord;onDelete:DeleteTask}){
 const [open,setOpen]=useState(false);
 return <><IconButton className="followup-task-delete" aria-label={'删除待办：'+task.content} title="删除待办" onClick={()=>setOpen(true)}><Trash2 size={18}/></IconButton>{open&&<FollowupRecordDialog record={task} mode="delete" onClose={()=>setOpen(false)} onSaved={()=>setOpen(false)} onMutate={()=>onDelete(contactId,task)}/>}</>;
}
