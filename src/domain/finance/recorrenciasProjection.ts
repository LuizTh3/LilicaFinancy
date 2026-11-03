import { avancarCompetencia, competencia, dataCalendario, dataNaCompetencia, diasNoMes } from './calendar'
import { idCartaoValido } from './cartoes'
import type { DestinoAssinatura, FinanceiroRecorrente, LinhaProjecaoRecorrente, OcorrenciaRecorrente, PendenciaProjecaoRecorrente, ProjecaoRecorrente, RevisaoRecorrente, SerieRecorrente } from './contracts/recorrencias'
import { camposPermitidos, falha, registro, sucesso, umDe } from './errors'
import type { Resultado } from './errors'
import { faturaId } from './faturas'
import { validarCalendarioFatura } from './invoiceCalendar'
import { identidadeOcorrenciaRecorrente, validarOcorrenciaRecorrente, validarRevisaoRecorrente, validarSerieRecorrente } from './recorrenciasValidation'

const bad = () => falha('integridadeIndeterminada', 'A projeção recorrente possui dados incompatíveis ou leituras contraditórias.', { recuperacao: 'reler' })
const mesIndice = (m: string) => Number(m.slice(0, 4)) * 12 + Number(m.slice(5, 7)) - 1
const imagem = (v: unknown) => JSON.stringify(v, (_k, value: unknown) => registro(value) ? Object.fromEntries(Object.entries(value).sort(([a], [b]) => a < b ? -1 : a > b ? 1 : 0)) : value)

export function indiceVirtualRecorrente(input: unknown): Resultado<{ versaoIndiceVirtual: 1; inicioVirtual: string; fimVirtualInclusivo: string; virtualElegivel: boolean }> {
  const serie = validarSerieRecorrente(input)
  if (!serie.ok) return serie
  const s = serie.valor
  let fim = s.terminoOriginal ?? '9999-12-31', elegivel = true
  if (s.encerradaDesdeMes) {
    const anterior = avancarCompetencia(s.encerradaDesdeMes, -1)
    if (!anterior.ok) { fim = '1900-01-01'; elegivel = false }
    else {
      const dias = diasNoMes(Number(anterior.valor.slice(0, 4)), Number(anterior.valor.slice(5, 7)))
      if (!dias.ok) return dias
      const fechamento = `${anterior.valor}-${String(dias.valor).padStart(2, '0')}`
      if (fechamento < fim) fim = fechamento
    }
  }
  return sucesso({ versaoIndiceVirtual: 1, inicioVirtual: s.inicio, fimVirtualInclusivo: fim, virtualElegivel: elegivel && fim >= s.inicio })
}
function pertence(o: LinhaProjecaoRecorrente, inicio: string, fim: string, base: 'planejamento' | 'consumo'): boolean {
  if (!o.financeiro) return o.mesReferencia >= inicio && o.mesReferencia <= fim
  const f = o.financeiro
  const mes = base === 'planejamento' ? 'competenciaFatura' in f ? f.competenciaFatura : f.competenciaPlanejamento : 'dataCompra' in f ? f.dataCompra.slice(0, 7) : (f.dataConsumo ?? f.dataPrevista ?? '').slice(0, 7)
  return mes >= inicio && mes <= fim
}
/** The caller supplies only data reconciled at one server snapshot; no reads/writes occur here. */
export function projetarRecorrencias(input: unknown): Resultado<ProjecaoRecorrente> {
  if (!registro(input) || !camposPermitidos(input, ['contexto', 'series', 'revisoes', 'persistidas', 'ausenciasConfirmadas', 'destinosCartao']) || !registro(input.contexto) || !Array.isArray(input.series) || !Array.isArray(input.revisoes) || !Array.isArray(input.persistidas) || !Array.isArray(input.ausenciasConfirmadas) || !Array.isArray(input.destinosCartao)) return bad()
  const c = input.contexto
  if (!camposPermitidos(c, ['uid', 'inicioMes', 'fimMes', 'base', 'seriesCompletas', 'persistidasCompletas', 'intervaloCobranca']) || typeof c.uid !== 'string' || !c.uid || !competencia(c.inicioMes).ok || !competencia(c.fimMes).ok || !umDe(c.base, ['planejamento', 'consumo']) || typeof c.seriesCompletas !== 'boolean' || typeof c.persistidasCompletas !== 'boolean') return bad()
  const inicio = c.inicioMes as string, fim = c.fimMes as string, delta = mesIndice(fim) - mesIndice(inicio)
  if (delta < 0 || delta > 11) return falha('limiteOperacional', 'A projeção deve conter de um a doze meses.', { limite: 12 })
  let cobranca: { inicio: string; fimExclusivo: string } | undefined
  if ('intervaloCobranca' in c) {
    const v = c.intervaloCobranca
    if (!registro(v) || !camposPermitidos(v, ['inicio', 'fimExclusivo']) || !dataCalendario(v.inicio).ok || !dataCalendario(v.fimExclusivo).ok || (v.inicio as string) >= (v.fimExclusivo as string) || mesIndice((v.fimExclusivo as string).slice(0, 7)) - mesIndice((v.inicio as string).slice(0, 7)) > 13) return bad()
    cobranca = { inicio: v.inicio as string, fimExclusivo: v.fimExclusivo as string }
  }
  const series = new Map<string, SerieRecorrente>(), revisoes = new Map<string, RevisaoRecorrente>(), persistidas = new Map<string, OcorrenciaRecorrente>()
  for (const item of input.series) {
    const s = validarSerieRecorrente(item)
    if (!s.ok) return s
    if (s.valor.uid !== c.uid || series.has(s.valor.id) && imagem(series.get(s.valor.id)) !== imagem(s.valor)) return bad()
    series.set(s.valor.id, s.valor)
  }
  for (const item of input.revisoes) {
    const v = validarRevisaoRecorrente(item)
    if (!v.ok) return v
    const s = series.get(v.valor.serieId)
    if (!s || v.valor.uid !== c.uid || v.valor.inicioMes < s.inicio.slice(0, 7) || v.valor.version > s.version || (s.natureza === 'assinaturaCartao' ? !v.valor.cartaoId || v.valor.titularId !== undefined || v.valor.contaPrevistaId !== undefined : v.valor.cartaoId !== undefined) || revisoes.has(v.valor.id) && imagem(revisoes.get(v.valor.id)) !== imagem(v.valor)) return bad()
    revisoes.set(v.valor.id, v.valor)
  }
  for (const s of series.values()) {
    const segmentos = [...revisoes.values()].filter(v => v.serieId === s.id).sort((a, b) => a.inicioMes < b.inicioMes ? -1 : 1)
    for (let i = 1; i < segmentos.length; i++) if (!segmentos[i - 1].fimExclusivo || segmentos[i - 1].fimExclusivo! > segmentos[i].inicioMes) return bad()
  }
  for (const item of input.persistidas) {
    const o = validarOcorrenciaRecorrente(item)
    if (!o.ok) return o
    const s = series.get(o.valor.serieId)
    if (!s || o.valor.uid !== c.uid || o.valor.natureza !== s.natureza || o.valor.version > s.version || o.valor.revisaoVersion > s.version || persistidas.has(o.valor.id) && imagem(persistidas.get(o.valor.id)) !== imagem(o.valor)) return bad()
    persistidas.set(o.valor.id, o.valor)
  }
  const ausencias = new Set<string>()
  for (const id of input.ausenciasConfirmadas) {
    if (typeof id !== 'string' || !/^r10-[A-Za-z0-9-]{1,40}-[0-9]{6}$/.test(id) || ausencias.has(id) || persistidas.has(id)) return bad()
    const match = /^r10-(.+)-([0-9]{4})([0-9]{2})$/.exec(id)!
    if (!series.has(match[1]) || !competencia(`${match[2]}-${match[3]}`).ok) return bad()
    ausencias.add(id)
  }
  const destinos = new Map<string, DestinoAssinatura>()
  for (const item of input.destinosCartao) {
    if (!registro(item) || !camposPermitidos(item, ['uid', 'serieId', 'mesReferencia', 'cartaoId', 'calendario', 'escolha']) || item.uid !== c.uid || typeof item.serieId !== 'string' || !series.has(item.serieId) || !idCartaoValido(item.cartaoId) || !umDe(item.escolha, ['sugerida', 'explicita']) || !registro(item.calendario) || !camposPermitidos(item.calendario, ['competencia', 'inicio', 'fechamento', 'vencimento', 'calendarioOrigem'])) return bad()
    const id = identidadeOcorrenciaRecorrente(item.serieId, item.mesReferencia), calendario = validarCalendarioFatura(item.calendario)
    if (!id.ok || !calendario.ok || !calendario.valor.calendarioOrigem || destinos.has(id.valor)) return bad()
    destinos.set(id.valor, { uid: c.uid, serieId: item.serieId, mesReferencia: item.mesReferencia as string, cartaoId: item.cartaoId, calendario: calendario.valor, escolha: item.escolha })
  }
  if (new TextEncoder().encode(imagem(input)).length > 8 * 1024 * 1024) return falha('limiteOperacional', 'A projeção excede o limite de memória de8MiB.')
  const linhas: LinhaProjecaoRecorrente[] = [], pendencias: PendenciaProjecaoRecorrente[] = []
  if (!c.seriesCompletas) pendencias.push({ motivo: 'descobertaIncompleta' })
  if (!c.persistidasCompletas) pendencias.push({ motivo: 'persistidasIncompletas' })
  for (const o of persistidas.values()) {
    const linha = { ...o, fonte: 'persistida' as const }
    if (pertence(linha, inicio, fim, c.base)) linhas.push(Object.freeze(linha))
  }
  for (const s of series.values()) {
    const assinaturaPlanejada = s.natureza === 'assinaturaCartao' && c.base === 'planejamento'
    if (assinaturaPlanejada && !cobranca) { pendencias.push({ serieId: s.id, motivo: 'intervaloCobrancaNaoResolvido' }); continue }
    const inicioIdentidades = assinaturaPlanejada ? cobranca!.inicio.slice(0, 7) : inicio
    const fimIdentidades = assinaturaPlanejada ? cobranca!.fimExclusivo.slice(0, 7) : fim
    for (let i = 0; i <= mesIndice(fimIdentidades) - mesIndice(inicioIdentidades); i++) {
    const mes = avancarCompetencia(inicioIdentidades, i)
    if (!mes.ok) return mes
    const id = identidadeOcorrenciaRecorrente(s.id, mes.valor)
    if (!id.ok) return id
    if (persistidas.has(id.valor) || mes.valor < s.inicio.slice(0, 7) || s.terminoOriginal && mes.valor > s.terminoOriginal.slice(0, 7) || s.encerradaDesdeMes && mes.valor >= s.encerradaDesdeMes) continue
    const revisao = [...revisoes.values()].find(v => v.serieId === s.id && v.inicioMes <= mes.valor && (!v.fimExclusivo || mes.valor < v.fimExclusivo))
    if (!revisao) { pendencias.push({ serieId: s.id, mesReferencia: mes.valor, motivo: 'revisaoAusente' }); continue }
    const date = dataNaCompetencia(mes.valor, revisao.diaAncora)
    if (!date.ok) return date
    if (date.valor < s.inicio || s.terminoOriginal && date.valor > s.terminoOriginal) continue
    if (assinaturaPlanejada && (date.valor < cobranca!.inicio || date.valor >= cobranca!.fimExclusivo)) continue
    if (!ausencias.has(id.valor)) { pendencias.push({ serieId: s.id, mesReferencia: mes.valor, motivo: 'slotNaoReconciliado' }); continue }
    const base = { descricao: revisao.descricao, categoriaId: revisao.categoriaId, valorCentavos: revisao.valorCentavos, estimado: revisao.estimado, ...(revisao.etiquetaIds ? { etiquetaIds: revisao.etiquetaIds } : {}), ...(revisao.observacao ? { observacao: revisao.observacao } : {}) }
    let financeiro: FinanceiroRecorrente
    if (s.natureza === 'assinaturaCartao') {
      const destino = destinos.get(id.valor)
      if (!destino || destino.cartaoId !== revisao.cartaoId || destino.escolha === 'sugerida' && !(destino.calendario.inicio <= date.valor && date.valor < destino.calendario.fechamento)) { pendencias.push({ serieId: s.id, mesReferencia: mes.valor, motivo: 'destinoCartaoNaoResolvido' }); continue }
      financeiro = { ...base, dataCompra: date.valor, cartaoId: destino.cartaoId, faturaId: faturaId(destino.cartaoId, destino.calendario.competencia), competenciaFatura: destino.calendario.competencia, inicioCiclo: destino.calendario.inicio, fechamentoCiclo: destino.calendario.fechamento }
    } else financeiro = { ...base, competenciaPlanejamento: mes.valor, liquidadoLiquidoCentavos: 0, jaLiquidada: false, ...(revisao.titularId ? { titularId: revisao.titularId } : {}), ...(revisao.contaPrevistaId ? { contaPrevistaId: revisao.contaPrevistaId } : {}), ...(s.natureza === 'receitaExterna' ? { dataPrevista: date.valor } : { vencimento: date.valor, dataConsumo: date.valor }) }
    const linha: LinhaProjecaoRecorrente = Object.freeze({ id: id.valor, uid: c.uid, version: 1, serieId: s.id, mesReferencia: mes.valor, natureza: s.natureza, revisaoId: revisao.id, revisaoVersion: revisao.version, estado: 'virtual', excecaoIndividual: false, fonte: 'virtual', financeiro: Object.freeze(financeiro), ...(s.natureza === 'assinaturaCartao' ? { capacidadeItem: Object.freeze({ schemaVersion: 1 as const, valorOriginalCentavos: revisao.valorCentavos, correcaoAcrescimosCentavos: 0, correcaoReducoesCentavos: 0, devolvidoCentavos: 0, categoriaEfetivaId: revisao.categoriaId }) } : {}) })
    if (pertence(linha, inicio, fim, c.base)) linhas.push(linha)
    }
  }
  linhas.sort((a, b) => a.mesReferencia < b.mesReferencia ? -1 : a.mesReferencia > b.mesReferencia ? 1 : a.id < b.id ? -1 : a.id > b.id ? 1 : 0)
  return sucesso(Object.freeze({ linhas: Object.freeze(linhas), pendencias: Object.freeze(pendencias.map(p => Object.freeze(p))), completo: pendencias.length === 0 }))
}
