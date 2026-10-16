import { readFileSync, writeFileSync } from 'node:fs'
import { resolve } from 'node:path'
import { validateManifest } from '../tests/integration/support/manifest.ts'
import type { Manifest } from '../tests/integration/support/manifest.ts'

const args = process.argv.slice(2)
function argument(flag: string) { const index = args.indexOf(flag); if (index < 0 || !args[index + 1] || args[index + 1].startsWith('--')) throw new Error('Obrigatório: ' + flag); return args[index + 1] }
const project = argument('--project'), runId = argument('--run'), uids = argument('--uids').split(','), file = resolve(argument('--manifest'))
if (process.env.TEST_EXPECTED_PROJECT_ID !== project || process.env.TEST_RUN_ID !== runId) throw new Error('Alvo/execução não confirmados independentemente')
if (!/^[a-z0-9-]+$/.test(project) || !/^[A-Za-z0-9_-]{8,80}$/.test(runId)) throw new Error('Escopo inválido')
const manifest = JSON.parse(readFileSync(file, 'utf8')) as Manifest
const documents = validateManifest(manifest, project, runId, uids)
console.log(JSON.stringify({ mode: args.includes('--execute') ? 'execute' : 'dry-run', count: documents.length, paths: documents.map(doc => doc.path) }))
const token = process.env.CLEANUP_GOOGLE_ACCESS_TOKEN
if (!token) {
  if (args.includes('--execute')) throw new Error('Credencial operacional separada ausente')
  console.log('Dry-run de escopo concluído. Sem credencial operacional; nenhuma consulta/exclusão executada.')
} else {
  const base = `https://firestore.googleapis.com/v1/projects/${project}/databases/(default)/documents/`
  const headers = { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' }
  const reviewedFile = file + '.reviewed.json'
  const reviewed = args.includes('--execute') ? JSON.parse(readFileSync(reviewedFile, 'utf8')) as { project: string; runId: string; updates: Record<string, string> } : undefined
  if (reviewed && (reviewed.project !== project || reviewed.runId !== runId)) throw new Error('Revisão incompatível')
  const updates: Record<string, string> = {}
  // Validate the entire scope first; fail before deleting anything if a parent has children.
  for (const doc of documents) {
    const url = base + doc.path.split('/').map(encodeURIComponent).join('/')
    const response = await fetch(url, { headers, signal: AbortSignal.timeout(10000) })
    if (response.status === 404) continue
    if (!response.ok) throw new Error('Falha ao conferir fixture')
    const data = await response.json() as { createTime: string; updateTime: string }
    if (Date.parse(data.createTime) < Date.parse(doc.registeredAt) - 5000) throw new Error('Documento preexistente: limpeza recusada')
    const children = await fetch(url + ':listCollectionIds', { method: 'POST', headers, body: JSON.stringify({ pageSize: 1 }), signal: AbortSignal.timeout(10000) })
    if (!children.ok) throw new Error('Não foi possível conferir subcoleções')
    const childData = await children.json() as { collectionIds?: string[]; nextPageToken?: string }
    if (childData.collectionIds?.length || childData.nextPageToken) throw new Error('Subcoleções encontradas: inventariar e tratar separadamente; pai não será apagado')
    if (reviewed && reviewed.updates[doc.path] !== data.updateTime) throw new Error('Fixture mudou após revisão: novo dry-run obrigatório')
    updates[doc.path] = data.updateTime
  }
  if (!args.includes('--execute')) {
    writeFileSync(reviewedFile, JSON.stringify({ project, runId, updates }, null, 2), { mode: 0o600 })
    console.log('Revisão salva. Nenhum documento excluído.')
  } else {
    for (const [path, updateTime] of Object.entries(updates)) {
      const response = await fetch(base + path.split('/').map(encodeURIComponent).join('/') + '?currentDocument.updateTime=' + encodeURIComponent(updateTime), { method: 'DELETE', headers, signal: AbortSignal.timeout(10000) })
      if (!response.ok) throw new Error('Exclusão recusada ou fixture alterada; interrompido')
    }
    console.log('Removidos somente documentos revisados: ' + Object.keys(updates).length)
  }
}
