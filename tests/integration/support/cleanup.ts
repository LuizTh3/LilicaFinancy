import type { Manifest } from './manifest'
// This function only orders inventoried paths; it never discovers deletion targets.
export function cleanupOrder(documents: Manifest['documents']) {
  const priority = (path: string) => {
    const group = path.split('/')[2]
    return group === 'reversoesExternas' ? 0 : group === 'operacoesExternas' ? 1 : group === 'lancamentosExternos' ? 2 : 3
  }
  return [...documents].sort((a,b) => b.path.split('/').length - a.path.split('/').length || priority(a.path) - priority(b.path) || a.path.localeCompare(b.path))
}
export function assertInventoriedChild(parent: string, child: string, documents: Manifest['documents']) {
  if (!child.startsWith(parent + '/') || !documents.some(item => item.path === child)) throw new Error('UNINVENTORIED_CHILD')
}
