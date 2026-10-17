import { mkdirSync, readFileSync, writeFileSync } from 'node:fs'
import { resolve } from 'node:path'
export type Manifest = { projectId: string; runId: string; uids: string[]; documents: { path: string; owner: string; createdByRun: true; registeredAt: string; updateTime?: string }[] }
export function validateManifest(manifest: Manifest, projectId: string, runId: string, uids: string[]) {
  if (!Array.isArray(manifest.documents) || !Array.isArray(manifest.uids) || !uids.length || uids.some(uid => !/^[A-Za-z0-9_-]{1,128}$/.test(uid)) || manifest.projectId !== projectId || manifest.runId !== runId || !manifest.uids.every(uid => uids.includes(uid))) throw new Error('MANIFEST_SCOPE')
  const allowed = ['users', 'registrationRequests', 'submissionOperations', 'notificationOutbox', 'subscriptions']
  const seen = new Set<string>()
  for (const doc of manifest.documents) {
    const parts = doc.path.split('/')
    if (parts.length === 4) {
      const [root, uid, group, child] = parts
      if (root !== 'users' || uid !== doc.owner || !uids.includes(uid) || seen.has(doc.path) || !doc.createdByRun || !Number.isFinite(Date.parse(doc.registeredAt))) throw new Error('MANIFEST_SCOPE')
      if (['titulares','categorias','contas','etiquetas'].includes(group)) {
        if (!/^[A-Za-z0-9-]{1,64}$/.test(child)) throw new Error('MANIFEST_SCOPE')
      } else {
        const pattern = group === 'operacoesCadastros' ? /^(titulares|categorias|contas|etiquetas)__([A-Za-z0-9-]{1,64})__([1-9][0-9]{0,15})$/ : group === 'usoCadastros' ? /^(categorias|contas)__([A-Za-z0-9-]{1,64})$/ : undefined
        const match = pattern?.exec(child)
        if (!match || (group === 'operacoesCadastros' && !Number.isSafeInteger(Number(match[3]))) || !manifest.documents.some(item => item.path === 'users/' + uid + '/' + match[1] + '/' + match[2] && item.owner === uid)) throw new Error('MANIFEST_SCOPE')
      }
      seen.add(doc.path)
      continue
    }
    const [collection, id, extra] = parts
    if (!allowed.includes(collection) || !id || extra || seen.has(doc.path) || !uids.includes(doc.owner) || !doc.createdByRun || !Number.isFinite(Date.parse(doc.registeredAt))) throw new Error('MANIFEST_SCOPE')
    if (collection === 'users' ? id !== doc.owner : !id.startsWith(runId + '-') && !/^[a-f0-9]{64}$/.test(id)) throw new Error('MANIFEST_SCOPE')
    seen.add(doc.path)
  }
  return manifest.documents
}
export function requireFixture(scope: { projectId: string; runId: string; uids: string[] }, path: string) {
  const manifest = JSON.parse(readFileSync(resolve('.integration', scope.runId + '.json'), 'utf8')) as Manifest
  const docs = validateManifest(manifest, scope.projectId, scope.runId, scope.uids)
  if (!docs.some(doc => doc.path === path)) throw new Error('FIXTURE_NOT_FROM_THIS_RUN')
}
export function recordFixture(scope: { projectId: string; runId: string; uids: string[] }, path: string, owner: string) {
  const dir = resolve('.integration'), file = resolve(dir, scope.runId + '.json')
  mkdirSync(dir, { recursive: true })
  let manifest: Manifest
  try { manifest = JSON.parse(readFileSync(file, 'utf8')) as Manifest } catch (error) { if ((error as NodeJS.ErrnoException).code !== 'ENOENT') throw error; manifest = { ...scope, documents: [] } }
  if (manifest.documents.some(doc => doc.path === path && doc.owner !== owner)) throw new Error('MANIFEST_SCOPE')
  if (!manifest.documents.some(doc => doc.path === path)) manifest.documents.push({ path, owner, createdByRun: true, registeredAt: new Date().toISOString() })
  validateManifest(manifest, scope.projectId, scope.runId, scope.uids)
  writeFileSync(file, JSON.stringify(manifest, null, 2), { mode: 0o600 })
}
