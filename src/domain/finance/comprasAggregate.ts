import { avancarCompetencia } from './calendar'
import { idCartaoValido } from './cartoes'
import { prepararCompra, validarDadosCompra } from './compras'
import type { CompraFinita, ContextoPreviaCompra, ParcelaCompraProposta, ParcelaCompraVigente } from './contracts/compras'
import { camposPermitidos, falha, registro, sucesso, versaoValida } from './errors'
import type { Resultado } from './errors'
import { faturaId } from './faturas'
import { identidadeParcelaCompra } from './identity'
import { distribuirParcelas } from './money'
import { criarCapacidadeItem, validarCapacidadeItem } from './itemCapacity'
import { instanteTecnicoValido } from './technicalTime'

const camposDados = ['cartaoId', 'descricao', 'dataCompra', 'categoriaId', 'etiquetaIds', 'valorTotalCentavos', 'quantidadeParcelas', 'primeiraCompetenciaFatura']
const camposMeta = ['id', 'uid', 'schemaVersion', 'version', 'cronogramaRevision', 'primeiraFaturaEscolha', 'parcelas', 'competenciasFaturas', 'estadoObrigacao', 'ultimoEventoId', 'createdAt', 'updatedAt']
const camposParcela = ['numero', 'quantidadeOriginal', 'valorCentavos', 'competenciaFatura', 'faturaId', 'capacidade']
const invalida = () => falha('esquemaIncompativel', 'Compra ou cronograma incompatível. Atualize os dados antes de continuar.', { recuperacao: 'reler' })
const instante = instanteTecnicoValido
export const chavePosicaoCompra = (numero: number) => `p${String(numero).padStart(2, '0')}`

/** Closed finite schema: each physical document contains only its current schedule. */
export function validarCompraFinita(input: unknown): Resultado<CompraFinita> {
  if (!registro(input) || !camposPermitidos(input, [...camposDados, ...camposMeta, 'canceledAt', 'cancelamentoMotivo']) || ![...camposDados, ...camposMeta].every(k => k in input)) return invalida()
  if (input.schemaVersion !== 2 || !idCartaoValido(input.id) || typeof input.uid !== 'string' || !input.uid || !versaoValida(input.version) || !versaoValida(input.cronogramaRevision) || input.cronogramaRevision > input.version || !instante(input.createdAt) || !instante(input.updatedAt) || input.updatedAt < input.createdAt) return invalida()
  if (!['sugerida', 'explicita'].includes(String(input.primeiraFaturaEscolha)) || !['ativa', 'cancelada'].includes(String(input.estadoObrigacao)) || typeof input.ultimoEventoId !== 'string' || !/^(criarCompra|editarCompra|cancelarCompra|incluirCompraEsquecida)__[A-Za-z0-9-]{1,64}$/.test(input.ultimoEventoId)) return invalida()
  const dados = validarDadosCompra(Object.fromEntries(camposDados.map(k => [k, input[k]])))
  const etiquetas = input.etiquetaIds
  if (!dados.ok || !dados.valor.primeiraCompetenciaFatura || dados.valor.descricao !== input.descricao || !Array.isArray(etiquetas) || dados.valor.etiquetaIds.some((id, i) => id !== etiquetas[i])) return invalida()
  if (input.version === 1 && (input.cronogramaRevision !== 1 || input.estadoObrigacao !== 'ativa' || !input.ultimoEventoId.startsWith('criarCompra__') && !input.ultimoEventoId.startsWith('incluirCompraEsquecida__') || input.createdAt !== input.updatedAt)) return invalida()
  if (input.estadoObrigacao === 'cancelada') {
    if (!instante(input.canceledAt) || input.canceledAt !== input.updatedAt || typeof input.cancelamentoMotivo !== 'string' || !input.cancelamentoMotivo.trim() || input.cancelamentoMotivo !== input.cancelamentoMotivo.trim() || [...input.cancelamentoMotivo].length > 1000 || !input.ultimoEventoId.startsWith('cancelarCompra__')) return invalida()
  } else if ('canceledAt' in input || 'cancelamentoMotivo' in input || input.ultimoEventoId.startsWith('cancelarCompra__')) return invalida()
  if (!registro(input.parcelas) || Object.keys(input.parcelas).length !== dados.valor.quantidadeParcelas || !Array.isArray(input.competenciasFaturas) || input.competenciasFaturas.length !== dados.valor.quantidadeParcelas) return invalida()
  const valores = distribuirParcelas(dados.valor.valorTotalCentavos, dados.valor.quantidadeParcelas)
  if (!valores.ok) return invalida()
  const parcelas: Record<string, ParcelaCompraProposta & { capacidade: import('./itemCapacity').CapacidadeItem }> = {}
  const meses = []
  for (let i = 0; i < valores.valor.length; i++) {
    const mes = avancarCompetencia(dados.valor.primeiraCompetenciaFatura, i)
    if (!mes.ok) return invalida()
    const chave = chavePosicaoCompra(i + 1), p = input.parcelas[chave]
    if (!registro(p) || !camposPermitidos(p, camposParcela) || camposParcela.some(k => !(k in p)) || p.numero !== i + 1 || p.quantidadeOriginal !== valores.valor.length || p.valorCentavos !== valores.valor[i] || p.competenciaFatura !== mes.valor || p.faturaId !== faturaId(dados.valor.cartaoId, mes.valor) || input.competenciasFaturas[i] !== mes.valor) return invalida()
    const capacidade = validarCapacidadeItem(p.capacidade)
    if (!capacidade.ok || capacidade.valor.valorOriginalCentavos !== p.valorCentavos || input.version === 1 && (capacidade.valor.correcaoAcrescimosCentavos !== 0 || capacidade.valor.correcaoReducoesCentavos !== 0 || capacidade.valor.devolvidoCentavos !== 0 || capacidade.valor.categoriaEfetivaId !== dados.valor.categoriaId)) return invalida()
    parcelas[chave] = Object.freeze({ numero: i + 1, quantidadeOriginal: valores.valor.length, valorCentavos: valores.valor[i], competenciaFatura: mes.valor, faturaId: p.faturaId as string, capacidade: capacidade.valor })
    meses.push(mes.valor)
  }
  if (new TextEncoder().encode(JSON.stringify(input)).length > 32768) return invalida()
  return sucesso(Object.freeze({ ...dados.valor, primeiraCompetenciaFatura: dados.valor.primeiraCompetenciaFatura, uid: input.uid, id: input.id, schemaVersion: 2, version: input.version, cronogramaRevision: input.cronogramaRevision, primeiraFaturaEscolha: input.primeiraFaturaEscolha as CompraFinita['primeiraFaturaEscolha'], parcelas: Object.freeze(parcelas), competenciasFaturas: Object.freeze(meses), estadoObrigacao: input.estadoObrigacao as CompraFinita['estadoObrigacao'], ultimoEventoId: input.ultimoEventoId, createdAt: input.createdAt, updatedAt: input.updatedAt, ...(input.estadoObrigacao === 'cancelada' ? { canceledAt: input.canceledAt as number, cancelamentoMotivo: input.cancelamentoMotivo as string } : {}) }))
}

export function criarCompraFinita(input: unknown, contexto: ContextoPreviaCompra, meta: Readonly<{ id: string; eventoId: string; instante: number }>): Resultado<CompraFinita> {
  if (!idCartaoValido(meta.id) || !/^criarCompra__[A-Za-z0-9-]{1,64}$/.test(meta.eventoId) || !instante(meta.instante)) return invalida()
  const previa = prepararCompra(input, contexto)
  if (!previa.ok) return previa
  const p = previa.valor
  const parcelas: Record<string, ParcelaCompraProposta & { capacidade: import('./itemCapacity').CapacidadeItem }> = {}
  for (const parcela of p.parcelas) {
    const capacidade = criarCapacidadeItem(parcela.valorCentavos, p.dados.categoriaId)
    if (!capacidade.ok) return capacidade
    parcelas[chavePosicaoCompra(parcela.numero)] = { ...parcela, capacidade: capacidade.valor }
  }
  return validarCompraFinita({ ...p.dados, primeiraCompetenciaFatura: p.primeiraCompetenciaFatura, primeiraFaturaEscolha: p.primeiraFaturaEscolha, id: meta.id, uid: contexto.uid, schemaVersion: 2, version: 1, cronogramaRevision: 1, parcelas, competenciasFaturas: p.parcelas.map(parcela => parcela.competenciaFatura), estadoObrigacao: 'ativa', ultimoEventoId: meta.eventoId, createdAt: meta.instante, updatedAt: meta.instante })
}

/** History is resolved as its own event snapshot, never merged with the current revision. */
export function resolverParcelasCompra(input: unknown): Resultado<readonly ParcelaCompraVigente[]> {
  const compra = validarCompraFinita(input)
  if (!compra.ok) return compra
  const c = compra.valor
  if (c.estadoObrigacao === 'cancelada') return sucesso(Object.freeze([]))
  const result: ParcelaCompraVigente[] = []
  for (const parcela of Object.values(c.parcelas)) {
    const id = identidadeParcelaCompra(c.id, c.cronogramaRevision, parcela.numero)
    if (!id.ok) return id
    result.push(Object.freeze({ ...parcela, id: id.valor, compraId: c.id, cronogramaRevision: c.cronogramaRevision }))
  }
  return sucesso(Object.freeze(result))
}
