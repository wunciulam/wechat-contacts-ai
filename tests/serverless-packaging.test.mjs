import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';import os from 'node:os';import path from 'node:path';import {spawnSync} from 'node:child_process';import ts from 'typescript';
test('compiled serverless AI entrypoints cold-start using emitted JS dependencies',()=>{
 const tmp=fs.mkdtempSync(path.join(os.tmpdir(),'insurance-functions-')),root=process.cwd(),seen=new Set();
 try{
 fs.writeFileSync(path.join(tmp,'package.json'),JSON.stringify({type:'module'}));
 const config=ts.readConfigFile(path.join(root,'tsconfig.json'),ts.sys.readFile).config;
 const options=ts.convertCompilerOptionsFromJson(config.compilerOptions,root).options;
 function emit(relative){
  if(seen.has(relative))return;seen.add(relative);
  const file=path.join(root,relative),source=fs.readFileSync(file,'utf8'),ast=ts.createSourceFile(file,source,ts.ScriptTarget.Latest,true);
  for(const n of ast.statements){if(!ts.isImportDeclaration(n)||n.importClause?.isTypeOnly||!ts.isStringLiteral(n.moduleSpecifier))continue;const spec=n.moduleSpecifier.text;if(!spec.startsWith('.'))continue;
   const stem=path.resolve(path.dirname(file),spec),dependency=[stem,stem.replace(/\.js$/,'.ts'),stem+'.ts'].find(p=>fs.existsSync(p)&&fs.statSync(p).isFile());assert.ok(dependency,'missing source dependency '+spec);emit(path.relative(root,dependency));
  }
  const output=path.join(tmp,relative.replace(/\.tsx?$/,'.js'));fs.mkdirSync(path.dirname(output),{recursive:true});fs.writeFileSync(output,ts.transpileModule(source,{fileName:file,compilerOptions:{...options,noEmit:false}}).outputText);
 }
 for(const entry of ['api/chat-vision.ts','api/followup-ai.ts','api/ai-settings.ts'])emit(entry);
 const check="for(const name of ['chat-vision','followup-ai']){const {default:handler}=await import('./api/'+name+'.js');let code;const res={setHeader(){},status(v){code=v;return this;},json(){return this;}};await handler({method:'POST',body:{appId:'wrong'},headers:{}},res);if(code!==403)throw Error(name+' failed guarded cold start');}const {default:settings}=await import('./api/ai-settings.js');let code;await settings({method:'GET'},{setHeader(){},status(v){code=v;return this;},json(v){if(v.configured)throw Error('unexpected test key');}});if(code!==200)throw Error('settings failed');";
 fs.writeFileSync(path.join(tmp,'check.mjs'),check);
 const result=spawnSync(process.execPath,['check.mjs'],{cwd:tmp,encoding:'utf8',env:{...process.env,VITE_APP_ID:'packaging-fixture',DEEPSEEK_API_KEY:''}});
 assert.equal(result.status,0,result.stderr||result.stdout);assert.ok(seen.size>=6);
 }finally{fs.rmSync(tmp,{recursive:true,force:true});}
});
