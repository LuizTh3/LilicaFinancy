import type { OrcamentoLeituraPainel } from '../../domain/finance/contracts/painel'
import type { SnapshotExterno } from '../../domain/finance/contracts/externos'
import { createFinanceiroSnapshotReader } from './financeiroSnapshotReader'
import type { ColecaoParcelada, ContextoLeitura, QueryParcelada } from './financeiroSnapshotReader'
export type { QueryParcelada } from './financeiroSnapshotReader'
type ReferenciaParcelada = Readonly<{ colecao: ColecaoParcelada; id: string }>
export function createParceladosSnapshotReader(ctx: ContextoLeitura) {
  const reader = createFinanceiroSnapshotReader(ctx)
  const denied = (): never => { throw Object.assign(new Error('Referência parcelada não permitida.'), { code: 'referenciaInvalida' }) }
  return {
    iniciar: (orcamento?: OrcamentoLeituraPainel) => reader.iniciar(orcamento),
    invalidarSessao: () => reader.invalidarSessao(),
    async consultar(snapshot: SnapshotExterno, q: QueryParcelada, orcamento?: OrcamentoLeituraPainel) {
      if (!q || !['seriesParceladas', 'operacoesParceladas'].includes(q.colecao)) denied()
      return reader.consultar(snapshot, q, orcamento)
    },
    async obter(snapshot: SnapshotExterno, refs: readonly ReferenciaParcelada[], orcamento?: OrcamentoLeituraPainel) {
      if (!Array.isArray(refs) || refs.some(r => !r || !['seriesParceladas', 'operacoesParceladas', 'reversoesParceladas', 'vinculosReceitasEmprestimos'].includes(r.colecao))) denied()
      return reader.obter(snapshot, refs, orcamento)
    },
  }
}
