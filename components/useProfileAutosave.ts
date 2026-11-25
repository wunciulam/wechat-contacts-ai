import {notify,dismissNotice} from '../services/notifications';
import {useEffect,useRef,useState} from 'react';
export default function useProfileAutosave<T>(value:T,save:((v:T)=>Promise<void>)|undefined,valid:(v:T)=>boolean){
 const current=useRef(value),saved=useRef(JSON.stringify(value)),writer=useRef(save),validation=useRef(valid),running=useRef<Promise<boolean>|null>(null),mounted=useRef(true);
 current.current=value;writer.current=save;validation.current=valid;
 const [state,setState]=useState(''),[error,setError]=useState(''),key=JSON.stringify(value),dirty=key!==saved.current;
 useEffect(()=>{mounted.current=true;return()=>{mounted.current=false;};},[]);
 async function flush():Promise<boolean>{
  if(running.current)return running.current;
  if(!writer.current||JSON.stringify(current.current)===saved.current)return true;
  const work=async()=>{while(JSON.stringify(current.current)!==saved.current){const draft=structuredClone(current.current),stamp=JSON.stringify(draft);
   if(!validation.current(draft)){if(mounted.current){setError('请填写备注名或昵称。');setState('');}return false;}
   if(mounted.current){setState('正在保存…');setError('');}
   try{await writer.current!(draft);saved.current=stamp;}catch(e){if(mounted.current){setState('');setError(e instanceof Error?e.message:'自动保存失败，请重试。');}return false;}
  }if(mounted.current){setState('已保存');setError('');notify('客户资料已保存',{id:'profile-saved'});}return true;};
  const p=work();running.current=p;try{return await p;}finally{running.current=null;}
 }
 useEffect(()=>{if(!save||!dirty)return;const warn=(e:BeforeUnloadEvent)=>{e.preventDefault();e.returnValue="";};window.addEventListener("beforeunload",warn);return()=>window.removeEventListener("beforeunload",warn);},[dirty,Boolean(save)]);
 const flushRef=useRef(flush);flushRef.current=flush;
 useEffect(()=>{if(!save||!dirty)return;dismissNotice('profile-saved');setState('待保存');const timer=setTimeout(()=>void flushRef.current(),600);return()=>clearTimeout(timer);},[key,Boolean(save)]);
 return {flush,state:dirty&&state==='已保存'?'待保存':state,error,dirty};
}
