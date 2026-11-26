'use strict';
const $ = id => document.getElementById(id);
let tabId, busy=false;
async function invoke(action, value) {
  if (!tabId) throw new Error('请在明亚工作台页面打开插件。');
  const results=await chrome.scripting.executeScript({target:{tabId,allFrames:true},world:'MAIN',
    func:(action,value)=>{
      if(!window.__mingyaExport)return null;
      try{return {ok:true,data:window.__mingyaExport[action](value)};}
      catch(error){return {ok:false,error:error.message};}
    },args:[action,value??null]});
  const responses=results.map(r=>r.result).filter(Boolean);
  const result=responses.find(r=>r.ok&&r.data?.ready)||responses[0];
  if(!result)throw new Error('请刷新工作台，再依次进入顶部「保单」和内页「保单」。');
  if(!result.ok)throw new Error(result.error);
  return result.data;
}
function render(s){
  $('message').textContent=s.message;
  $('count').textContent=String(s.count);
  $('progress').textContent=`/ ${s.total??'—'} 份 · 详情 ${s.detailDone} 份${s.failed?` · 失败 ${s.failed} 份`:''}`;
  $('start').disabled=!s.ready||s.running;
  $('start').textContent=s.count?'重新采集':'开始采集';
  $('start').classList.toggle('primary',!s.count);
  $('import').classList.toggle('primary',!!s.count&&!s.running);
  $('start').hidden=s.running;$('stop').hidden=!s.running;
  $('scope').disabled=s.running;$('clear').disabled=s.running;
  $('import').disabled=$('excel').disabled=$('json').disabled=s.running||!s.count;
}
async function refresh(){if(busy)return;try{render(await invoke('status'));}catch(error){$('message').textContent=error.message;}}
async function action(name,value){busy=true;try{render(await invoke(name,value));}catch(error){$('message').textContent=error.message;}finally{busy=false;}}
$('start').onclick=()=>action('start',$('scope').value);
$('stop').onclick=()=>action('stop');$('clear').onclick=()=>action('clear');
function stamp(){return new Date().toLocaleString('sv-SE',{timeZone:'Asia/Shanghai'}).replace(/[-:]/g,'').replace(' ','_');}
async function download(format){
  busy=true;
  try{
    const payload=await invoke('export');
    if(!payload.records.length)throw new Error('还没有采集到保单。');
    const name=`明亚保单_${payload.records.length}份_${payload.status.complete?'完整':'部分'}_${stamp()}`;
    if(format==='xlsx'){
      const book=MingyaFile.workbook(payload,XLSX);
      XLSX.writeFile(book,`${name}.xlsx`,{compression:true});
    }else{
      const url=URL.createObjectURL(new Blob([JSON.stringify(payload,null,2)],{type:'application/json;charset=utf-8'}));
      const a=document.createElement('a');a.href=url;a.download=`${name}.json`;a.click();setTimeout(()=>URL.revokeObjectURL(url),30000);
    }
    $('message').textContent=payload.status.complete?'文件已生成，请在浏览器下载列表查看。':'已导出部分数据；请查看文件中的「采集结果」。';
  }catch(error){$('message').textContent=error.message;}finally{busy=false;}
}
$('excel').onclick=()=>download('xlsx');$('json').onclick=()=>download('json');
chrome.tabs.query({active:true,currentWindow:true}).then(tabs=>{tabId=tabs[0]?.id;refresh();}).catch(error=>{$('message').textContent=error.message;});
setInterval(refresh,1200);

$('import').onclick=async()=>{
  busy=true;
  try {
    const payload=await invoke('export');
    if(!payload.records.length)throw new Error('请先采集保单。');
    $('message').textContent='正在连接跟单仔…';
    const url='https://insurance-rose-seven.vercel.app/';
    const candidates=await chrome.tabs.query({url:url+'*'});
    const target=candidates[0]||await chrome.tabs.create({url,active:false});
    let ready=false;
    for(let n=0;n<60;n++){
      try {
        const result=await chrome.scripting.executeScript({target:{tabId:target.id},func:()=>document.documentElement.dataset.mingyaImport==='1'});
        if(result[0]?.result){ready=true;break;}
      }catch{ /* Wait for the app to finish navigation and load customer data. */ }
      await new Promise(resolve=>setTimeout(resolve,300));
    }
    if(!ready)throw new Error('跟单仔尚未就绪，请打开已更新的跟单仔页面后重试。');
    await chrome.scripting.executeScript({target:{tabId:target.id},world:'MAIN',func:payload=>{
      window.postMessage({type:'MINGYA_IMPORT_PREVIEW',payload},window.location.origin);
    },args:[payload]});
    await chrome.tabs.update(target.id,{active:true});
  }catch(error){$('message').textContent=error.message;}
  finally{busy=false;}
};
