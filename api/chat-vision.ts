import {recognizeChatVision} from '../server/chatVision.js';
const requests=new Map<string,{time:number;count:number}>();
export default async function handler(req:any,res:any){
 res.setHeader('Cache-Control','no-store');if(req.method!=='POST')return res.status(405).json({message:'仅支持POST。'});
 if(!process.env.VITE_APP_ID||req.body?.appId!==process.env.VITE_APP_ID)return res.status(403).json({message:'数据空间不匹配。'});
 const ip=String(req.headers['x-forwarded-for']||'local').split(',')[0],now=Date.now();let row=requests.get(ip);if(!row||now-row.time>60000){row={time:now,count:0};requests.set(ip,row);}if(++row.count>20)return res.status(429).json({message:'识别请求较多，请稍后重试。'});if(requests.size>1000)for(const [key,value]of requests)if(now-value.time>60000)requests.delete(key);
 try{return res.status(200).json(await recognizeChatVision(req.body,process.env));}catch(e){return res.status(502).json({message:e instanceof Error?e.message:'图片识别失败，请重试。'});}
}
