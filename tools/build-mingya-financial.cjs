const fs=require('node:fs'),ts=require('typescript');
const source=fs.readFileSync('services/mingyaFinancial.ts','utf8');
const js=ts.transpileModule(source,{compilerOptions:{module:ts.ModuleKind.CommonJS,target:ts.ScriptTarget.ES2020}}).outputText;
fs.writeFileSync('tools/mingya-export-extension/financial.js',`/* Generated from services/mingyaFinancial.ts; do not edit by hand. */\n(function(root){const exports={};\n${js}\nroot.MingyaFinancial=exports;})(globalThis);\n`);
