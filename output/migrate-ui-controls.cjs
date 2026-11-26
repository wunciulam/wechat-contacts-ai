const ts=require('typescript'),fs=require('fs'),path=require('path');
for(const name of fs.readdirSync('components').filter(n=>n.endsWith('.tsx'))){
 const file=path.join('components',name),src=fs.readFileSync(file,'utf8'),sf=ts.createSourceFile(file,src,ts.ScriptTarget.Latest,true,ts.ScriptKind.TSX),edits=[],used=new Set();
 const replace=(a,b,text)=>edits.push({a,b,text});
 function attrs(el){return el.attributes.properties;}
 function migrate(el,closing){const tag=el.tagName.getText(sf);if(!['input','textarea','select'].includes(tag))return;
  const attributes=attrs(el),type=attributes.find(a=>a.name?.getText(sf)==='type');if(tag==='input'&&type?.initializer&&ts.isStringLiteral(type.initializer)&&['file','checkbox','radio','hidden'].includes(type.initializer.text))return;
  const to=tag==='input'?'Input':tag==='textarea'?'Textarea':'Select';used.add(to);replace(el.tagName.getStart(sf),el.tagName.end,to);if(closing)replace(closing.tagName.getStart(sf),closing.tagName.end,to);
  for(const attr of attributes){
   const n=attr.name?.getText(sf);
   if(n==='className'&&attr.initializer&&ts.isStringLiteral(attr.initializer)){
    let c=attr.initializer.text.split(/\s+/).filter(x=>x!=='input'&&!/^(text-xs|font-(medium|mono|semibold)|py-|px-|pl-|pr-)/.test(x)).join(' ');
    let parent=el.parent,compact=false;while(parent&&!ts.isFunctionLike(parent)){if(ts.isJsxElement(parent)&&parent.openingElement.tagName.getText(sf)==='td')compact=true;parent=parent.parent;}
    if(compact&&tag!=='select')c='input-sm '+c;
    replace(attr.initializer.getStart(sf),attr.initializer.end,JSON.stringify(c.trim()));
   }
   if(tag==='select'&&n==='onChange'&&attr.initializer&&ts.isJsxExpression(attr.initializer)){
    const expr=attr.initializer.expression;
    if(expr&&ts.isArrowFunction(expr)&&expr.parameters.length===1){const param=expr.parameters[0].name.getText(sf);let body=expr.body.getText(sf).replace(new RegExp('\\b'+param+'\\.target\\.value','g'),'selectedValue');replace(attr.getStart(sf),attr.end,`onValueChange={selectedValue => ${body}}`);}
   }
  }
 }
 function visit(n){if(ts.isJsxSelfClosingElement(n))migrate(n);if(ts.isJsxElement(n))migrate(n.openingElement,n.closingElement);ts.forEachChild(n,visit);}visit(sf);
 if(!edits.length)continue;let out=src;for(const e of edits.sort((a,b)=>b.a-a.a))out=out.slice(0,e.a)+e.text+out.slice(e.b);
 const inp=[...used].filter(x=>x!=='Select');let imports='';if(inp.length)imports+=`import ${used.has('Input')?'Input':''}${used.has('Input')&&used.has('Textarea')?', ':''}${used.has('Textarea')?'{Textarea}':''} from './ui/Input';\n`;if(used.has('Select'))imports+="import Select from './ui/Select';\n";
 fs.writeFileSync(file,imports+out);
}
