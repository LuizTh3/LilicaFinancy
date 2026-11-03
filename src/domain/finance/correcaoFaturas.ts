import { competencia, dataCalendario } from './calendar'
import { camposPermitidos, falha, registro, sucesso, texto, versaoValida } from './errors'
import { ajustarCapacidadeItem, validarCapacidadeItem } from './itemCapacity'
import { resumirControleFatura, validarControleFatura } from './liquidacoesFaturas'
import { idValido } from './settlement'
import { somarCentavos, subtrairCentavos } from './money'
import { instanteTecnicoValido } from './technicalTime'
import type { ContextoLiquidacaoFatura } from './contracts/liquidacoesFaturas'

const erro = () => falha('referenciaInvalida', 'A correção exige item, fatura e capacidade íntegros, sem gerar saldo credor.', { recuperacao: 'reler' })

/** Pure proposal. The writer must prove the item position and all expected versions atomically. */
export function planejarCorrecaoItemFatura(input: unknown, item: unknown, comando: unknown, ctx: ContextoLiquidacaoFatura) {
  const valid = validarControleFatura(input)
  if (!valid.ok) return valid
  const c = valid.valor
  const resumo = resumirControleFatura(c, ctx)
  if (!resumo.ok || !instanteTecnicoValido(ctx.instante) || ctx.instante < c.updatedAt || !versaoValida(c.version + 1)) return erro()
  if (!registro(item) || !camposPermitidos(item, ['uid', 'id', 'faturaId', 'dataOrigem', 'capacidade']) || item.uid !== c.uid || item.faturaId !== c.faturaId || !idValido(item.id) || !dataCalendario(item.dataOrigem).ok || (item.dataOrigem as string) > ctx.hoje) return erro()
  const capacidade = validarCapacidadeItem(item.capacidade)
  if (!capacidade.ok) return capacidade
  if (!registro(comando) || !idValido(comando.operationKey) || !texto(comando.motivo, 1000) || !dataCalendario(comando.dataRegistroFinanceira).ok || (comando.dataRegistroFinanceira as string) > ctx.hoje || (comando.dataRegistroFinanceira as string) < (item.dataOrigem as string)) return erro()
  if (comando.expectedVersion !== c.version) return falha('conflitoVersao', 'A fatura mudou. Refaça a prévia.', { recuperacao: 'reler', versaoAtual: c.version })
  const comuns = ['operationKey', 'expectedVersion', 'motivo', 'dataRegistroFinanceira', 'variante']
  let proxima = capacidade.valor
  let delta = 0
  if (comando.variante === 'monetaria') {
    if (!camposPermitidos(comando, [...comuns, 'sentido', 'valorCentavos']) || !['acrescimo', 'reducao'].includes(String(comando.sentido))) return erro()
    const ajuste = ajustarCapacidadeItem(proxima, { tipo: comando.sentido, valorCentavos: comando.valorCentavos })
    if (!ajuste.ok) return ajuste
    proxima = ajuste.valor.capacidade
    delta = (comando.sentido === 'reducao' ? -1 : 1) * (comando.valorCentavos as number)
  } else if (comando.variante === 'classificacao') {
    if (!camposPermitidos(comando, [...comuns, 'categoriaId']) || !idValido(comando.categoriaId) || comando.categoriaId === proxima.categoriaEfetivaId) return erro()
    proxima = { ...proxima, categoriaEfetivaId: comando.categoriaId }
  } else return erro()
  const valor = delta >= 0 ? somarCentavos([c.exigivelCentavos, delta]) : subtrairCentavos(c.exigivelCentavos, -delta)
  if (!valor.ok || valor.valor < c.liquidadoLiquidoCentavos) return erro()
  const { ultimoEventoOrigemId: _, ...anterior } = c
  const eventoId = `corrigirItem__${comando.operationKey}`
  const controle = validarControleFatura({ ...anterior, version: c.version + 1, exigivelCentavos: valor.valor, ultimoEventoTipo: 'corrigirItem', ultimoEventoId: eventoId, updatedAt: ctx.instante })
  if (!controle.ok) return controle
  const mes = competencia((item.dataOrigem as string).slice(0, 7))
  if (!mes.ok) return mes
  return sucesso({ controle: controle.valor, item: { ...item, capacidade: proxima }, efeito: { id: eventoId, uid: c.uid, itemId: item.id, faturaId: c.faturaId, tipo: comando.variante === 'monetaria' ? 'correcaoMonetaria' as const : 'reclassificacao' as const, competenciaConsumo: mes.valor, deltaCentavos: delta, categoriaAnteriorId: capacidade.valor.categoriaEfetivaId, categoriaNovaId: proxima.categoriaEfetivaId, motivo: comando.motivo, dataRegistroFinanceira: comando.dataRegistroFinanceira } })
}
