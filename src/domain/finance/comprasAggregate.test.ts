import { expect, it } from 'vitest'
import { criarCompraFinita, resolverParcelasCompra, validarCompraFinita } from './comprasAggregate'
import type { Cartao } from './contracts/cartoes'
import { ler } from './testing.testSupport'

const cartao: Cartao = { uid: 'A', id: 'card', banco: 'Banco', nome: 'Cartão', titularId: 'holder', diaFechamento: 10, diaVencimento: 17, estado: 'ativo', schemaVersion: 1, version: 1, ultimoEventoId: 'criarCartao__one', createdAt: 1, updatedAt: 1 }
const contexto = { uid: 'A', cartao, hoje: '2026-12-01', faturas: [], controles: [] }
const dados = { cartaoId: 'card', descricao: 'Compra', dataCompra: '2026-12-01', categoriaId: 'cat', etiquetaIds: [], valorTotalCentavos: 10000, quantidadeParcelas: 3 }
const compra = () => ler(criarCompraFinita(dados, contexto, { id: 'buy', eventoId: 'criarCompra__intent', instante: 1 }))
it('produz mapa finito completo, índice exato e somente identidades lógicas', () => {
  const c = compra()
  expect(c.schemaVersion).toBe(2)
  expect(Object.keys(c.parcelas)).toEqual(['p01', 'p02', 'p03'])
  expect(c.competenciasFaturas).toEqual(['2026-12', '2027-01', '2027-02'])
  expect(ler(resolverParcelasCompra(c)).map(p => p.id)).toEqual(['buy__r1__n1', 'buy__r1__n2', 'buy__r1__n3'])
  expect('historico' in c).toBe(false)
  expect('pagamentos' in c).toBe(false)
  expect(c.parcelas.p01.capacidade).toMatchObject({ valorOriginalCentavos: 3334, correcaoAcrescimosCentavos: 0, devolvidoCentavos: 0, categoriaEfetivaId: 'cat' })
  expect(validarCompraFinita({ ...c, parcelas: { ...c.parcelas, p01: { ...c.parcelas.p01, capacidade: undefined } } }).ok).toBe(false)
})
it('rejeita perda, excesso, soma ou competência incorreta e cópia de vencimento', () => {
  const c = compra()
  const { p03: removida, ...incompleto } = c.parcelas
  expect(removida.numero).toBe(3)
  for (const parcelas of [incompleto, { ...c.parcelas, p04: c.parcelas.p03 }, { ...c.parcelas, p01: { ...c.parcelas.p01, valorCentavos: 3333 } }, { ...c.parcelas, p01: { ...c.parcelas.p01, faturaId: 'card__2027-01' } }, { ...c.parcelas, p01: { ...c.parcelas.p01, vencimento: '2026-12-17' } }]) expect(validarCompraFinita({ ...c, parcelas }).ok).toBe(false)
  expect(validarCompraFinita({ ...c, competenciasFaturas: ['2026-12'] }).ok).toBe(false)
})
it('cancelamento conserva valores e não produz parcelas exigíveis', () => {
  const c = { ...compra(), version: 2, estadoObrigacao: 'cancelada', ultimoEventoId: 'cancelarCompra__cancel', updatedAt: 2, canceledAt: 2, cancelamentoMotivo: 'Compra cancelada' }
  expect(validarCompraFinita(c).ok).toBe(true)
  expect(ler(resolverParcelasCompra(c))).toEqual([])
  expect(c.valorTotalCentavos).toBe(10000)
  expect(validarCompraFinita({ ...c, cancelamentoMotivo: ' ' }).ok).toBe(false)
})
it('falha fechado em formato legado/desconhecido, estado e metadados adulterados', () => {
  const c = compra()
  for (const patch of [{ schemaVersion: 1 }, { schemaVersion: 3 }, { estadoObrigacao: 'paga' }, { version: 0 }, { cronogramaRevision: 0 }, { cronogramaRevision: 2 }, { ultimoEventoId: 'pagarFatura__fake' }, { updatedAt: 0 }, { canceledAt: 1 }, { saldoCentavos: 100 }, { descricao: ' Compra ' }, { uid: '' }]) expect(validarCompraFinita({ ...c, ...patch }).ok).toBe(false)
})
it('revisão altera identidades e nunca faz parcela antiga voltar a ser vigente', () => {
  const a = compra(), b = { ...a, version: 3, cronogramaRevision: 3, ultimoEventoId: 'editarCompra__third', updatedAt: 3 }
  const antigos = ler(resolverParcelasCompra(a)), atuais = ler(resolverParcelasCompra(b))
  expect(atuais.every(p => !antigos.some(old => old.id === p.id))).toBe(true)
  expect(atuais.map(p => p.valorCentavos)).toEqual([3334, 3333, 3333])
})
it('construtor valida identidade, evento de criação e instante técnico', () => {
  for (const meta of [{ id: 'bad/id', eventoId: 'criarCompra__i', instante: 1 }, { id: 'buy', eventoId: 'editarCompra__i', instante: 1 }, { id: 'buy', eventoId: 'criarCompra__i', instante: NaN }]) expect(criarCompraFinita(dados, contexto, meta).ok).toBe(false)
})
