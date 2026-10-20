import fs from 'node:fs'
import crypto from 'node:crypto'

// Produce a reviewable, complete candidate. No network, credentials or deploy.
let source=fs.readFileSync(new URL('../firestore.rules',import.meta.url),'utf8')
const replacements=[
 [/(match \/users\/\{uid\}\/faturas\/\{id\} \{[\s\S]*?allow create:) if false;/,'$1 if own(uid) && catalogReady(uid) && invoiceDoc(request.resource.data) && invoiceMutation(uid,id,true);'],
 [/(match \/users\/\{uid\}\/faturas\/\{id\} \{[\s\S]*?allow update:) if false;/,'$1 if own(uid) && catalogReady(uid) && invoiceDoc(request.resource.data) && invoiceMutation(uid,id,false);'],
 [/(match \/users\/\{uid\}\/operacoesFaturas\/\{id\} \{[\s\S]*?allow create:) if false;/,'$1 if own(uid) && invoiceReceiptShape(request.resource.data) && invoiceReceiptCreate(uid,id);'],
]
const evidence=JSON.parse(fs.readFileSync(new URL('../specs/008-pagamentos-ajustes-faturas/g0-evaluation-summary.json',import.meta.url),'utf8'))
const alreadyReviewed=crypto.createHash('sha256').update(source).digest('hex')===evidence.candidateSourceSha256
for(const [pattern,replacement] of alreadyReviewed?[]:replacements){
 if(!pattern.test(source)) throw Error('UNEXPECTED_RELEASE_SOURCE: refusing to build candidate')
 source=source.replace(pattern,replacement)
}
const output=new URL('../specs/006-cartoes-ciclos-faturas/firestore-faturas.candidate.rules',import.meta.url)
fs.writeFileSync(output,source)
console.log(JSON.stringify({network:false,deploy:false,candidateSha256:crypto.createHash('sha256').update(source).digest('hex')}))
