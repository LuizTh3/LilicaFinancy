import { expect, it } from 'vitest'
import { prepararFaturaFinanceiraNova } from './faturaFinanceira'
import { calendarioBaseFatura } from './invoiceCalendar'
import type { Cartao } from './contracts/cartoes'
import { ler } from './testing.testSupport'

const cartao: Cartao = { uid: 'A', id: 'card', banco: 'Banco', nome: 'Cartão', titularId: 'holder', diaFechamento: 10, diaVencimento: 17, estado: 'ativo', schemaVersion: 1, version: 1, ultimoEventoId: 'criarCartao__one', createdAt: 1, updatedAt: 1 }
const comando = { contractVersion: 1, tipo: 'confirmarFatura', operationKey: 'calendar', alvoId: 'card__2026-11', expectedVersion: 0, payload: { ...ler(calendarioBaseFatura('2026-11', 10, 17)), cartaoId: 'card', cartaoVersion: 1 } }
it('nova confirmação explícita propõe calendário e controle vazio recíprocos, sem compra ou caixa', () => {
  const p = ler(prepararFaturaFinanceiraNova(comando, cartao, [], { uid: 'A', instante: 1000, ausenciaConfirmada: true }))
  expect(p.fatura).toMatchObject({ versaoConteudo: 4, version: 1, ultimoEventoId: 'confirmarFatura__calendar', conteudo: { schemaVersion: 2, version: 1, exigivelCentavos: 0, liquidadoLiquidoCentavos: 0, possuiHistoricoPagamento: false, ultimoEventoId: 'confirmarFatura__calendar' } })
  expect(p.recibo).toMatchObject({ tipo: 'confirmarFatura', alvoId: p.fatura.id, expectedVersion: 0, resultVersion: 1, createdAt: 1000 })
  expect('compra' in p).toBe(false)
  expect('fato' in p).toBe(false)
})
it('ausência não comprovada, proprietário alheio ou cartão arquivado não permitem inicializar', () => {
  const ctx = { uid: 'A', instante: 1000, ausenciaConfirmada: true }
  expect(prepararFaturaFinanceiraNova(comando, cartao, [], { ...ctx, ausenciaConfirmada: false }).ok).toBe(false)
  expect(prepararFaturaFinanceiraNova(comando, cartao, [], { ...ctx, uid: 'B' }).ok).toBe(false)
  expect(prepararFaturaFinanceiraNova(comando, { ...cartao, estado: 'arquivado' }, [], ctx).ok).toBe(false)
})
