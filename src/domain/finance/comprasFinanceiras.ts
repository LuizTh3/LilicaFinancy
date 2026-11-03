import { criarCompraFinita, validarCompraFinita } from './comprasAggregate'
import { validarDadosCompra } from './compras'
import type { CompraFinita } from './contracts/compras'
import type { Cartao } from './contracts/cartoes'
import type { Fatura } from './contracts/faturas'
import { camposPermitidos, falha, registro, sucesso, versaoValida } from './errors'
import type { Resultado } from './errors'
import { aplicarControleFinanceiroFatura, validarFaturaFinanceira } from './faturaFinanceira'
import type { FaturaFinanceira } from './faturaFinanceira'
import { dadosFatura } from './faturas'
import { somarCentavos } from './money'
import { canonicalizarComando } from './identity'

export type ImagemCompraFinita = Omit<CompraFinita, 'uid' | 'id' | 'createdAt' | 'updatedAt' | 'ultimoEventoId'>
export type TransicaoCriacaoCompra = Readonly<{
  tipo: 'criarCompra'; eventoId: string; cartaoVersion: number; expectedVersion: 0; resultVersion: 1; antes: null; depois: ImagemCompraFinita
  faturas: Readonly<Record<string, Readonly<{ calendarioVersion: number; expectedVersion: number; resultVersion: number; deltaCentavos: number }>>>
}>
export type CompraFinanceira = CompraFinita & Readonly<{ comandoAtual: TransicaoCriacaoCompra }>
export function validarCompraFinanceira(input: unknown): Resultado<CompraFinanceira> {
  const invalid = () => falha('integridadeIndeterminada', 'A compra não corresponde à sua transição financeira finita.', { recuperacao: 'reler' })
  if (!registro(input) || !registro(input.comandoAtual)) return invalid()
  const { comandoAtual: raw, ...base } = input, valid = validarCompraFinita(base)
  if (!valid.ok) return valid
  const c = valid.valor
  if (!camposPermitidos(raw, ['tipo', 'eventoId', 'cartaoVersion', 'expectedVersion', 'resultVersion', 'antes', 'depois', 'faturas']) || raw.tipo !== 'criarCompra' || !versaoValida(raw.cartaoVersion) || c.version !== 1 || !c.ultimoEventoId.startsWith('criarCompra__') || raw.eventoId !== c.ultimoEventoId || raw.expectedVersion !== 0 || raw.resultVersion !== 1 || raw.antes !== null || !registro(raw.depois) || !registro(raw.faturas)) return invalid()
  const { uid: _, id: __, createdAt: ___, updatedAt: ____, ultimoEventoId: _____, ...imagem } = c
  const canonico = (value: unknown) => canonicalizarComando({ contractVersion: 1, tipo: 'criarCompra', operationKey: c.ultimoEventoId.split('__')[1], payload: { comando: value }, expectedVersions: [] })
  const antes = canonico(imagem), depois = canonico(raw.depois), comando = canonico(raw)
  if (!antes.ok || !depois.ok || !comando.ok || antes.valor !== depois.valor) return invalid()
  const ids = [...new Set(Object.values(c.parcelas).map(p => p.faturaId))].sort()
  if (Object.keys(raw.faturas).length !== ids.length) return invalid()
  const transicoes: Record<string, TransicaoCriacaoCompra['faturas'][string]> = {}
  for (const id of ids) {
    const t = raw.faturas[id], delta = somarCentavos(Object.values(c.parcelas).filter(p => p.faturaId === id).map(p => p.valorCentavos))
    if (!registro(t) || !camposPermitidos(t, ['calendarioVersion', 'expectedVersion', 'resultVersion', 'deltaCentavos']) || !versaoValida(t.calendarioVersion) || !versaoValida(t.expectedVersion) || !versaoValida(t.resultVersion) || t.resultVersion !== t.expectedVersion + 1 || !delta.ok || t.deltaCentavos !== delta.valor) return invalid()
    transicoes[id] = Object.freeze({ calendarioVersion: t.calendarioVersion, expectedVersion: t.expectedVersion, resultVersion: t.resultVersion, deltaCentavos: delta.valor })
  }
  if (new TextEncoder().encode(JSON.stringify(input)).length > 32768) return invalid()
  return sucesso(Object.freeze({ ...c, comandoAtual: Object.freeze({ tipo: 'criarCompra', eventoId: c.ultimoEventoId, cartaoVersion: raw.cartaoVersion, expectedVersion: 0, resultVersion: 1, antes: null, depois: Object.freeze(imagem), faturas: Object.freeze(transicoes) }) }))
}
type PreviaFinanceira = Readonly<{
  compra: CompraFinanceira; faturas: readonly FaturaFinanceira[]
  evento: Readonly<{ id: string; uid: string; schemaVersion: 1; contractVersion: 1; tipo: 'criarCompra'; operationKey: string; compraId: string; comando: TransicaoCriacaoCompra; createdAt: number }>
  orcamento: Readonly<{ status: 'candidatoLocal'; producaoHabilitada: false; acessos: number; acessosPorEscrita: readonly number[]; leiturasTransacionais: number; mutacoes: number }>
}>
/** Complete local proposal for existing compatible invoices. No SDK, writes or remote capability. */
export function prepararCriacaoCompraFinanceira(input: unknown, contexto: Readonly<{ uid: string; hoje: string; cartao: Cartao; faturas: readonly unknown[]; primeiroUsoCategoria: boolean }>, meta: Readonly<{ id: string; eventoId: string; instante: number }>): Resultado<PreviaFinanceira> {
  const invalid = () => falha('integridadeIndeterminada', 'Confira as faturas financeiras completas antes de cadastrar a compra.', { recuperacao: 'reler' })
  const dados = validarDadosCompra(input)
  if (!dados.ok) return dados
  if (!Array.isArray(contexto.faturas) || contexto.faturas.length > 50 || typeof contexto.primeiroUsoCategoria !== 'boolean') return invalid()
  const faturas = new Map<string, FaturaFinanceira>(), calendarios: Fatura[] = []
  for (const raw of contexto.faturas) {
    const f = validarFaturaFinanceira(raw)
    if (!f.ok || f.valor.uid !== contexto.uid || f.valor.cartaoId !== contexto.cartao.id || faturas.has(f.valor.id)) return invalid()
    faturas.set(f.valor.id, f.valor)
    const { conteudo: _, versaoConteudo: __, ...calendario } = f.valor
    // Only the calendar is passed to the proven 006 planner. Financial content stays authoritative above.
    calendarios.push({ ...calendario, versaoConteudo: 1 })
  }
  const criada = criarCompraFinita(input, { uid: contexto.uid, hoje: contexto.hoje, cartao: contexto.cartao, faturas: calendarios, controles: [...faturas.values()].map(f => ({ uid: f.uid, faturaId: f.id, version: f.conteudo.version, possuiHistoricoPagamento: f.conteudo.possuiHistoricoPagamento })) }, meta)
  if (!criada.ok) return criada
  const c = criada.valor
  const destinos = new Set(Object.values(c.parcelas).map(p => p.faturaId)), u = destinos.size, l = c.etiquetaIds.length, k = Number(contexto.primeiroUsoCategoria)
  const acessosPorEscrita = [3 + u, ...Array<number>(u).fill(1), 2 + l, ...(k ? [2] : [])]
  const leiturasTransacionais = 2 + u + k, acessos = acessosPorEscrita.reduce((a, b) => a + b, 0) + leiturasTransacionais
  if (acessos > 18 || acessosPorEscrita.some(n => n > 8) || acessosPorEscrita.length > 32) return falha('limiteOperacional', 'A compra inteira excede o orçamento candidato. Nenhuma parcela foi criada.', { limite: 18 })
  const alteradas: FaturaFinanceira[] = [], transicoes: Record<string, TransicaoCriacaoCompra['faturas'][string]> = {}
  for (const id of [...destinos].sort()) {
    const f = faturas.get(id)
    if (!f || f.conteudo.revisaoEstado !== 'normal' || meta.instante < f.conteudo.updatedAt) return invalid()
    const delta = somarCentavos(Object.values(c.parcelas).filter(p => p.faturaId === id).map(p => p.valorCentavos))
    if (!delta.ok) return delta
    const total = somarCentavos([f.conteudo.exigivelCentavos, delta.valor])
    if (!total.ok) return total
    const next = aplicarControleFinanceiroFatura(f, { ...f.conteudo, version: f.conteudo.version + 1, exigivelCentavos: total.valor, ultimoEventoTipo: 'criarCompra', ultimoEventoId: meta.eventoId, ultimoEventoOrigemId: c.id, updatedAt: meta.instante })
    if (!next.ok) return next
    // Confirm that no calendar field was changed by financial composition.
    if (JSON.stringify(dadosFatura(f)) !== JSON.stringify(dadosFatura(next.valor))) return invalid()
    alteradas.push(next.valor)
    transicoes[id] = Object.freeze({ calendarioVersion: f.version, expectedVersion: f.conteudo.version, resultVersion: next.valor.conteudo.version, deltaCentavos: delta.valor })
  }
  const { uid: _, id: __, createdAt: ___, updatedAt: ____, ultimoEventoId: _____, ...depois } = c
  const comandoAtual: TransicaoCriacaoCompra = Object.freeze({ tipo: 'criarCompra', eventoId: meta.eventoId, cartaoVersion: contexto.cartao.version, expectedVersion: 0, resultVersion: 1, antes: null, depois: Object.freeze(depois), faturas: Object.freeze(transicoes) })
  const compra = Object.freeze({ ...c, comandoAtual })
  const evento = Object.freeze({ id: meta.eventoId, uid: contexto.uid, schemaVersion: 1 as const, contractVersion: 1 as const, tipo: 'criarCompra' as const, operationKey: meta.eventoId.split('__')[1], compraId: c.id, comando: comandoAtual, createdAt: meta.instante })
  if (new TextEncoder().encode(JSON.stringify(comandoAtual)).length > 16384 || new TextEncoder().encode(JSON.stringify(compra)).length > 32768 || new TextEncoder().encode(JSON.stringify(evento)).length > 32768 || new TextEncoder().encode(JSON.stringify({ compra, faturas: alteradas, evento })).length > 1048576) return falha('limiteOperacional', 'A proposta excede o limite de conteúdo do comando ou da compra.')
  const validada = validarCompraFinanceira(compra)
  if (!validada.ok) return validada
  return sucesso(Object.freeze({ compra: validada.valor, faturas: Object.freeze(alteradas), evento, orcamento: Object.freeze({ status: 'candidatoLocal', producaoHabilitada: false, acessos, acessosPorEscrita: Object.freeze(acessosPorEscrita), leiturasTransacionais, mutacoes: acessosPorEscrita.length }) }))
}
