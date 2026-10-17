import { readFileSync } from 'node:fs'
import { resolve } from 'node:path'
import { fileURLToPath } from 'node:url'
import { validateManifest } from '../tests/integration/support/manifest.ts'
import type { Manifest } from '../tests/integration/support/manifest.ts'
export function fixtureControle(manifest: Manifest, project: string, run: string, uid: string, c: string, id: string) {
 const documents=validateManifest(manifest,project,run,manifest.uids)
 if(!['categorias','contas'].includes(c)||!/^[A-Za-z0-9-]{1,64}$/.test(id)||!manifest.uids.includes(uid))throw new Error('FIXTURE_SCOPE')
 const path=`users/${uid}/usoCadastros/${c}__${id}`
 if(!documents.some(d=>d.path===path&&d.owner===uid)||!documents.some(d=>d.path===`users/${uid}/${c}/${id}`&&d.owner===uid))throw new Error('FIXTURE_NOT_INVENTORIED')
 return {path,fields:{schemaVersion:{integerValue:'1'},colecao:{stringValue:c},cadastroId:{stringValue:id},consumidorTipo:{stringValue:c==='contas'?'pagamento':'receita'},consumidorId:{stringValue:'fixture-sem-consumidor-habilitado'},papel:{stringValue:c==='contas'?'movimentacao':'classificacao'},createdAt:{timestampValue:new Date().toISOString()}}}
}
async function main(){
 const args=process.argv.slice(2)
 const arg=(flag:string)=>{const i=args.indexOf(flag);if(i<0||!args[i+1]||args[i+1].startsWith('--'))throw new Error('Argumento obrigatório: '+flag);return args[i+1]}
 const project=arg('--project'),run=arg('--run'),uid=arg('--uid')
 if(process.env.TEST_EXPECTED_PROJECT_ID!==project||process.env.TEST_RUN_ID!==run)throw new Error('TARGET_MISMATCH')
 const manifest=JSON.parse(readFileSync(resolve(arg('--manifest')),'utf8')) as Manifest
 const control=fixtureControle(manifest,project,run,uid,arg('--collection'),arg('--id'))
 console.log(JSON.stringify({mode:args.includes('--execute')?'execute':'dry-run',path:control.path,project}))
 if(!args.includes('--execute'))return
 const token=process.env.CLEANUP_GOOGLE_ACCESS_TOKEN
 if(!token)throw new Error('Credencial operacional separada ausente')
 // createDocument refuses an existing target. Never overwrite or widen the scope.
 const parent=control.path.slice(0,control.path.lastIndexOf('/')),id=control.path.slice(control.path.lastIndexOf('/')+1)
 const url=`https://firestore.googleapis.com/v1/projects/${encodeURIComponent(project)}/databases/(default)/documents/${parent.split('/').map(encodeURIComponent).join('/')}?documentId=${encodeURIComponent(id)}`
 const r=await fetch(url,{method:'POST',headers:{Authorization:`Bearer ${token}`,'Content-Type':'application/json'},body:JSON.stringify({fields:control.fields}),signal:AbortSignal.timeout(10000)})
 if(!r.ok)throw new Error('Preparação recusada: '+r.status)
 console.log('Controle fictício criado no path inventariado; nenhuma permissão cliente alterada.')
}
if(process.argv[1]&&resolve(process.argv[1])===fileURLToPath(import.meta.url)) await main()
