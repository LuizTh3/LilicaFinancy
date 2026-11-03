import { idCadastroValido } from '../../domain/finance/cadastros'
import { chaveContribuicao, normalizarConsultaPainel } from '../../domain/finance/contracts/painel'
import type { ContribuicaoPainel } from '../../domain/finance/contracts/painel'
import { camposPermitidos, registro } from '../../domain/finance/errors'
import { identidadeParcelaExterna } from '../../domain/finance/parceladosValidation'
import type { createFinanceiroSnapshotReader } from './financeiroSnapshotReader'
import { decodeSerieParcelada } from './parceladosMapper'
import type { AdapterFontePainel } from './painelSources'

const invalid = (): never => { throw Object.assign(new Error('Séries parceladas não reconciliadas no recorte.'), { code: 'integridadeIndeterminada' }) }
/** Kept outside production composition until the009/011 remote gates pass. */
export function createPainelParceladosSource(reader: ReturnType<typeof createFinanceiroSnapshotReader>, uid: string): AdapterFontePainel {
  return {
    id: 'parcelados', contractRevision: 1, bases: ['planejamento'], invalidarSessao: () => reader.invalidarSessao(),
    async paginar({ consulta, snapshot, posicao, orcamento }) {
      const normalized = normalizarConsultaPainel(consulta)
      if (!normalized.ok || consulta.base !== 'planejamento' || consulta.inicio !== consulta.fim || snapshot.uid !== uid) return invalid()
      let aposId: string | undefined
      if (posicao !== undefined) {
        let parsed: unknown
        try { parsed = JSON.parse(posicao) } catch { return invalid() }
        if (!registro(parsed) || !camposPermitidos(parsed, ['competencia', 'aposId']) || parsed.competencia !== consulta.inicio || !idCadastroValido(parsed.aposId)) return invalid()
        aposId = parsed.aposId
      }
      // Four finite aggregates expand to at most48 logical obligations. No lost
      // tail, silently truncated schedule or new per-source100-document budget.
      const pageSize = Math.min(4, orcamento.disponiveis)
      if (pageSize < 1) throw Object.assign(new Error('Continue a consulta em uma nova rodada.'), { code: 'limiteOperacional' })
      const docs = await reader.consultar(snapshot, { colecao: 'seriesParceladas', competencia: consulta.inicio, pageSize, ...(aposId ? { aposId } : {}) }, orcamento)
      if (docs.length > pageSize) return invalid()
      const contribuicoes: ContribuicaoPainel[] = []
      let ultimo = aposId ?? ''
      for (const doc of docs) {
        if (doc.colecao !== 'seriesParceladas' || doc.dados === undefined || doc.id <= ultimo) return invalid()
        const serie = decodeSerieParcelada(uid, doc.id, doc.dados)
        if (!serie.competencias.includes(consulta.inicio as never)) return invalid()
        ultimo = doc.id
        for (const row of Object.values(serie.parcelas)) {
          if (row.competenciaPlanejamento !== consulta.inicio) continue
          const id = identidadeParcelaExterna(serie.id, row.numero)
          if (!id.ok) return invalid()
          contribuicoes.push(Object.freeze({ chave: chaveContribuicao('parcelaExterna', id.valor), autoridade: 'parcelaExterna', origemId: serie.id, alvoId: id.valor, competencia: row.competenciaPlanejamento, dataFinanceira: row.vencimento, base: 'planejamento', natureza: 'saida', valorCentavos: row.valorCentavos, estimado: false, fonte: 'persistida', revisao: serie.version, liquidadoCentavos: row.liquidadoLiquidoCentavos, estadoObrigacao: row.estadoObrigacao, categoriaId: row.categoriaId, ...(row.titularId ? { titularId: row.titularId } : {}), ...(row.etiquetaIds ? { etiquetaIds: row.etiquetaIds } : {}) }))
        }
      }
      return { contribuicoes: Object.freeze(contribuicoes), completo: docs.length < pageSize, ...(docs.length === pageSize ? { proxima: JSON.stringify({ competencia: consulta.inicio, aposId: ultimo }) } : {}) }
    },
  }
}
