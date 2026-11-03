import { expect, it } from 'vitest'
import { Timestamp } from 'firebase/firestore'
import { decodeFaturaFinanceira } from './liquidacoesFaturasMapper'
import { calendarioBaseFatura } from '../../domain/finance/invoiceCalendar'
import { inicializarControleFatura, planejarPagamentoFatura } from '../../domain/finance/liquidacoesFaturas'
import { aplicarControleFinanceiroFatura } from '../../domain/finance/faturaFinanceira'
import { ler } from '../../domain/finance/testing.testSupport'

const calendario = ler(calendarioBaseFatura('2026-11', 10, 17))
const persisted = () => ({ ...calendario, cartaoId: 'card', schemaVersion: 1, versaoConteudo: 4, version: 1, ultimoEventoId: 'confirmarFatura__calendar', createdAt: Timestamp.fromMillis(1000), updatedAt: Timestamp.fromMillis(1000), conteudo: { schemaVersion: 2, version: 1, exigivelCentavos: 10000, liquidadoLiquidoCentavos: 0, possuiHistoricoPagamento: false, revisaoEstado: 'normal', ultimoEventoTipo: 'criarCompra', ultimoEventoId: 'criarCompra__intent', ultimoEventoOrigemId: 'buy', createdAt: Timestamp.fromMillis(1000), updatedAt: Timestamp.fromMillis(1000) } })
it('decodifica revisões independentes sem perder controle ou calendário', () => {
  const f = decodeFaturaFinanceira('A', 'card__2026-11', persisted())
  const ctx = { uid: 'A', hoje: '2026-11-18', instante: 2000, calendario, conta: { id: 'account', uid: 'A', estadoCadastro: 'ativo' as const } }
  const next = ler(planejarPagamentoFatura(f.conteudo, { operationKey: 'pay', expectedVersion: 1, valorCentavos: 4000, contaId: 'account', dataEfetiva: ctx.hoje }, ctx))
  const updated = ler(aplicarControleFinanceiroFatura(f, next.controle))
  expect(updated).toMatchObject({ version: 1, ultimoEventoId: 'confirmarFatura__calendar', updatedAt: 1000, conteudo: { version: 2, updatedAt: 2000, liquidadoLiquidoCentavos: 4000 } })
  expect(f.conteudo.liquidadoLiquidoCentavos).toBe(0)
  expect(aplicarControleFinanceiroFatura(updated, next.controle).ok).toBe(false)
  expect(aplicarControleFinanceiroFatura(updated, { ...next.controle, version: 3, possuiHistoricoPagamento: false, liquidadoLiquidoCentavos: 0 }).ok).toBe(false)
})
it('legado, ausência e metadados financeiros inválidos não viram controle zero', () => {
  const f = persisted()
  for (const patch of [{ versaoConteudo: 1 }, { conteudo: undefined }, { conteudo: { ...f.conteudo, updatedAt: 1000 } }, { conteudo: { ...f.conteudo, uid: 'B' } }, { conteudo: { ...f.conteudo, pendenteCentavos: 10000 } }]) expect(() => decodeFaturaFinanceira('A', 'card__2026-11', { ...f, ...patch })).toThrow()
  expect(() => decodeFaturaFinanceira('A', 'other__2026-11', f)).toThrow()
  expect(inicializarControleFatura({ ...f.conteudo }).ok).toBe(false)
})
it('preserva o instante submilissegundo do calendário e do controle servidor', () => {
  const raw = persisted(), stamp = new Timestamp(1, 123456000)
  const f = decodeFaturaFinanceira('A', 'card__2026-11', { ...raw, createdAt: stamp, updatedAt: stamp, conteudo: { ...raw.conteudo, createdAt: stamp, updatedAt: stamp } })
  expect(f.createdAt).toBe(stamp.toMillis())
  expect(f.conteudo.createdAt).toBe(stamp.toMillis())
})
