import type {ChatMessage} from '../types';
import {validateVisionBubbles,mergeLocatedBubbles,type VisionTile,type LocatedBubble} from './chatVision';
export async function recognizeChatImage(file:File,onProgress:(message:string)=>void,signal:AbortSignal):Promise<ChatMessage[]>{
 let image:ImageBitmap;try{image=await createImageBitmap(file);}catch{throw Error('无法打开这张截图，请换成PNG或JPEG后重试。');}
 const tiles:VisionTile[]=[];
 try{
  if(image.width>12000||image.height>120000||image.width*image.height>100000000)throw Error('截图过长或过大，请分成几张后重试。');
  const width=Math.min(image.width,1600),scale=width/image.width,height=Math.round(image.height*scale);
  const tileHeight=Math.min(2200,Math.floor(1600000/width)),overlap=Math.min(320,Math.floor(tileHeight/4));
  const canvas=document.createElement('canvas'),ctx=canvas.getContext('2d',{alpha:false});if(!ctx)throw Error('此浏览器无法处理截图。');canvas.width=width;
  for(let top=0;top<height;){
   signal.throwIfAborted();let cropHeight=Math.min(tileHeight,height-top);canvas.height=cropHeight;ctx.fillStyle='white';ctx.fillRect(0,0,width,cropHeight);ctx.drawImage(image,0,top/scale,image.width,cropHeight/scale,0,0,width,cropHeight);
   if(top+cropHeight<height){
    const window=Math.min(420,Math.floor(cropHeight/3)),pixels=ctx.getImageData(0,cropHeight-window,width,window).data;let run=0,cut=0;
    for(let y=0;y<window-8;y++){const offset=y*width*4;const r=pixels[offset+8],g=pixels[offset+9],b=pixels[offset+10];let changes=0;for(let x=8;x<width-8;x+=8){const pos=offset+x*4;if(Math.abs(pixels[pos]-r)+Math.abs(pixels[pos+1]-g)+Math.abs(pixels[pos+2]-b)>36)changes++;}if(changes<=2){run++;if(run>=12)cut=y-6;}else run=0;}
    if(cut>0){cropHeight=cropHeight-window+cut;canvas.height=cropHeight;ctx.fillStyle='white';ctx.fillRect(0,0,width,cropHeight);ctx.drawImage(image,0,top/scale,image.width,cropHeight/scale,0,0,width,cropHeight);}
   }
   tiles.push({dataUrl:canvas.toDataURL('image/jpeg',.94),width,height:cropHeight,top});if(top+cropHeight>=height)break;top+=cropHeight-overlap;
  }

 }finally{image.close();}
 let rows:LocatedBubble[]=[];
 for(let start=0;start<tiles.length;){signal.throwIfAborted();let end=start;let bytes=100;
  while(end<tiles.length&&end-start<4&&bytes+tiles[end].dataUrl.length<3800000){bytes+=tiles[end].dataUrl.length;end++;}
  if(end===start)throw Error('这段截图文件过大，请改用较小截图。');const images=tiles.slice(start,end);onProgress(`正在识别截图分段 ${start+1}–${end} / ${tiles.length}…`);
  const response=await fetch('/api/chat-vision',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({appId:import.meta.env.VITE_APP_ID,images,contextDate:rows.at(-1)?.date||''}),signal:AbortSignal.any([signal,AbortSignal.timeout(130000)])});
  const data=await response.json().catch(()=>null);if(!response.ok)throw Error(data?.message||'截图识别失败，请重试。');
  const incoming=validateVisionBubbles(data,images.length).map(m=>({...m,segmentTop:images[m.image].top,top:images[m.image].top+m.box[1]*images[m.image].height/1000,bottom:images[m.image].top+m.box[3]*images[m.image].height/1000}));rows=mergeLocatedBubbles(rows,incoming);
  if(end===tiles.length)break;start=end-1;
 }
 if(!rows.length)throw Error('未识别到聊天气泡，请核对截图内容或改用清晰截图。');
 return rows.map(m=>({id:crypto.randomUUID(),date:m.date,time:m.time,speaker:m.speaker,text:m.text,reviewRequired:m.reviewRequired||m.continuesBefore||m.continuesAfter,dateLabel:m.dateLabel}));
}
