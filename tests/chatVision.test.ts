import test from 'node:test';
import assert from 'node:assert/strict';
import {validateVisionBubbles,mergeLocatedBubbles,mergeVisionPages} from '../services/chatVision.ts';
import {recognizeChatVision} from '../server/chatVision.ts';
const bubble=(text='第一行\n第二行',more:any={})=>({text,speaker:'customer',date:'2026-11-25',time:'10:30',reviewRequired:false,image:0,box:[100,100,800,300],...more});
const tile={dataUrl:'data:image/png;base64,iVBORw0KGgo=',width:780,height:1200,top:0};
test('vision sends actual image blocks with Flash independently of selected analysis model',async()=>{
 const original=fetch;let sent:any;globalThis.fetch=async(url,init)=>{assert.equal(url,'https://api.deepseek.com/chat/completions');sent=JSON.parse(String(init?.body));return new Response(JSON.stringify({choices:[{finish_reason:'stop',message:{content:JSON.stringify({messages:[bubble()]})}}]}));};
 try{const out=await recognizeChatVision({images:[tile]},{DEEPSEEK_API_KEY:'fixture-not-real',DEEPSEEK_MODEL:'deepseek-v4-pro'});assert.equal(sent.model,'deepseek-flash');assert.equal(sent.messages[1].content[1].image_url.url,tile.dataUrl);assert.equal(sent.messages[1].content[1].image_url.detail,'original');assert.equal(out.messages.length,1);assert.equal(out.messages[0].text,'第一行\n第二行');}finally{globalThis.fetch=original;}
});
test('unknown dates are not fabricated and unreadable/unknown-role content needs review',()=>{
 const rows=validateVisionBubbles({messages:[bubble('看不清',{date:'11月25日',speaker:'unknown',reviewRequired:false})]},1);assert.equal(rows[0].date,'');assert.equal(rows[0].reviewRequired,true);assert.equal(validateVisionBubbles({messages:[bubble('x',{image:4})]},1)[0].reviewRequired,true);assert.equal(validateVisionBubbles({messages:[bubble('x',{box:[1,3,1,3]})]},1)[0].reviewRequired,true);
});
test('overlapping crops merge same physical bubble, without deleting distinct repeated replies',()=>{
 const a:any={...bubble('完整气泡'),top:100,bottom:300};const copy:any={...a,top:120,bottom:300};const later:any={...a,top:500,bottom:600};const out=mergeLocatedBubbles([a],[copy,later]);assert.equal(out.length,2);const repeated=mergeLocatedBubbles([],[a,{...a}]);assert.equal(repeated.length,2);
 const joined=mergeLocatedBubbles([{...a,text:'前半段共同内容',continuesAfter:true}],[{...copy,text:'共同内容后半段',continuesBefore:true}]);assert.equal(joined[0].text,'前半段共同内容后半段');assert.equal(joined[0].reviewRequired,true);
});
test('page overlap uses conversation context; isolated short identical replies are preserved',()=>{
 const m=(id:string,text:string,time='10:30')=>({id,text,time,date:'2026-11-25',speaker:'self' as const});assert.equal(mergeVisionPages([[m('a','发你一份完整的方案比较表')],[m('b','发你一份完整的方案比较表'),m('c','好的')]]).length,2);assert.equal(mergeVisionPages([[m('a','好')],[m('b','好')]]).length,2);
});
test('bad image, missing key and incomplete upstream output fail without false success',async()=>{
 await assert.rejects(recognizeChatVision({images:[tile]},{}),/尚未配置/);await assert.rejects(recognizeChatVision({images:[{...tile,dataUrl:'https://example.com/image.png'}]},{DEEPSEEK_API_KEY:'fixture'}),/数据无效/);
 const original=fetch;globalThis.fetch=async()=>new Response(JSON.stringify({choices:[{finish_reason:'length',message:{content:'{}'}}]}));try{await assert.rejects(recognizeChatVision({images:[tile]},{DEEPSEEK_API_KEY:'fixture'}),/未完整返回/);}finally{globalThis.fetch=original;}
});

test('real synthetic long screenshot response merges cut + full versions of the same multiline bubble',async()=>{
 const {readFileSync}=await import('node:fs');const result=JSON.parse(readFileSync(new URL('./fixtures/vision-long-model-output.json',import.meta.url),'utf8'));
 const tiles=[{top:0,height:2051},{top:1731,height:2051},{top:3462,height:1538}];
 const located=validateVisionBubbles(result,3).map(m=>({...m,segmentTop:tiles[m.image].top,top:tiles[m.image].top+m.box[1]*tiles[m.image].height/1000,bottom:tiles[m.image].top+m.box[3]*tiles[m.image].height/1000}));
 const rows=mergeLocatedBubbles([],located);assert.equal(rows.length,5);assert.equal(rows[1].text,'可以，先把保障表发我。\n我核对保障范围后，\n再回复重复保障和缺口。');assert.equal(rows[1].reviewRequired,false);assert.equal(rows[1].continuesAfter,false);
});
