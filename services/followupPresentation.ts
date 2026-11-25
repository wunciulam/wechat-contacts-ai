import type {ProgressRecord} from '../types.ts';
import {isChatDate,chinaDate} from './chatAnalysis.ts';
export const isTaskOverdue=(task:ProgressRecord,today=chinaDate())=>!task.completed&&isChatDate(task.date)&&task.date<today;
export function groupHistoryYears(records:ProgressRecord[]){const groups:{year:string;records:ProgressRecord[]}[]=[];for(const r of records){const year=isChatDate(r.date)?r.date.slice(0,4):'日期待确认';const last=groups.at(-1);if(last?.year===year)last.records.push(r);else groups.push({year,records:[r]});}return groups;}
export function channelLabel(record:ProgressRecord){if(record.channel==='attempt')return '联系未接通';if(record.channel==='internal')return '内部工作';if(record.channel==='phone')return '电话';if(record.channel==='meeting')return '线下见面';if(record.channel==='wechat'||record.chat)return '微信';return '渠道未记录';}
