import { expect, it } from 'vitest'
import type { Cartao } from './contracts/cartoes'
import type { Fatura } from './contracts/faturas'
import { prepararCompra, validarDadosCompra } from './compras'
import { construirFatura } from './faturas'
import { identidadeParcelaCompra } from './identity'
import { ler } from './testing.testSupport'

const cartao: Cartao = { uid: 'A', id: 'card', banco: 'Banco', nome: 'Cartão', titularId: 'holder', diaFechamento: 10, diaVencimento: 17, estado: 'ativo', schemaVersion: 1, version: 1, ultimoEventoId: 'criarCartao__one', createdAt: 1, updatedAt: 1 }
const dados = { cartaoId: 'card', descricao: ' Compra ', dataCompra: '2026-12-01', categoriaId: 'cat', etiquetaIds: ['z', 'a'], valorTotalCentavos: 10000, quantidadeParcelas: 3 }
const contexto = { uid: 'A', cartao, hoje: '2026-12-01', faturas: [], controles: [] }
function fatura(mes = '2026-12'): Fatura {
  return { ...ler(construirFatura(cartao, mes)), uid: 'A', id: `card__${mes}`, cartaoId: 'card', schemaVersion: 1, versaoConteudo: 1, version: 1, ultimoEventoId: 'confirmarFatura__one', createdAt: 1, updatedAt: 1 }
}
it('normaliza conteúdo e conjuntos sem aceitar campos financeiros derivados', () => {
  expect(validarDadosCompra(dados)).toMatchObject({ ok: true, valor: { descricao: 'Compra', etiquetaIds: ['a', 'z'] } })
  for (const invalido of [{ ...dados, pago: true }, { ...dados, numeroInicial: 5 }, { ...dados, parcelas: [] }, { ...dados, etiquetaIds: ['a', 'a'] }, { ...dados, etiquetaIds: ['a', 'b', 'c', 'd', 'e', 'f'] }, { ...dados, descricao: ' ' }, { ...dados, dataCompra: '2026-02-29' }, { ...dados, cartaoId: 'A/card' }]) expect(validarDadosCompra(invalido).ok).toBe(false)
})
it('distribui 100/3, atravessa o ano e resolve vencimento somente pelo calendário', () => {
  const previa = ler(prepararCompra(dados, contexto))
  expect(previa.parcelas.map(p => [p.numero, p.valorCentavos, p.competenciaFatura, p.faturaId])).toEqual([
    [1, 3334, '2026-12', 'card__2026-12'], [2, 3333, '2027-01', 'card__2027-01'], [3, 3333, '2027-02', 'card__2027-02'],
  ])
  expect(previa.faturas.map(f => f.vencimento)).toEqual(['2026-12-17', '2027-01-17', '2027-02-17'])
  expect(previa.parcelas.every(p => !('vencimento' in p) && !('pago' in p))).toBe(true)
  expect('pagamentos' in previa).toBe(false)
})
it('aceita uma parcela e o máximo monetário com soma exata', () => {
  const unica = ler(prepararCompra({ ...dados, quantidadeParcelas: 1 }, contexto))
  expect(unica.parcelas.map(p => p.valorCentavos)).toEqual([10000])
  const max = ler(prepararCompra({ ...dados, valorTotalCentavos: Number.MAX_SAFE_INTEGER, quantidadeParcelas: 12 }, contexto))
  expect(max.parcelas.reduce((sum, p) => sum + BigInt(p.valorCentavos), 0n)).toBe(BigInt(Number.MAX_SAFE_INTEGER))
  expect(max.parcelas[0].valorCentavos - max.parcelas[11].valorCentavos).toBeLessThanOrEqual(1)
})
it('rejeita zero, parcela subcentavo, quantidade fora do limite e fim do calendário', () => {
  for (const patch of [{ valorTotalCentavos: 0 }, { valorTotalCentavos: 2 }, { quantidadeParcelas: 13 }, { quantidadeParcelas: 0 }, { valorTotalCentavos: Number.MAX_SAFE_INTEGER + 1 }, { primeiraCompetenciaFatura: '9999-12' }]) expect(prepararCompra({ ...dados, ...patch }, contexto).ok).toBe(false)
})
it('escolha explícita altera a prévia e prevalece sobre sugestão', () => {
  const sugerida = ler(prepararCompra(dados, contexto))
  const explicita = ler(prepararCompra({ ...dados, primeiraCompetenciaFatura: '2027-03' }, contexto))
  expect(sugerida.primeiraFaturaEscolha).toBe('sugerida')
  expect(explicita.primeiraFaturaEscolha).toBe('explicita')
  expect(explicita.parcelas[0].faturaId).toBe('card__2027-03')
  expect(explicita.conteudoConferencia).not.toBe(sugerida.conteudoConferencia)
  expect(ler(prepararCompra({ ...dados, descricao: 'Outra' }, contexto)).conteudoConferencia).not.toBe(sugerida.conteudoConferencia)
})
it('não aceita retroativo fechado, inclusive sem pagamento, nem relógio inválido', () => {
  expect(prepararCompra(dados, { ...contexto, hoje: '2026-12-10' })).toMatchObject({ ok: false, erro: { codigo: 'referenciaInvalida' } })
  expect(prepararCompra(dados, { ...contexto, hoje: '2026-02-30' }).ok).toBe(false)
})
it('rejeita cartão arquivado, de outro UID e snapshots incompatíveis', () => {
  for (const card of [{ ...cartao, uid: 'B' }, { ...cartao, estado: 'arquivado' as const }]) expect(prepararCompra(dados, { ...contexto, cartao: card }).ok).toBe(false)
  expect(prepararCompra(dados, { ...contexto, faturas: [{ ...fatura(), uid: 'B' }] }).ok).toBe(false)
})
it('calendário existente exige controle conhecido sem histórico, que nunca é presumido zero', () => {
  const f = fatura(), controle = { uid: 'A', faturaId: f.id, version: 1, possuiHistoricoPagamento: false }
  expect(prepararCompra(dados, { ...contexto, faturas: [f] }).ok).toBe(false)
  expect(prepararCompra(dados, { ...contexto, faturas: [f], controles: [controle] }).ok).toBe(true)
  for (const patch of [{ possuiHistoricoPagamento: true }, { uid: 'B' }, { version: 0 }]) expect(prepararCompra(dados, { ...contexto, faturas: [f], controles: [{ ...controle, ...patch }] }).ok).toBe(false)
})
it('conferência inclui versões do contexto mesmo quando os valores não mudaram', () => {
  const f = fatura(), c = { uid: 'A', faturaId: f.id, version: 1, possuiHistoricoPagamento: false }
  const a = ler(prepararCompra(dados, { ...contexto, faturas: [f], controles: [c] }))
  const b = ler(prepararCompra(dados, { ...contexto, faturas: [{ ...f, version: 2 }], controles: [c] }))
  const d = ler(prepararCompra(dados, { ...contexto, faturas: [f], controles: [{ ...c, version: 2 }] }))
  expect(new Set([a.conteudoConferencia, b.conteudoConferencia, d.conteudoConferencia]).size).toBe(3)
})
it('mantém identidades diferentes nas revisões 3→2→3 e preserva o legado', () => {
  const ids = [1, 2, 3].flatMap(revisao => Array.from({ length: revisao === 2 ? 2 : 3 }, (_, i) => ler(identidadeParcelaCompra('buy', revisao, i + 1))))
  expect(new Set(ids).size).toBe(8)
  expect(ids[0]).toBe('buy__r1__n1')
  for (const args of [['bad/id', 1, 1], ['id', 0, 1], ['id', Number.MAX_SAFE_INTEGER + 1, 1], ['id', 1, 13]] as const) expect(identidadeParcelaCompra(args[0], args[1], args[2]).ok).toBe(false)
})
