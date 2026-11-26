const ts=require('typescript'),fs=require('fs');
for(const file of ['App.tsx',...fs.readdirSync('components').filter(x=>x.endsWith('.tsx')).map(x=>'components/'+x)]){
 const src=fs.readFileSync(file,'utf8'),sf=ts.createSourceFile(file,src,ts.ScriptTarget.Latest,true,ts.ScriptKind.TSX),edits=[],used=new Set();const put=(a,b,t)=>edits.push({a,b,t});
 function migrate(open,close,children=[]){if(open.tagName.getText(sf)!=='button')return;
 const attrs=open.attributes.properties,attr=n=>attrs.find(a=>a.name?.getText(sf)===n),cl=attr('className');let classes=cl?.initializer&&ts.isStringLiteral(cl.initializer)?cl.initializer.text:null;
 const significant=children.filter(c=>!ts.isJsxText(c)||c.getText(sf).trim());const icon=significant.length===1&&ts.isJsxSelfClosingElement(significant[0])&&/^[A-Z]/.test(significant[0].tagName.getText(sf));const hasBtn=classes?.split(/\s/).includes('btn');const target=icon&&!hasBtn?'IconButton':'Button';used.add(target);put(open.tagName.getStart(sf),open.tagName.end,target);if(close)put(close.tagName.getStart(sf),close.tagName.end,target);
 let extra='';if(target==='Button'){
  let variant='plain';if(hasBtn){variant=classes.includes('btn-primary')?'primary':classes.includes('btn-ghost')?'ghost':classes.includes('btn-danger')?'danger':'secondary';}
  extra+=` variant="${variant}"`;if(hasBtn&&classes.includes('btn-sm'))extra+=' size="sm"';
  if(classes){classes=classes.split(/\s+/).filter(c=>!/^btn(?:-(?:primary|secondary|ghost|danger|sm))?$/.test(c)&&(!hasBtn||!(/^(px-|py-|p-|rounded|text-(xs|sm)|min-h-)/.test(c)))).join(' ');put(cl.initializer.getStart(sf),cl.initializer.end,JSON.stringify(classes));}
  const txt=significant.map(c=>c.getText(sf)).join('');if(hasBtn&&variant==='primary'&&/保存|确认添加|确认导入/.test(txt))extra+=' validate';
 }else{
  if(classes){classes=classes.split(/\s+/).filter(c=>!/^p[xy]?-[\d.]+$/.test(c)&&c!=='icon-btn').join(' ');put(cl.initializer.getStart(sf),cl.initializer.end,JSON.stringify(classes));}
  if(!attr('aria-label')){const title=attr('title');if(title?.initializer)extra+=' aria-label='+title.initializer.getText(sf);else{const n=significant[0].tagName.getText(sf),action=attr('onClick')?.getText(sf)||'';const label=/removeTag|remove.*tag/i.test(action)?'移除标签':({X:'关闭',Trash2:'删除',Edit2:'编辑',Check:'确认',Plus:'添加',Menu:'打开菜单',GripVertical:'拖动排序',ChevronDown:'展开',ChevronUp:'收起',Search:'搜索',Copy:'复制'}[n]||'打开选项');extra+=' aria-label='+JSON.stringify(label);}}
 }
 put(open.attributes.end,open.attributes.end,extra);
 }
 function visit(n){if(ts.isJsxSelfClosingElement(n))migrate(n);if(ts.isJsxElement(n))migrate(n.openingElement,n.closingElement,n.children);ts.forEachChild(n,visit);}visit(sf);
 if(edits.length){let out=src;for(const e of edits.sort((a,b)=>b.a-a.a))out=out.slice(0,e.a)+e.t+out.slice(e.b);const imp=file==='App.tsx'?'./components/ui/Button':'./ui/Button';if(!src.includes(`from '${imp}'`))out=`import ${used.has('Button')?'Button':''}${used.has('Button')&&used.has('IconButton')?', ':''}${used.has('IconButton')?'{IconButton}':''} from '${imp}';\n`+out;else if(used.has('IconButton')&&!src.includes('{IconButton}'))out=out.replace(`import Button from '${imp}';`,`import Button,{IconButton} from '${imp}';`);fs.writeFileSync(file,out);}
}
