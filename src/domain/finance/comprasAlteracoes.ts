import { criarCompraFinita, validarCompraFinita } from './comprasAggregate'
import { camposPermitidos, falha, registro, sucesso, texto, versaoValida } from './errors'
import type { Resultado } from './errors'
import type { CompraFinita } from './contracts/compras'
import type { Cartao } from './contracts/cartoes'
import { aplicarControleFinanceiroFatura, validarFaturaFinanceira } from './faturaFinanceira'
import type { FaturaFinanceira } from './faturaFinanceira'
import { cicloFatura } from './faturas'
import { somarCentavos, subtrairCentavos } from './money'
import { idValido } from './settlement'
import { instanteTecnicoValido } from './technicalTime'

type Contexto = Readonly<{ uid: string; hoje: string; instante: number; cartao: Cartao; faturas: readonly unknown[] }>
type Transicao = Readonly<{ faturaId: string; calendarioVersion: number; expectedVersion: number; resultVersion: number; deltaCentavos: number }>
const erro = () => falha('referenciaInvalida', 'Confira todos os destinos: edição comum exige faturas abertas, sem pagamentos ou ajustes.', { recuperacao: 'reler' })

/** Local whole-schedule proposal. No persistence capability or inferred multi-step budget. */
export function prepararAlteracaoCompra(input: unknown, comando: unknown, ctx: Contexto): Resultado<{ compra: CompraFinita; faturas: readonly FaturaFinanceira[]; transicoes: readonly Transicao[]; antes: CompraFinita; producaoHabilitada: false }> {
  const valid = validarCompraFinita(input)
  if (!valid.ok) return valid
  const c = valid.valor
  if (c.uid !== ctx.uid || c.estadoObrigacao !== 'ativa' || ctx.cartao.uid !== c.uid || ctx.cartao.id !== c.cartaoId || ctx.cartao.estado !== 'ativo' || !instanteTecnicoValido(ctx.instante) || ctx.instante < c.updatedAt || !versaoValida(c.version + 1) || ctx.faturas.length > 50) return erro()
  if (!registro(comando) || !idValido(comando.operationKey) || !['editarCompra', 'cancelarCompra'].includes(String(comando.tipo)) || !camposPermitidos(comando, ['tipo', 'operationKey', 'expectedVersion', ...(comando.tipo === 'editarCompra' ? ['dados'] : ['motivo'])])) return erro()
  if (comando.expectedVersion !== c.version) return falha('conflitoVersao', 'A compra mudou. Refaça a prévia.', { versaoAtual: c.version, recuperacao: 'reler' })
  // Common editing cannot erase corrections, reclassifications or real returns.
  if (Object.values(c.parcelas).some(p => p.capacidade.correcaoAcrescimosCentavos || p.capacidade.correcaoReducoesCentavos || p.capacidade.devolvidoCentavos || p.capacidade.categoriaEfetivaId !== c.categoriaId)) return erro()
  const faturas = new Map<string, FaturaFinanceira>()
  for (const raw of ctx.faturas) {
    const f = validarFaturaFinanceira(raw)
    if (!f.ok || f.valor.uid !== c.uid || f.valor.cartaoId !== c.cartaoId || faturas.has(f.valor.id)) return erro()
    faturas.set(f.valor.id, f.valor)
  }
  let proposta: Resultado<CompraFinita>
  if (comando.tipo === 'cancelarCompra') {
    if (!texto(comando.motivo, 1000)) return erro()
    proposta = validarCompraFinita({ ...c, version: c.version + 1, estadoObrigacao: 'cancelada', ultimoEventoId: `cancelarCompra__${comando.operationKey}`, updatedAt: ctx.instante, canceledAt: ctx.instante, cancelamentoMotivo: (comando.motivo as string).trim() })
  } else {
    const calendarios = [...faturas.values()].map(f => {
      const { conteudo: _, versaoConteudo: __, ...calendario } = f
      return { ...calendario, versaoConteudo: 1 as const }
    })
    const criada = criarCompraFinita(comando.dados, { uid: c.uid, hoje: ctx.hoje, cartao: ctx.cartao, faturas: calendarios, controles: [...faturas.values()].map(f => ({ uid: f.uid, faturaId: f.id, version: f.conteudo.version, possuiHistoricoPagamento: f.conteudo.possuiHistoricoPagamento })) }, { id: c.id, eventoId: `criarCompra__${comando.operationKey}`, instante: ctx.instante })
    if (!criada.ok) return criada
    if (criada.valor.cartaoId !== c.cartaoId || !versaoValida(c.cronogramaRevision + 1)) return erro()
    const campos = ['cartaoId', 'descricao', 'dataCompra', 'categoriaId', 'etiquetaIds', 'valorTotalCentavos', 'quantidadeParcelas', 'primeiraCompetenciaFatura', 'primeiraFaturaEscolha'] as const
    if (campos.every(k => JSON.stringify(c[k]) === JSON.stringify(criada.valor[k]))) return falha('valorInvalido', 'A compra não possui alterações para confirmar.')
    proposta = validarCompraFinita({ ...criada.valor, version: c.version + 1, cronogramaRevision: c.cronogramaRevision + 1, createdAt: c.createdAt, ultimoEventoId: `editarCompra__${comando.operationKey}` })
  }
  if (!proposta.ok) return proposta
  const depois = proposta.valor
  const ids = [...new Set([...Object.values(c.parcelas), ...(depois.estadoObrigacao === 'ativa' ? Object.values(depois.parcelas) : [])].map(p => p.faturaId))].sort()
  const alteradas: FaturaFinanceira[] = [], transicoes: Transicao[] = []
  for (const id of ids) {
    const f = faturas.get(id)
    if (!f) return erro()
    const ciclo = cicloFatura(f, ctx.hoje), controle = f.conteudo
    if (!ciclo.ok || ciclo.valor === 'fechada' || controle.possuiHistoricoPagamento || controle.revisaoEstado !== 'normal' || ctx.instante < controle.updatedAt) return erro()
    const antes = somarCentavos(Object.values(c.parcelas).filter(p => p.faturaId === id).map(p => p.valorCentavos))
    const novo = somarCentavos(depois.estadoObrigacao === 'ativa' ? Object.values(depois.parcelas).filter(p => p.faturaId === id).map(p => p.valorCentavos) : [])
    if (!antes.ok || !novo.ok) return erro()
    const sem = subtrairCentavos(controle.exigivelCentavos, antes.valor)
    if (!sem.ok) return erro()
    const total = somarCentavos([sem.valor, novo.valor])
    if (!total.ok) return total
    const atualizada = aplicarControleFinanceiroFatura(f, { ...controle, version: controle.version + 1, exigivelCentavos: total.valor, ultimoEventoTipo: comando.tipo, ultimoEventoId: depois.ultimoEventoId, ultimoEventoOrigemId: c.id, updatedAt: ctx.instante })
    if (!atualizada.ok) return atualizada
    alteradas.push(atualizada.valor)
    transicoes.push({ faturaId: id, calendarioVersion: f.version, expectedVersion: controle.version, resultVersion: controle.version + 1, deltaCentavos: novo.valor - antes.valor })
  }
  return sucesso({ compra: depois, faturas: alteradas, transicoes, antes: c, producaoHabilitada: false })
}
