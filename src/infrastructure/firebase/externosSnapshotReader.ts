import { createFinanceiroSnapshotReader } from './financeiroSnapshotReader'
import type { ColecaoExterna, ContextoLeitura, QueryExterna, ReferenciaLeituraExterna } from './financeiroSnapshotReader'
import type { SnapshotExterno } from '../../domain/finance/contracts/externos'
export type { QueryExterna, ReferenciaLeituraExterna } from './financeiroSnapshotReader'
export type DocumentoLeituraExterna = Readonly<{ colecao: ColecaoExterna; id: string; dados: Record<string, unknown> | undefined }>
const colecoes = ['lancamentosExternos', 'operacoesExternas', 'reversoesExternas', 'titulares', 'categorias', 'contas', 'etiquetas'] as const
function fail(): never { throw Object.assign(new Error('Referência externa não permitida.'), { code: 'referenciaInvalida' }) }
// Preserve the narrow005 port; sharing transport does not widen its authorization surface.
export function createExternosSnapshotReader(ctx: ContextoLeitura) {
 const reader = createFinanceiroSnapshotReader(ctx)
 return {
  iniciar: () => reader.iniciar(),
  async consultar(snapshot: SnapshotExterno, query: QueryExterna): Promise<DocumentoLeituraExterna[]> {
   if (!query || !['lancamentosExternos', 'operacoesExternas'].includes(query.colecao)) fail()
   return await reader.consultar(snapshot, query) as DocumentoLeituraExterna[]
  },
  async obter(snapshot: SnapshotExterno, refs: readonly ReferenciaLeituraExterna[]): Promise<DocumentoLeituraExterna[]> {
   if (!Array.isArray(refs) || refs.some(ref => !ref || !(colecoes as readonly string[]).includes(ref.colecao))) fail()
   return await reader.obter(snapshot, refs) as DocumentoLeituraExterna[]
  },
 }
}
