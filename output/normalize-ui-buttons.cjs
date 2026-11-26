const ts=require('typescript'),fs=require('fs');
for(const f of ['App.tsx',...fs.readdirSync('components').filter(x=>x.endsWith('.tsx')).map(x=>'components/'+x)]){
 let src=fs.readFileSync(f,'utf8'),sf=ts.createSourceFile(f,src,ts.ScriptTarget.Latest,true,ts.ScriptKind.TSX),edits=[];
 const put=(a,b,t)=>edits.push({a,b,t});
 function walk(n){if((ts.isJsxOpeningElement(n)||ts.isJsxSelfClosingElement(n))&&n.tagName.getText(sf)==='Button'){
  const attrs=n.attributes.properties,cl=attrs.find(a=>a.name?.getText(sf)==='className'),v=attrs.find(a=>a.name?.getText(sf)==='variant');if(!cl?.initializer||v?.initializer?.text!=='plain')return;
  const t=cl.initializer.getText(sf);let target='';if(t.startsWith('{btn')){target='secondary';put(cl.initializer.getStart(sf),cl.initializer.end,t==='{btn}'?'""':t.replace(/^\{btn\s*\+\s*/, '{'));}
  else if(t.includes('btn-primary')||ts.isStringLiteral(cl.initializer)&&t.includes('bg-gray-900')&&t.includes('text-white'))target='primary';
  else if(t.includes('btn-secondary'))target='secondary';
  if(target){put(v.initializer.getStart(sf),v.initializer.end,JSON.stringify(target));if(!t.startsWith('{btn')){const cleaned=t.replace(/\bbtn(?:-(?:primary|secondary|ghost|danger|sm))?\b/g,'').replace(/\b(?:px|py)-[\d.]+\b/g,'').replace(/\btext-(?:xs|sm)\b/g,'');put(cl.initializer.getStart(sf),cl.initializer.end,cleaned);}}
 }ts.forEachChild(n,walk);}walk(sf);if(edits.length){for(const e of edits.sort((a,b)=>b.a-a.a))src=src.slice(0,e.a)+e.t+src.slice(e.b);fs.writeFileSync(f,src);}
}
