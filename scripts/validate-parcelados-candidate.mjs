import fs from 'node:fs'
import crypto from 'node:crypto'
const folder=new URL('../specs/009-compromissos-parcelados-emprestimos/',import.meta.url)
const base=fs.readFileSync(new URL('../firestore.rules',import.meta.url),'utf8'),source=fs.readFileSync(new URL('firestore-parcelados.candidate.rules',folder),'utf8')
const suite=JSON.parse(fs.readFileSync(new URL('rules-evaluation-cases.json',folder),'utf8'))
const manifest=JSON.parse(fs.readFileSync(new URL('candidate-manifest.json',folder),'utf8'))
const hash=s=>crypto.createHash('sha256').update(s).digest('hex')
const errors=[]
// Lexical check only: do not present this as a Firebase compiler or evaluator.
let mode='code',masked='',quote='',escaped=false
for(let i=0;i<source.length;i++){
 const c=source[i],next=source[i+1]
 if(mode==='line'){masked+=c==='\n'?'\n':' ';if(c==='\n')mode='code';continue}
 if(mode==='block'){if(c==='*'&&next==='/'){masked+='  ';i++;mode='code'}else masked+=c==='\n'?'\n':' ';continue}
 if(mode==='string'){masked+=c==='\n'?'\n':' ';if(escaped)escaped=false;else if(c==='\\')escaped=true;else if(c===quote)mode='code';continue}
 if(c==='/'&&next==='/'){masked+='  ';i++;mode='line';continue}
 if(c==='/'&&next==='*'){masked+='  ';i++;mode='block';continue}
 if(c==='\''||c==='"'){mode='string';quote=c;masked+=' ';continue}
 masked+=c
}
if(mode==='string'||mode==='block')errors.push('Unterminated string/comment')
const stack=[];const closing={'}':'{',')':'(',']':'['}
for(const c of masked)if(['{','(','['].includes(c))stack.push(c);else if(c in closing&&stack.pop()!==closing[c])errors.push('Unbalanced delimiters')
if(stack.length)errors.push('Unclosed delimiter')
const functions=[]
for(const m of masked.matchAll(/function\s+(\w+)\s*\(([^)]*)\)\s*\{/g)){
 const name=m[1],parameters=m[2].trim()?m[2].split(',').length:0
 let depth=1,j=m.index+m[0].length
 const start=j
 while(j<masked.length&&depth){if(masked[j]==='{')depth++;if(masked[j]==='}')depth--;j++}
 const body=masked.slice(start,j-1),bindings=[...body.matchAll(/\blet\s+/g)].length
 if(parameters>7)errors.push(name+': too many parameters');if(bindings>10)errors.push(name+': too many lets')
 functions.push({name,parameters,bindings,body})
}
const names=functions.map(f=>f.name)
if(new Set(names).size!==names.length)errors.push('Duplicate function declarations')
const byName=new Map(functions.map(f=>[f.name,f])),depthMemo=new Map()
function depthOf(name,path=[]){if(path.includes(name)){errors.push('Recursive call: '+name);return 100}if(depthMemo.has(name))return depthMemo.get(name);const f=byName.get(name);const children=[...f.body.matchAll(/\b(\w+)\s*\(/g)].map(m=>m[1]).filter(n=>byName.has(n));const d=1+Math.max(0,...children.map(c=>depthOf(c,[...path,name])));depthMemo.set(name,d);return d}
const maxDepth=Math.max(...names.map(n=>depthOf(n)))
if(maxDepth>10)errors.push('Conservative helper-depth limit exceeded: '+maxDepth)
if(Buffer.byteLength(source)>256*1024)errors.push('Source size exceeded')
if(hash(base)!==manifest.baseSha256)errors.push('Base source changed since generation')
if(hash(source)!==manifest.candidateSha256)errors.push('Candidate manifest hash mismatch')
const caseNames=suite.cases.map(c=>c.name)
if(new Set(caseNames).size!==caseNames.length)errors.push('Duplicate case names')
for(const c of suite.cases){
 if(!['ALLOW','DENY'].includes(c.test.expectation)||c.test.expressionReportLevel!=='FULL')errors.push('Case shape: '+c.name)
 const mocks=c.test.functionMocks.map(m=>m.function+'|'+m.args[0].exactValue)
 if(new Set(mocks).size!==mocks.length)errors.push('Duplicate mock path: '+c.name)
 if(!c.test.request.path.startsWith('/databases/(default)/documents/users/fixture/'))errors.push('Fixture outside synthetic owner: '+c.name)
}
const docs=suite.cases.filter(c=>c.test.request.resource?.data).map(c=>({name:c.name,bytes:Buffer.byteLength(JSON.stringify(c.test.request.resource.data))}))
const positiveDocs=docs.filter(d=>suite.cases.find(c=>c.name===d.name).test.expectation==='ALLOW')
const result={scope:'local-lexical-and-fixture-checks-only',ok:errors.length===0,sourceSha256:hash(source),suiteSha256:hash(JSON.stringify(suite)),sourceBytes:Buffer.byteLength(source),functions:functions.length,maxHelperDepth:maxDepth,cases:suite.cases.length,allow:suite.cases.filter(c=>c.test.expectation==='ALLOW').length,deny:suite.cases.filter(c=>c.test.expectation==='DENY').length,maxPositiveSampleJsonBytes:Math.max(...positiveDocs.map(d=>d.bytes)),errors,compiler:'NOT_RUN',officialEvaluation:'NOT_ASSESSED_BY_LOCAL_CHECK',expressions:'NOT_MEASURED',allInputSizeBound:'NOT_PROVEN',productionSourceUnchanged:true}
fs.writeFileSync(new URL('local-validation.json',folder),JSON.stringify(result,null,2)+'\n')
console.log(JSON.stringify(result));if(!result.ok)process.exitCode=1
