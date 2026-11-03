import { expect, it } from 'vitest'
import { prepararCriacaoCompraFinanceira, validarCompraFinanceira } from './comprasFinanceiras'
import { calendarioBaseFatura } from './invoiceCalendar'
import { inicializarControleFatura } from './liquidacoesFaturas'
import type { Cartao } from './contracts/cartoes'
import type { FaturaFinanceira } from './faturaFinanceira'
import { ler } from './testing.testSupport'

const cartao: Cartao = { uid: 'A', id: 'card', banco: 'Banco', nome: 'Cartão', titularId: 'holder', diaFechamento: 10, diaVencimento: 17, estado: 'ativo', schemaVersion: 1, version: 1, ultimoEventoId: 'criarCartao__one', createdAt: 1, updatedAt: 1 }
function fatura(mes: string): FaturaFinanceira {
  return { ...ler(calendarioBaseFatura(mes, 10, 17)), uid: 'A', id: `card__${mes}`, cartaoId: 'card', schemaVersion: 1, versaoConteudo: 4, version: 1, ultimoEventoId: 'confirmarFatura__calendar', createdAt: 1, updatedAt: 1, conteudo: ler(inicializarControleFatura({ uid: 'A', faturaId: `card__${mes}`, cartaoId: 'card', competencia: mes, exigivelCentavos: 50000, eventoId: 'criarCompra__prior', origemId: 'prior', instante: 1 })) }
}
const dados = { cartaoId: 'card', descricao: 'Compra100', dataCompra: '2026-11-01', categoriaId: 'cat', etiquetaIds: [], valorTotalCentavos: 10000, quantidadeParcelas: 3 }
const ctx = () => ({ uid: 'A', hoje: '2026-11-01', cartao, faturas: ['2026-11', '2026-12', '2027-01', '2027-02'].map(fatura), primeiroUsoCategoria: false })
const meta = { id: 'buy', eventoId: 'criarCompra__intent', origemId: 'buy', instante: 1000 }
it('prepara100/3 em três faturas existentes, com deltas exatos e comando finito recíproco', () => {
  const context = ctx(), antes = JSON.stringify(context)
  const p = ler(prepararCriacaoCompraFinanceira(dados, context, meta))
  expect(p.faturas.map(f => f.conteudo.exigivelCentavos)).toEqual([53334, 53333, 53333])
  expect(p.faturas.every(f => f.version === 1 && f.updatedAt === 1 && f.conteudo.version === 2)).toBe(true)
  expect(p.compra.comandoAtual).toMatchObject({ eventoId: meta.eventoId, expectedVersion: 0, resultVersion: 1, antes: null })
  expect(p.compra.comandoAtual.faturas['card__2026-11']).toEqual({ calendarioVersion: 1, expectedVersion: 1, resultVersion: 2, deltaCentavos: 3334 })
  expect('comandoAtual' in p.compra.comandoAtual.depois).toBe(false)
  expect(p.orcamento).toMatchObject({ acessos: 16, mutacoes: 5, status: 'candidatoLocal', producaoHabilitada: false })
  expect(JSON.stringify(context)).toBe(antes)
  expect('fato' in p).toBe(false)
})
it('rejeita integralmente quatro destinos, fatura ausente/legada, histórico e referência alheia', () => {
  expect(prepararCriacaoCompraFinanceira({ ...dados, quantidadeParcelas: 4 }, ctx(), meta).ok).toBe(false)
  expect(prepararCriacaoCompraFinanceira(dados, { ...ctx(), faturas: ctx().faturas.slice(0, 2) }, meta).ok).toBe(false)
  for (const patch of [{ uid: 'B' }, { versaoConteudo: 1 }, { conteudo: undefined }, { conteudo: { ...fatura('2026-11').conteudo, possuiHistoricoPagamento: true } }]) {
    const faturas = ctx().faturas.map((f, i) => i === 0 ? { ...f, ...patch } : f)
    expect(prepararCriacaoCompraFinanceira(dados, { ...ctx(), faturas }, meta).ok).toBe(false)
  }
})
it('inclui primeiro uso e etiquetas na contagem, sem descontar cache', () => {
  expect(prepararCriacaoCompraFinanceira(dados, { ...ctx(), primeiroUsoCategoria: true }, meta).ok).toBe(false)
  const one = ler(prepararCriacaoCompraFinanceira({ ...dados, quantidadeParcelas: 1, etiquetaIds: ['a', 'b', 'c', 'd', 'e'] }, { ...ctx(), primeiroUsoCategoria: true }, meta))
  expect(one.orcamento).toMatchObject({ acessos: 18, mutacoes: 4 })
})
it('reciprocidade local rejeita comando anterior, delta ou versões divergentes e snapshot recursivo', () => {
  const c = ler(prepararCriacaoCompraFinanceira(dados, ctx(), meta)).compra, comando = c.comandoAtual
  expect(validarCompraFinanceira(c).ok).toBe(true)
  for (const patch of [{ eventoId: 'criarCompra__old' }, { expectedVersion: 1 }, { depois: { ...comando.depois, descricao: 'Outra' } }, { depois: { ...comando.depois, comandoAtual: comando } }, { faturas: {} }, { faturas: { ...comando.faturas, 'card__2026-11': { ...comando.faturas['card__2026-11'], deltaCentavos: 3333 } } }, { faturas: { ...comando.faturas, 'card__2026-11': { ...comando.faturas['card__2026-11'], resultVersion: 99 } } }]) expect(validarCompraFinanceira({ ...c, comandoAtual: { ...comando, ...patch } }).ok).toBe(false)
})
