import { avancarCompetencia, competencia, dataCalendario, dataNaCompetencia } from './calendar'
import { camposPermitidos, falha, registro, sucesso, versaoValida } from './errors'
import type { OcorrenciaRecorrente, RevisaoRecorrente } from './contracts/recorrencias'
import { identidadeOcorrenciaRecorrente, identidadeRevisaoRecorrente, validarOcorrenciaRecorrente, validarRevisaoRecorrente, validarSerieRecorrente } from './recorrenciasValidation'
import { projetarRecorrencias } from './recorrenciasProjection'

const erro = () => falha('integridadeIndeterminada', 'Confira segmento, watermark e todos os slots da alteração antes de confirmar.', { recuperacao: 'reler' })
const mesIndice = (m: string) => Number(m.slice(0, 4)) * 12 + Number(m.slice(5, 7))
const camposPadrao = ['descricao', 'categoriaId', 'valorCentavos', 'estimado', 'diaAncora', 'titularId', 'contaPrevistaId', 'etiquetaIds', 'observacao']
/** The atomic writer must prove the supplied watermark and complete revision/slot set at one snapshot. */
export function prepararRevisaoFuturasRecorrente(input: unknown, comando: unknown, ctx: Readonly<{ uid: string; hoje: string }>) {
  if (!registro(input) || !camposPermitidos(input, ['serie', 'revisoes', 'persistidas', 'ausenciasConfirmadas', 'ultimoMesMaterializado']) || !Array.isArray(input.revisoes) || !Array.isArray(input.persistidas) || !Array.isArray(input.ausenciasConfirmadas) || input.revisoes.length + input.persistidas.length + input.ausenciasConfirmadas.length > 100 || !registro(comando) || !camposPermitidos(comando, ['expectedVersionSerie', 'vigenciaMes', 'alteracoes']) || !registro(comando.alteracoes) || !Object.keys(comando.alteracoes).length || !camposPermitidos(comando.alteracoes, camposPadrao) || !dataCalendario(ctx.hoje).ok || !competencia(comando.vigenciaMes).ok || (comando.vigenciaMes as string) < ctx.hoje.slice(0, 7)) return erro()
  const serie = validarSerieRecorrente(input.serie)
  if (!serie.ok) return serie
  const s = serie.valor, vigencia = comando.vigenciaMes as string
  if (s.uid !== ctx.uid || s.estado !== 'ativa' || !versaoValida(s.version + 1)) return erro()
  if (comando.expectedVersionSerie !== s.version) return falha('conflitoVersao', 'A série mudou. Refaça a prévia.', { versaoAtual: s.version, recuperacao: 'reler' })
  if (s.natureza === 'assinaturaCartao') return falha('configuracaoPendente', 'Revisão de assinatura exige coordenação recíproca com as faturas atingidas.')
  if ('ultimoMesMaterializado' in input && !competencia(input.ultimoMesMaterializado).ok) return erro()
  const revisoes: RevisaoRecorrente[] = [], ids = new Set<string>()
  for (const raw of input.revisoes) {
    const v = validarRevisaoRecorrente(raw)
    if (!v.ok) return v
    if (v.valor.serieId !== s.id || v.valor.uid !== s.uid || ids.has(v.valor.id)) return erro()
    ids.add(v.valor.id); revisoes.push(v.valor)
  }
  const prova = projetarRecorrencias({ contexto: { uid: ctx.uid, inicioMes: vigencia, fimMes: vigencia, base: 'planejamento', seriesCompletas: true, persistidasCompletas: true }, series: [s], revisoes, persistidas: input.persistidas, ausenciasConfirmadas: input.ausenciasConfirmadas, destinosCartao: [] })
  if (!prova.ok) return prova
  const vigente = revisoes.find(v => v.inicioMes <= vigencia && (!v.fimExclusivo || vigencia < v.fimExclusivo))
  if (!vigente || s.terminoOriginal && vigencia > s.terminoOriginal.slice(0, 7)) return erro()
  const nova = validarRevisaoRecorrente({ ...vigente, ...comando.alteracoes, id: identidadeRevisaoRecorrente(s.id, vigencia), inicioMes: vigencia, version: s.version + 1 })
  if (!nova.ok) return nova
  if (Object.keys(comando.alteracoes).every(k => JSON.stringify(vigente[k as keyof RevisaoRecorrente]) === JSON.stringify(nova.valor[k as keyof RevisaoRecorrente]))) return falha('valorInvalido', 'Não há alteração no padrão para confirmar.')
  const persistidas = new Map<string, OcorrenciaRecorrente>()
  for (const raw of input.persistidas) {
    const o = validarOcorrenciaRecorrente(raw)
    if (!o.ok) return o
    if (persistidas.has(o.valor.id) || o.valor.mesReferencia >= vigencia && (!input.ultimoMesMaterializado || o.valor.mesReferencia > input.ultimoMesMaterializado)) return erro()
    persistidas.set(o.valor.id, o.valor)
  }
  const ausencias = new Set(input.ausenciasConfirmadas)
  const alteradas: OcorrenciaRecorrente[] = [], preservadas: { id: string; motivo: 'historicoLiquidacao' | 'excecaoIndividual' | 'suprimida' }[] = []
  let fim = typeof input.ultimoMesMaterializado === 'string' ? input.ultimoMesMaterializado : undefined
  if (fim && vigente.fimExclusivo && fim >= vigente.fimExclusivo) {
    const anterior = avancarCompetencia(vigente.fimExclusivo, -1)
    if (!anterior.ok) return anterior
    fim = anterior.valor
  }
  const quantidade = fim && fim >= vigencia ? mesIndice(fim) - mesIndice(vigencia) + 1 : 0
  if (quantidade > 12) return falha('limiteOperacional', 'O conjunto de futuras materializadas excede doze slots; nenhuma alteração foi aplicada.', { limite: 12 })
  for (let i = 0; i < quantidade; i++) {
    const mes = avancarCompetencia(vigencia, i)
    if (!mes.ok) return mes
    const identidade = identidadeOcorrenciaRecorrente(s.id, mes.valor)
    if (!identidade.ok) return identidade
    const o = persistidas.get(identidade.valor)
    if (!o) { if (!ausencias.has(identidade.valor)) return erro(); continue }
    const f = o.financeiro
    const motivo = o.estado !== 'persistida' ? 'suprimida' : f && 'jaLiquidada' in f && f.jaLiquidada ? 'historicoLiquidacao' : o.excecaoIndividual ? 'excecaoIndividual' : undefined
    if (motivo) { preservadas.push({ id: o.id, motivo }); continue }
    if (!f || !('jaLiquidada' in f)) return erro()
    const data = dataNaCompetencia(mes.valor, nova.valor.diaAncora)
    if (!data.ok) return data
    if (data.valor < s.inicio || s.terminoOriginal && data.valor > s.terminoOriginal) return erro()
    const v = nova.valor
    const { titularId: _t, contaPrevistaId: _c, etiquetaIds: _e, observacao: _o, ...financeiro } = f
    const atualizada = validarOcorrenciaRecorrente({ ...o, version: o.version + 1, revisaoId: v.id, revisaoVersion: v.version, financeiro: { ...financeiro, descricao: v.descricao, categoriaId: v.categoriaId, valorCentavos: v.valorCentavos, estimado: v.estimado, ...(v.titularId ? { titularId: v.titularId } : {}), ...(v.contaPrevistaId ? { contaPrevistaId: v.contaPrevistaId } : {}), ...(v.etiquetaIds ? { etiquetaIds: v.etiquetaIds } : {}), ...(v.observacao ? { observacao: v.observacao } : {}), ...(s.natureza === 'receitaExterna' ? { dataPrevista: data.valor } : { vencimento: data.valor, dataConsumo: data.valor }) } })
    if (!atualizada.ok) return atualizada
    alteradas.push(atualizada.valor)
  }
  const seguintes = revisoes.filter(v => v.id !== vigente.id)
  if (vigente.inicioMes < vigencia) {
    const anterior = validarRevisaoRecorrente({ ...vigente, fimExclusivo: vigencia, version: s.version + 1 })
    if (!anterior.ok) return anterior
    seguintes.push(anterior.valor)
  }
  seguintes.push(nova.valor); seguintes.sort((a, b) => a.inicioMes.localeCompare(b.inicioMes))
  const atualizada = validarSerieRecorrente({ ...s, version: s.version + 1 })
  return atualizada.ok ? sucesso({ serie: atualizada.valor, revisoes: Object.freeze(seguintes), ocorrenciasAlteradas: Object.freeze(alteradas), preservadas: Object.freeze(preservadas), slotsConferidos: quantidade, producaoHabilitada: false as const }) : atualizada
}
