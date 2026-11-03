import { competencia } from '../../domain/finance/calendar'
import { idCadastroValido } from '../../domain/finance/cadastros'
import type { ConsultaParcelada, CursorParcelado, LinhaParcelaExterna, PaginaParcelada, SerieParcelada } from '../../domain/finance/contracts/parcelados'
import type { SnapshotExterno } from '../../domain/finance/contracts/externos'
import type { OrcamentoLeituraPainel } from '../../domain/finance/contracts/painel'
import { camposPermitidos, falha, registro, sucesso, umDe } from '../../domain/finance/errors'
import type { Resultado } from '../../domain/finance/errors'
import { identidadeParcelaExterna } from '../../domain/finance/parceladosValidation'
import { registerPrivateFinanceResource } from '../../domain/finance/sessionResources'
import { createOrcamentoRodada } from './financeiroReadBudget'
import { decodeSerieParcelada } from './parceladosMapper'
import type { createParceladosSnapshotReader } from './parceladosSnapshotReader'

const abort = (code: string): never => { throw Object.assign(new Error(code), { code }) }
function normalizar(input: unknown): ConsultaParcelada {
  if (!registro(input) || !camposPermitidos(input, ['competencia', 'tipo', 'situacao', 'titularId']) || !competencia(input.competencia).ok || input.tipo !== undefined && !umDe(input.tipo, ['emprestimo', 'compromissoExterno']) || input.situacao !== undefined && !umDe(input.situacao, ['todas', 'ativas', 'pendentes', 'liquidadas', 'canceladas']) || input.titularId !== undefined && !idCadastroValido(input.titularId)) return abort('valorInvalido')
  return Object.freeze({ competencia: input.competencia as string, ...(input.tipo ? { tipo: input.tipo as ConsultaParcelada['tipo'] } : {}), situacao: (input.situacao ?? 'todas') as ConsultaParcelada['situacao'], ...(input.titularId ? { titularId: input.titularId as string } : {}) })
}
function erro(e: unknown): Resultado<never> {
  const code = (e as { code?: string })?.code
  return falha(code === 'schema' ? 'esquemaIncompativel' : umDe(code, ['valorInvalido', 'semPermissao', 'limiteOperacional', 'indisponivel', 'integridadeIndeterminada', 'configuracaoPendente', 'cotaExcedida']) ? code : 'indisponivel', 'Não foi possível completar a consulta de parcelas.', { recuperacao: 'reler' })
}
type Scope = { query: ConsultaParcelada; snapshot: SnapshotExterno; aposId?: string; busy: boolean }
export function createParceladosQueries(reader: ReturnType<typeof createParceladosSnapshotReader>, ctx: { uid: string; generation: number; atual: () => boolean; agora?: () => number }) {
  const scopes = new Map<CursorParcelado, Scope>(), now = ctx.agora ?? Date.now
  let disposed = false, abrindo = 0
  const unregister = registerPrivateFinanceResource(invalidarSessao)
  function invalidarSessao() { if (disposed) return; disposed = true; scopes.clear(); unregister(); reader.invalidarSessao() }
  function check() { if (disposed || !ctx.atual()) { invalidarSessao(); abort('semPermissao') } }
  function valid(s: SnapshotExterno) { check(); if (s.uid !== ctx.uid || s.generation !== ctx.generation || s.expiresAt !== Date.parse(s.readTime) + 50 * 60000 || now() >= s.expiresAt) abort('integridadeIndeterminada') }
  return {
    invalidarSessao,
    descartar(cursor: CursorParcelado) { check(); scopes.delete(cursor) },
    async listar(input: ConsultaParcelada, cursor?: CursorParcelado, externo?: SnapshotExterno, externoBudget?: OrcamentoLeituraPainel): Promise<Resultado<PaginaParcelada>> {
      let scope: Scope | undefined, handle = cursor, reservou = false, possuiLock = false, criou = false
      try {
        check(); const query = normalizar(input), budget = externoBudget ?? createOrcamentoRodada()
        if (handle) {
          scope = scopes.get(handle)
          if (!scope || JSON.stringify(query) !== JSON.stringify(scope.query) || externo && externo.readTime !== scope.snapshot.readTime || scope.busy) abort('valorInvalido')
        } else {
          if (scopes.size + abrindo >= 2) abort('limiteOperacional')
          abrindo++; reservou = true
          const snapshot = externo ?? await reader.iniciar(budget)
          check(); valid(snapshot)
          handle = crypto.randomUUID() as CursorParcelado
          scope = { query, snapshot, busy: false }; scopes.set(handle, scope); criou = true
          abrindo--; reservou = false
        }
        if (!scope || !handle) abort('integridadeIndeterminada')
        const current = scope!
        valid(current.snapshot); current.busy = true; possuiLock = true
        const pageSize = Math.min(4, budget.disponiveis)
        if (pageSize < 1) abort('limiteOperacional')
        const docs = await reader.consultar(current.snapshot, { colecao: 'seriesParceladas', competencia: query.competencia, ...(query.tipo ? { tipo: query.tipo } : {}), pageSize, ...(current.aposId ? { aposId: current.aposId } : {}) }, budget)
        check(); valid(current.snapshot)
        if (docs.length > pageSize) abort('integridadeIndeterminada')
        let ultimo = current.aposId ?? ''
        const linhas: LinhaParcelaExterna[] = []
        for (const d of docs) {
          if (d.colecao !== 'seriesParceladas' || d.dados === undefined || d.id <= ultimo) abort('integridadeIndeterminada')
          const serie = decodeSerieParcelada(ctx.uid, d.id, d.dados)
          if (!serie.competencias.some(c => c === query.competencia) || query.tipo && query.tipo !== serie.tipo) abort('integridadeIndeterminada')
          ultimo = d.id
          for (const p of Object.values(serie.parcelas)) {
            if (p.competenciaPlanejamento !== query.competencia || query.titularId && p.titularId !== query.titularId) continue
            const ativa = p.estadoObrigacao === 'ativa', pendente = p.valorCentavos > p.liquidadoLiquidoCentavos
            if (query.situacao === 'ativas' && !ativa || query.situacao === 'canceladas' && ativa || query.situacao === 'pendentes' && (!ativa || !pendente) || query.situacao === 'liquidadas' && (!ativa || pendente)) continue
            const id = identidadeParcelaExterna(serie.id, p.numero)
            if (!id.ok) abort('integridadeIndeterminada')
            linhas.push(Object.freeze({ ...p, id: id.ok ? id.valor : '', uid: ctx.uid, serieId: serie.id, tipo: serie.tipo, version: serie.version }))
          }
        }
        const fim = docs.length < pageSize
        current.aposId = ultimo
        if (fim) scopes.delete(handle!)
        return sucesso(Object.freeze({ linhas: Object.freeze(linhas), snapshot: current.snapshot, fim, ...(fim ? {} : { cursor: handle! }) }))
      } catch (e) { if (criou && handle) scopes.delete(handle); return erro(e) } finally { if (reservou) abrindo--; if (scope && possuiLock) scope.busy = false }
    },
    async detalhe(id: string, externo?: SnapshotExterno, externoBudget?: OrcamentoLeituraPainel): Promise<Resultado<{ serie: SerieParcelada; snapshot: SnapshotExterno; historicoCompleto: false }>> {
      try {
        check(); if (!idCadastroValido(id)) abort('valorInvalido')
        const budget = externoBudget ?? createOrcamentoRodada(), snapshot = externo ?? await reader.iniciar(budget)
        valid(snapshot)
        const docs = await reader.obter(snapshot, [{ colecao: 'seriesParceladas', id }], budget)
        check(); valid(snapshot)
        if (docs.length !== 1 || docs[0].id !== id || docs[0].colecao !== 'seriesParceladas') abort('integridadeIndeterminada')
        if (docs[0].dados === undefined) return falha('naoEncontrado', 'Série não encontrada.')
        return sucesso({ serie: decodeSerieParcelada(ctx.uid, id, docs[0].dados), snapshot, historicoCompleto: false })
      } catch (e) { return erro(e) }
    },
  }
}
