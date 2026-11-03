import { dataCalendario } from './calendar'
import { camposPermitidos, falha, registro, sucesso, texto, versaoValida } from './errors'
import type { Resultado } from './errors'
import { ajustarCapacidadeItem, validarCapacidadeItem } from './itemCapacity'
import type { CapacidadeItem } from './itemCapacity'
import { resumirControleFatura, validarControleFatura } from './liquidacoesFaturas'
import { somarCentavos, subtrairCentavos, valorPositivo } from './money'
import { idValido, validarFatos } from './settlement'
import { instanteTecnicoValido } from './technicalTime'
import type { ContextoLiquidacaoFatura } from './contracts/liquidacoesFaturas'
import type { FatoLiquidacao } from './contracts/commands'

type Item = Readonly<{ uid: string; id: string; faturaId: string; estadoObrigacao: 'ativa'; capacidade: CapacidadeItem }>
type Pagamento = Readonly<{ original: FatoLiquidacao; reembolsadoCentavos: number; revertido: false }>
const erro = () => falha('referenciaInvalida', 'Confira itens, distribuição e capacidade dos pagamentos. Saldo credor não é suportado.', { recuperacao: 'reler' })
function distribuicao(input: unknown, chave: string): Resultado<ReadonlyMap<string, number>> {
  if (!Array.isArray(input) || !input.length || input.length > 12) return erro()
  const valores = new Map<string, number>()
  for (const p of input) {
    if (!registro(p) || !camposPermitidos(p, [chave, 'valorCentavos']) || !idValido(p[chave]) || !valorPositivo(p.valorCentavos).ok || valores.has(p[chave] as string)) return erro()
    valores.set(p[chave] as string, p.valorCentavos as number)
  }
  return sucesso(valores)
}

/** One-invoice atomic proposal. Cross-invoice distribution must coordinate every proposal in one command. */
export function planejarDevolucaoFatura(input: unknown, itensInput: unknown, pagamentosInput: unknown, comando: unknown, ctx: ContextoLiquidacaoFatura) {
  const valid = validarControleFatura(input)
  if (!valid.ok) return valid
  const c = valid.valor, resumo = resumirControleFatura(c, ctx)
  if (!resumo.ok || c.revisaoEstado !== 'normal' || !instanteTecnicoValido(ctx.instante) || ctx.instante < c.updatedAt || !versaoValida(c.version + 1)) return erro()
  if (!registro(comando) || !camposPermitidos(comando, ['operationKey', 'expectedVersion', 'motivo', 'dataEfeito', 'valorCentavos', 'distribuicaoItens', 'destino']) || !idValido(comando.operationKey) || !texto(comando.motivo, 1000) || !dataCalendario(comando.dataEfeito).ok || (comando.dataEfeito as string) > ctx.hoje || !valorPositivo(comando.valorCentavos).ok || !registro(comando.destino)) return erro()
  if (comando.expectedVersion !== c.version) return falha('conflitoVersao', 'A fatura mudou. Refaça a prévia.', { versaoAtual: c.version, recuperacao: 'reler' })
  const distrib = distribuicao(comando.distribuicaoItens, 'itemId')
  if (!distrib.ok) return distrib
  const soma = somarCentavos([...distrib.valor.values()])
  if (!soma.ok || soma.valor !== comando.valorCentavos || !Array.isArray(itensInput) || itensInput.length !== distrib.valor.size) return erro()
  const itens: Item[] = [], vistos = new Set<string>()
  for (const item of itensInput) {
    if (!registro(item) || !camposPermitidos(item, ['uid', 'id', 'faturaId', 'estadoObrigacao', 'capacidade']) || item.uid !== c.uid || item.faturaId !== c.faturaId || !idValido(item.id) || item.estadoObrigacao !== 'ativa' || vistos.has(item.id)) return erro()
    vistos.add(item.id)
    const capacidade = validarCapacidadeItem(item.capacidade), valor = distrib.valor.get(item.id)
    if (!capacidade.ok || valor === undefined) return erro()
    const ajuste = ajustarCapacidadeItem(capacidade.valor, { tipo: 'devolucao', valorCentavos: valor })
    if (!ajuste.ok) return ajuste
    itens.push({ uid: c.uid, id: item.id, faturaId: c.faturaId, estadoObrigacao: 'ativa', capacidade: ajuste.valor.capacidade })
  }
  itens.sort((a, b) => a.id.localeCompare(b.id))
  const destino = comando.destino, fatos: FatoLiquidacao[] = [], pagamentos: Pagamento[] = []
  const eventoId = `estornarConsumo__${comando.operationKey}`
  let novoLiquidado = c.liquidadoLiquidoCentavos
  if (destino.tipo === 'fatura') {
    if (!camposPermitidos(destino, ['tipo']) || !Array.isArray(pagamentosInput) || pagamentosInput.length) return erro()
  } else if (destino.tipo === 'conta') {
    if (!camposPermitidos(destino, ['tipo', 'contaId', 'dataRecebida', 'distribuicaoPagamentos']) || !ctx.conta || ctx.conta.uid !== c.uid || ctx.conta.estadoCadastro !== 'ativo' || ctx.conta.id !== destino.contaId || !dataCalendario(destino.dataRecebida).ok || (destino.dataRecebida as string) > ctx.hoje || (destino.dataRecebida as string) < (comando.dataEfeito as string) || !c.possuiHistoricoPagamento) return erro()
    const parts = distribuicao(destino.distribuicaoPagamentos, 'pagamentoId')
    if (!parts.ok) return parts
    const total = somarCentavos([...parts.valor.values()])
    if (!total.ok || total.valor !== soma.valor || !Array.isArray(pagamentosInput) || pagamentosInput.length !== parts.valor.size) return erro()
    const ids = new Set<string>()
    for (const p of pagamentosInput) {
      if (!registro(p) || !camposPermitidos(p, ['original', 'reembolsadoCentavos', 'revertido']) || p.revertido !== false) return erro()
      const facts = validarFatos([p.original], c.uid)
      if (!facts.ok) return facts
      const original = facts.valor[0], valor = parts.valor.get(original.id)
      if (original.tipo !== 'pagamento' || original.alvo.tipo !== 'fatura' || original.alvo.id !== c.faturaId || original.dataEfetiva > (destino.dataRecebida as string) || ids.has(original.id) || valor === undefined) return erro()
      ids.add(original.id)
      const capacidade = somarCentavos([p.reembolsadoCentavos as number, valor])
      if (!capacidade.ok || capacidade.valor > original.valorCentavos) return erro()
      pagamentos.push({ original, reembolsadoCentavos: capacidade.valor, revertido: false })
    }
    pagamentos.sort((a, b) => a.original.id.localeCompare(b.original.id))
    pagamentos.forEach((p, i) => fatos.push({ id: `${eventoId}__p${i + 1}`, uid: c.uid, schemaVersion: 1, version: 1, tipo: 'reembolso', operacaoId: eventoId, alvo: p.original.alvo, originalId: p.original.id, valorCentavos: parts.valor.get(p.original.id)!, contaId: ctx.conta!.id, dataEfetiva: destino.dataRecebida as string, estornoId: eventoId, motivo: comando.motivo as string }))
    const pago = subtrairCentavos(novoLiquidado, soma.valor)
    if (!pago.ok) return pago
    novoLiquidado = pago.valor
  } else return erro()
  const exigivel = subtrairCentavos(c.exigivelCentavos, soma.valor)
  if (!exigivel.ok || exigivel.valor < novoLiquidado) return erro()
  const { ultimoEventoOrigemId: _, ...antes } = c
  const controle = validarControleFatura({ ...antes, version: c.version + 1, exigivelCentavos: exigivel.valor, liquidadoLiquidoCentavos: novoLiquidado, ultimoEventoTipo: 'estornarConsumo', ultimoEventoId: eventoId, updatedAt: ctx.instante })
  if (!controle.ok) return controle
  return sucesso({ controle: controle.valor, itens, pagamentos, fatos, estornos: itens.map((item, i) => ({ id: `${eventoId}__i${i + 1}`, uid: c.uid, itemId: item.id, faturaId: c.faturaId, valorCentavos: distrib.valor.get(item.id)!, dataEfeito: comando.dataEfeito as string, motivo: comando.motivo as string, operacaoId: eventoId })) })
}
