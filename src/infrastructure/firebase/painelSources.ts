import type { BasePainel, CapacidadeFontePainel, ContribuicaoPainel, ConsultaPainel, FontePainel, OrcamentoLeituraPainel, SnapshotPainel } from '../../domain/finance/contracts/painel'
import { basesPainel, fontesPainel } from '../../domain/finance/contracts/painel'
import { camposPermitidos, registro } from '../../domain/finance/errors'
import { dataCalendario } from '../../domain/finance/calendar'
import { idCadastroValido } from '../../domain/finance/cadastros'
import { identidadeFaturaValida } from '../../domain/finance/faturas'
import type { createFinanceiroSnapshotReader } from './financeiroSnapshotReader'
import { mapearCalendarioPainel, mapearExternoPainel } from './painelMapper'

export type PaginaFontePainel = Readonly<{ contribuicoes: readonly ContribuicaoPainel[]; completo: boolean; proxima?: string }>
export type AdapterFontePainel = Readonly<{
 id: FontePainel; contractRevision: number; bases: readonly BasePainel[]
 paginar(ctx: Readonly<{ consulta: ConsultaPainel; snapshot: SnapshotPainel; posicao?: string; orcamento: OrcamentoLeituraPainel }>): Promise<PaginaFontePainel>
 invalidarSessao?: () => void
}>
export function registrarFontesPainel(adapters: readonly AdapterFontePainel[], capacidades: readonly CapacidadeFontePainel[]) {
 const map = new Map<FontePainel, AdapterFontePainel>(), caps = new Map<FontePainel, CapacidadeFontePainel>()
 for (const a of adapters) {
  if (!fontesPainel.includes(a.id) || map.has(a.id) || a.contractRevision !== 1 || !a.bases.length || new Set(a.bases).size !== a.bases.length || !a.bases.every(b => basesPainel.includes(b)) || typeof a.paginar !== 'function') throw Error('ADAPTER_PAINEL_INVALIDO')
  map.set(a.id, Object.freeze({ ...a, bases: Object.freeze([...a.bases]) }))
 }
 for (const cap of capacidades) {
  const a = map.get(cap.fonte)
  if (!fontesPainel.includes(cap.fonte) || caps.has(cap.fonte) || !['naoHabilitada', 'comprovada'].includes(cap.estado) || cap.contractRevision !== 1 || !cap.bases.every(b => basesPainel.includes(b)) || (cap.estado === 'comprovada' && (!a || !cap.evidencia?.trim() || cap.contractRevision !== a.contractRevision || cap.bases.some(b => !a.bases.includes(b))))) throw Error('CAPACIDADE_PAINEL_INVALIDA')
  caps.set(cap.fonte, Object.freeze({ ...cap, bases: Object.freeze([...cap.bases]) }))
 }
 return {
  estado(id: FontePainel, base: BasePainel): 'disponivel' | 'indisponivel' { return caps.get(id)?.estado === 'comprovada' && caps.get(id)!.bases.includes(base) ? 'disponivel' : 'indisponivel' },
  obter(id: FontePainel, base: BasePainel) { return caps.get(id)?.estado === 'comprovada' && caps.get(id)!.bases.includes(base) ? map.get(id) : undefined },
  invalidarSessao() { for (const a of map.values()) { try { a.invalidarSessao?.() } catch { /* Other adapters must still be invalidated. */ } } },
 }
}

function invalidSource(): never { throw Object.assign(Error('Consulta mensal incompatível.'), { code: 'integridadeIndeterminada' }) }
export function createPainelPlanningSources(reader: ReturnType<typeof createFinanceiroSnapshotReader>, uid: string): readonly AdapterFontePainel[] {
 function cursor(value?: string): Record<string, unknown> { if (value === undefined) return {}; try { const parsed: unknown = JSON.parse(value); if (registro(parsed)) return parsed } catch { /* Reject malformed opaque source positions. */ } return invalidSource() }
 function check(q: ConsultaPainel, snapshot: SnapshotPainel) { if (q.base !== 'planejamento' || q.inicio !== q.fim || snapshot.uid !== uid) invalidSource() }
 const externos: AdapterFontePainel = {
  id: 'externos', bases: ['planejamento'], contractRevision: 1, invalidarSessao: () => reader.invalidarSessao(),
  async paginar({ consulta: q, snapshot, posicao, orcamento }) {
   check(q, snapshot)
   const c = cursor(posicao)
   if (!camposPermitidos(c, ['natureza', 'apos']) || c.natureza !== undefined && c.natureza !== 'receita' && c.natureza !== 'despesa') invalidSource()
   const natureza = c.natureza === 'despesa' ? 'despesa' : 'receita'
   let apos: { data: string; id: string } | undefined
   if (c.apos !== undefined) { if (!registro(c.apos) || !camposPermitidos(c.apos, ['data', 'id']) || !dataCalendario(c.apos.data).ok || !idCadastroValido(c.apos.id)) invalidSource(); apos = { data: c.apos.data as string, id: c.apos.id } }
   const pageSize = Math.min(50, orcamento.disponiveis)
   const docs = await reader.consultar(snapshot, { colecao: 'lancamentosExternos', natureza, competencia: q.inicio, pageSize, ...(apos ? { apos } : {}) }, orcamento)
   const rows = docs.map(d => {
    if (d.colecao !== 'lancamentosExternos') invalidSource()
    const row = mapearExternoPainel(uid, d.id, d.dados)
    if (row.competencia !== q.inicio || (row.natureza === 'entrada' ? 'receita' : 'despesa') !== natureza) invalidSource()
    return row
   })
   for (let i = 0; i < rows.length; i++) { const previous = i === 0 ? apos : { data: rows[i - 1].dataFinanceira, id: rows[i - 1].origemId }; if (previous && (rows[i].dataFinanceira < previous.data || rows[i].dataFinanceira === previous.data && rows[i].origemId <= previous.id)) invalidSource() }
   if (docs.length === pageSize && rows.length) { const last = rows.at(-1)!; return { contribuicoes: rows, completo: false, proxima: JSON.stringify({ natureza, apos: { data: last.dataFinanceira, id: last.origemId } }) } }
   return natureza === 'receita' ? { contribuicoes: rows, completo: false, proxima: JSON.stringify({ natureza: 'despesa' }) } : { contribuicoes: rows, completo: true }
  },
 }
 const calendarios: AdapterFontePainel = {
  id: 'calendarios', bases: ['planejamento'], contractRevision: 1, invalidarSessao: () => reader.invalidarSessao(),
  async paginar({ consulta: q, snapshot, posicao, orcamento }) {
   check(q, snapshot)
   const c = cursor(posicao)
   if (!camposPermitidos(c, ['id', 'competencia']) || posicao !== undefined && (!identidadeFaturaValida(c.id) || c.competencia !== q.inicio)) invalidSource()
   const pageSize = Math.min(50, orcamento.disponiveis)
   const docs = await reader.consultar(snapshot, { colecao: 'faturas', inicio: q.inicio, fim: q.fim, pageSize, ...(posicao ? { apos: { id: c.id as string, competencia: c.competencia as string } } : {}) }, orcamento)
   let last: { id: string; competencia: string } | undefined
   for (const d of docs) {
    if (d.colecao !== 'faturas') invalidSource()
    const f = mapearCalendarioPainel(uid, d.id, d.dados)
    if (f.competencia !== q.inicio || last && f.id <= last.id || !last && posicao && f.id <= (c.id as string)) invalidSource()
    last = { id: f.id, competencia: f.competencia }
   }
   return last && docs.length === pageSize ? { contribuicoes: [], completo: false, proxima: JSON.stringify(last) } : { contribuicoes: [], completo: true }
  },
 }
 return Object.freeze([externos, calendarios])
}
