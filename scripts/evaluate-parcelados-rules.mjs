import fs from 'node:fs'
import crypto from 'node:crypto'
import {pathToFileURL} from 'node:url'
const folder=new URL('../specs/009-compromissos-parcelados-emprestimos/',import.meta.url)
const provider=process.env.RULES_EVALUATION_PROVIDER ? pathToFileURL(process.env.RULES_EVALUATION_PROVIDER) : new URL('../.integration/firebase005-ops.mjs',import.meta.url)
const source=fs.readFileSync(new URL('firestore-parcelados.candidate.rules',folder),'utf8')
const suite=JSON.parse(fs.readFileSync(new URL('rules-evaluation-cases.json',folder),'utf8'))
const requested=process.argv.find(a=>a.startsWith('--case='))?.slice(7)
const selected=requested?suite.cases.filter(c=>c.name===requested):process.argv.includes('--smoke')?suite.cases.filter(c=>['createOneSeries','createOneReceipt','create5of10Series','replaceReceipt'].includes(c.name)):suite.cases
if(!selected.length)throw Error('NO_SELECTED_CASES')
const hash=s=>crypto.createHash('sha256').update(s).digest('hex')
const report={mode:'official-test-only-no-release',sourceSha256:hash(source),suiteSha256:hash(JSON.stringify(suite)),selectedCases:selected.length,project:null,issues:[],results:[]}
try {
 const {project,request,rulesHost}=await import(provider)
 if(rulesHost!=='firebaserules.googleapis.com'||!project)throw Error('INVALID_EVALUATION_SCOPE')
 report.project=project
 for(let i=0;i<selected.length;i+=12){
  const batch=selected.slice(i,i+12)
  const output=await request(rulesHost,`projects/${project}:test`,'POST',{source:{files:[{name:'firestore.rules',content:source}]},testSuite:{testCases:batch.map(c=>c.test)}})
  fs.writeFileSync(new URL(`rules-evaluation-${String(i/12).padStart(2,'0')}.json`,folder),JSON.stringify(output,null,2)+'\n')
  report.issues.push(...(output.issues??[]).map(v=>({severity:v.severity,line:v.sourcePosition?.line,description:v.description})))
  report.results.push(...(output.testResults??[]).map((r,j)=>({name:batch[j]?.name,expectation:batch[j]?.test.expectation,state:r.state,debug:r.debugMessages??[],calls:r.functionCalls?.length??0})))
  if(report.issues.some(v=>v.severity==='ERROR'))break
 }
 report.ok=report.results.length===selected.length&&report.results.every(r=>r.state==='SUCCESS'&&!r.debug.some(v=>/1000|maximum.*expressions|exceeded/i.test((typeof v==='string'?v:JSON.stringify(v)))))&&!report.issues.some(v=>v.severity==='ERROR')
}catch(e){report.ok=false;report.error={message:e.message,apiCode:e.apiCode??null,detail:e.detail??null}}
fs.writeFileSync(new URL('rules-evaluation-summary.json',folder),JSON.stringify(report,null,2)+'\n')
console.log(JSON.stringify({...report,results:report.results.map(r=>({...r,debug:r.debug.slice(0,2)}))}))
if(!report.ok)process.exitCode=1

