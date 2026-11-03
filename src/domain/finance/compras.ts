import { avancarCompetencia, competencia, dataCalendario } from './calendar'
import { idCartaoValido } from './cartoes'
import type { ContextoPreviaCompra, DadosCompra, ParcelaCompraProposta, PreviaCompra } from './contracts/compras'
import { camposPermitidos, falha, registro, sucesso, versaoValida } from './errors'
import type { Resultado } from './errors'
import { construirFatura, cicloFatura, faturaId, resolverPrimeiraFatura } from './faturas'
import type { CalendarioFaturaV2 } from './invoiceCalendar'
import { distribuirParcelas, valorPositivo } from './money'

const invalido = () => falha('valorInvalido', 'Confira os dados da compra.', { recuperacao: 'corrigir' })
const referencia = () => falha('referenciaInvalida', 'Confira cartão, calendário e histórico de pagamentos.', { recuperacao: 'reler' })
export function validarDadosCompra(input: unknown): Resultado<DadosCompra> {
  if (!registro(input) || !camposPermitidos(input, ['cartaoId', 'descricao', 'dataCompra', 'categoriaId', 'etiquetaIds', 'valorTotalCentavos', 'quantidadeParcelas', 'primeiraCompetenciaFatura'])) return invalido()
  if (!idCartaoValido(input.cartaoId) || !idCartaoValido(input.categoriaId) || typeof input.descricao !== 'string' || !input.descricao.trim() || [...input.descricao.trim()].length > 120) return invalido()
  if (!Array.isArray(input.etiquetaIds) || input.etiquetaIds.length > 5 || input.etiquetaIds.some(id => !idCartaoValido(id)) || new Set(input.etiquetaIds).size !== input.etiquetaIds.length) return invalido()
  const data = dataCalendario(input.dataCompra), total = valorPositivo(input.valorTotalCentavos)
  if (!data.ok) return data
  if (!total.ok) return total
  const valores = distribuirParcelas(total.valor, input.quantidadeParcelas)
  if (!valores.ok) return valores
  let primeira: DadosCompra['primeiraCompetenciaFatura']
  if ('primeiraCompetenciaFatura' in input) {
    const valid = competencia(input.primeiraCompetenciaFatura)
    if (!valid.ok) return valid
    primeira = valid.valor
  }
  return sucesso(Object.freeze({ cartaoId: input.cartaoId, descricao: input.descricao.trim(), dataCompra: data.valor, categoriaId: input.categoriaId, etiquetaIds: Object.freeze([...input.etiquetaIds].sort() as string[]), valorTotalCentavos: total.valor, quantidadeParcelas: valores.valor.length, ...(primeira ? { primeiraCompetenciaFatura: primeira } : {}) }))
}

/** No writes, payment facts or duplicated due dates are produced by this planner. */
export function prepararCompra(input: unknown, contexto: ContextoPreviaCompra): Resultado<PreviaCompra> {
  const dados = validarDadosCompra(input), hoje = dataCalendario(contexto.hoje)
  if (!dados.ok) return dados
  if (!hoje.ok) return hoje
  const c = contexto.cartao
  if (!contexto.uid || c.uid !== contexto.uid || c.id !== dados.valor.cartaoId || c.estado !== 'ativo' || contexto.faturas.length > 50 || contexto.controles.length > 50) return referencia()
  const controles = new Map<string, ContextoPreviaCompra['controles'][number]>()
  for (const controle of contexto.controles) {
    if (!registro(controle) || !camposPermitidos(controle, ['uid', 'faturaId', 'version', 'possuiHistoricoPagamento']) || controle.uid !== contexto.uid || !versaoValida(controle.version) || typeof controle.possuiHistoricoPagamento !== 'boolean' || controles.has(controle.faturaId)) return referencia()
    controles.set(controle.faturaId, controle)
  }
  const primeira = resolverPrimeiraFatura(c, dados.valor.dataCompra, contexto.faturas, dados.valor.primeiraCompetenciaFatura)
  if (!primeira.ok) return primeira
  if (!primeira.valor.calendario) return falha('integridadeIndeterminada', 'Escolha uma primeira fatura e confira novamente.', { recuperacao: 'corrigir' })
  const inicio = primeira.valor.calendario.competencia
  const valores = distribuirParcelas(dados.valor.valorTotalCentavos, dados.valor.quantidadeParcelas)
  if (!valores.ok) return valores
  const parcelas: ParcelaCompraProposta[] = [], faturas: CalendarioFaturaV2[] = []
  const versoes: { faturaId: string; calendario: number; controle: number }[] = []
  for (let i = 0; i < valores.valor.length; i++) {
    const mes = avancarCompetencia(inicio, i)
    if (!mes.ok) return mes
    const id = faturaId(c.id, mes.valor)
    const existente = contexto.faturas.find(f => f.id === id)
    const calendario = existente ? sucesso<CalendarioFaturaV2>(existente) : construirFatura(c, mes.valor, contexto.faturas)
    if (!calendario.ok) return calendario
    const ciclo = cicloFatura(calendario.valor, hoje.valor)
    if (!ciclo.ok) return ciclo
    if (ciclo.valor === 'fechada') return falha('referenciaInvalida', 'Fatura fechada não permite cadastrar a compra.', { recuperacao: 'corrigir' })
    const controle = controles.get(id)
    if (existente && (!controle || controle.possuiHistoricoPagamento)) return referencia()
    if (!existente && controle) return referencia()
    // Select only calendar fields: callers cannot smuggle financial controls into the preview.
    faturas.push({ competencia: calendario.valor.competencia, inicio: calendario.valor.inicio, fechamento: calendario.valor.fechamento, vencimento: calendario.valor.vencimento, calendarioOrigem: { ...calendario.valor.calendarioOrigem } })
    versoes.push({ faturaId: id, calendario: existente?.version ?? 0, controle: controle?.version ?? 0 })
    parcelas.push(Object.freeze({ numero: i + 1, quantidadeOriginal: valores.valor.length, valorCentavos: valores.valor[i], competenciaFatura: mes.valor, faturaId: id }))
  }
  const primeiraFaturaEscolha = dados.valor.primeiraCompetenciaFatura ? 'explicita' as const : 'sugerida' as const
  const conteudoConferencia = JSON.stringify({ uid: contexto.uid, cartaoVersion: c.version, dados: dados.valor, primeiraFaturaEscolha, parcelas, faturas, versoes })
  if (new TextEncoder().encode(conteudoConferencia).length > 16384) return falha('limiteOperacional', 'A prévia excede 16 KiB.', { limite: 16384 })
  return sucesso({ dados: dados.valor, primeiraFaturaEscolha, primeiraCompetenciaFatura: inicio, parcelas: Object.freeze(parcelas), faturas: Object.freeze(faturas), conteudoConferencia })
}
