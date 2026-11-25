import type {ChatMessage} from '../types.ts';
import {isChatDate} from './chatAnalysis.ts';
export interface VisionTile {dataUrl:string;width:number;height:number;top:number;}
export interface VisionBubble {text:string;speaker:ChatMessage['speaker'];date:string;time:string;dateLabel?:string;reviewRequired:boolean;image:number;box:[number,number,number,number];continuesBefore?:boolean;continuesAfter?:boolean;}
export interface LocatedBubble extends VisionBubble {top:number;bottom:number;segmentTop?:number;}
export function validateVisionBubbles(value:any,tileCount:number):VisionBubble[]{
 if(!Array.isArray(value?.messages)||value.messages.length>1000)throw Error('识别结果格式不完整，请重试。');
 const oneBased=value.messages.length>0&&value.messages.every((m:any)=>Number.isInteger(Number(m?.image))&&Number(m.image)>=1&&Number(m.image)<=tileCount)&&value.messages.some((m:any)=>Number(m.image)===tileCount);
 return value.messages.map((m:any,index:number)=>{
  if(!m||typeof m.text!=='string'||!m.text.trim()||m.text.length>30000)throw Error('识别结果缺少气泡原文，请重试。');
  const role=typeof m.speaker==='string'?m.speaker.trim():'';const aliases:Record<string,string>={'客户':'customer','对方':'customer','我':'self','自己':'self'};const speaker=(aliases[role]||role) as ChatMessage['speaker'];
  const image=Number(m.image)-(oneBased?1:0);let uncertain=!Number.isInteger(image)||image<0||image>=tileCount;
  const box=Array.isArray(m.box)&&m.box.length===4?m.box.map(Number):[];
  const validBox=box.length===4&&box.every(Number.isFinite)&&box.every((v:number)=>v>=0&&v<=1000)&&box[2]>box[0]&&box[3]>box[1];
  if(!validBox)uncertain=true;
  const y=Math.min(990,Math.floor(index*980/Math.max(1,value.messages.length)));
  return {text:m.text.trim(),speaker:['self','customer','unknown'].includes(speaker)?speaker:'unknown',date:isChatDate(m.date)&&(!(typeof m.dateLabel==='string'&&m.dateLabel)||m.dateLabel.includes(m.date.slice(0,4)))?m.date:'',time:typeof m.time==='string'&&/^([01]\d|2[0-3]):[0-5]\d$/.test(m.time)?m.time:'',dateLabel:typeof m.dateLabel==='string'?m.dateLabel.slice(0,60):'',reviewRequired:uncertain||m.reviewRequired!==false||!['self','customer'].includes(speaker),image:uncertain&&(!Number.isInteger(image)||image<0||image>=tileCount)?0:image,box:validBox?box:[0,y,1000,Math.min(1000,y+10)],continuesBefore:m.continuesBefore===true,continuesAfter:m.continuesAfter===true};
 });
}
function overlapText(a:string,b:string){for(let n=Math.min(a.length,b.length);n>=4;n--)if(a.slice(-n)===b.slice(0,n))return n;return 0;}
const compact=(s:string)=>s.replace(/\s/g,'');
export function mergeLocatedBubbles(previous:LocatedBubble[],incoming:LocatedBubble[]):LocatedBubble[]{
 const result=previous.map(m=>({...m}));
 for(const row of incoming){
  const match=result.findIndex((old,i)=>{
    const separateCrop=i<previous.length||(old.segmentTop!==undefined&&row.segmentTop!==undefined&&old.segmentTop!==row.segmentTop);
    const intersects=Math.min(old.bottom,row.bottom)>Math.max(old.top,row.top);
    const continuation=Boolean(old.continuesAfter||old.continuesBefore||row.continuesBefore||row.continuesAfter)&&Math.min(compact(old.text).length,compact(row.text).length)>=8;
    const contains=compact(old.text)===compact(row.text)||compact(old.text).includes(compact(row.text))||compact(row.text).includes(compact(old.text));
    return separateCrop&&old.speaker===row.speaker&&(intersects||continuation)&&contains;
  });
  if(match<0){
   const fragment=result.findIndex((old,i)=>(i<previous.length||old.segmentTop!==undefined&&row.segmentTop!==undefined&&old.segmentTop!==row.segmentTop)&&old.speaker===row.speaker&&(old.continuesAfter||row.continuesBefore)&&Math.min(old.bottom,row.bottom)>Math.max(old.top,row.top)&&overlapText(old.text,row.text)>3);
   if(fragment>=0){const old=result[fragment],n=overlapText(old.text,row.text);result[fragment]={...old,text:old.text+row.text.slice(n),bottom:Math.max(old.bottom,row.bottom),continuesAfter:row.continuesAfter,reviewRequired:true};}else result.push({...row});continue;
  }
  const old=result[match],complete=compact(row.text).length>=compact(old.text).length?row:old;
  result[match]={...complete,date:complete.date||old.date||row.date,time:complete.time||old.time||row.time,top:Math.min(old.top,row.top),bottom:Math.max(old.bottom,row.bottom),reviewRequired:complete.reviewRequired};
 }
 return result;
}
export function mergeVisionPages(pages:ChatMessage[][]):ChatMessage[]{
 const result:ChatMessage[]=[];
 const same=(a:ChatMessage,b:ChatMessage)=>a.speaker===b.speaker&&a.date===b.date&&a.time===b.time&&compact(a.text)===compact(b.text);
 for(const page of pages){let overlap=0;for(let n=Math.min(result.length,page.length,20);n>0;n--){if(result.slice(-n).every((a,i)=>same(a,page[i]))&&(n>=2||Boolean(page[0].time)&&compact(page[0].text).length>=6)){overlap=n;break;}}result.push(...page.slice(overlap));}
 return result;
}
