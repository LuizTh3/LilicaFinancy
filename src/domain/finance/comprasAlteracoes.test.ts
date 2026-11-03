import { expect, it } from 'vitest'
import { prepararAlteracaoCompra } from './comprasAlteracoes'
import { previaCompraFinanceiraTeste, cartaoCompraFinanceiraTeste, dadosCompraFinanceiraTeste } from './comprasFinanceiras.testSupport'
import { ler } from './testing.testSupport'

const contexto = () => ({ uid: 'A', hoje: '2026-11-02', instante: 3000, cartao: cartaoCompraFinanceiraTeste, faturas: previaCompraFinanceiraTeste().faturas })
const base = () => { const { comandoAtual: _, ...c } = previaCompraFinanceiraTeste().compra; return c }
it('cancela integralmente e preserva cronograma original para histórico', () => {
  const c = base(), ctx = contexto()
  const r = ler(prepararAlteracaoCompra(c, { tipo: 'cancelarCompra', operationKey: 'cancel', expectedVersion: 1, motivo: 'Compra cancelada' }, ctx))
  expect(r.compra).toMatchObject({ estadoObrigacao: 'cancelada', version: 2, cronogramaRevision: 1, canceledAt: 3000 })
  expect(r.compra.parcelas).toEqual(c.parcelas)
  expect(r.faturas.map(f => f.conteudo.exigivelCentavos)).toEqual([0, 0, 0])
  expect(ctx.faturas[0].conteudo.exigivelCentavos).toBe(3334)
})
it('edita cronograma inteiro com nova revisão e deltas líquidos por destino', () => {
  const r = ler(prepararAlteracaoCompra(base(), { tipo: 'editarCompra', operationKey: 'edit', expectedVersion: 1, dados: { ...dadosCompraFinanceiraTeste, valorTotalCentavos: 12000 } }, contexto()))
  expect(r.compra).toMatchObject({ version: 2, cronogramaRevision: 2, valorTotalCentavos: 12000 })
  expect(r.faturas.map(f => f.conteudo.exigivelCentavos)).toEqual([4000, 4000, 4000])
  expect(r.transicoes.map(t => t.deltaCentavos)).toEqual([666, 667, 667])
})
it('bloqueia qualquer destino pago/fechado, referências ausentes e intenção obsoleta', () => {
  const cmd = { tipo: 'cancelarCompra', operationKey: 'cancel', expectedVersion: 1, motivo: 'Cancelamento' }
  const ctx = contexto(), pago = ctx.faturas.map((f, i) => i ? f : { ...f, conteudo: { ...f.conteudo, possuiHistoricoPagamento: true } })
  expect(prepararAlteracaoCompra(base(), cmd, { ...ctx, faturas: pago }).ok).toBe(false)
  expect(prepararAlteracaoCompra(base(), cmd, { ...ctx, hoje: '2026-11-11' }).ok).toBe(false)
  expect(prepararAlteracaoCompra(base(), cmd, { ...ctx, faturas: ctx.faturas.slice(1) }).ok).toBe(false)
  expect(prepararAlteracaoCompra(base(), { ...cmd, expectedVersion: 2 }, ctx).ok).toBe(false)
  expect(prepararAlteracaoCompra(base(), { ...cmd, parcelas: [1] }, ctx).ok).toBe(false)
})
it('não cria revisão sem alteração nem permite apagar capacidades corrigidas', () => {
  const cmd = { tipo: 'editarCompra', operationKey: 'edit', expectedVersion: 1, dados: dadosCompraFinanceiraTeste }
  expect(prepararAlteracaoCompra(base(), cmd, contexto()).ok).toBe(false)
  const c = base(), p = c.parcelas.p01
  const corrigida = { ...c, version: 2, parcelas: { ...c.parcelas, p01: { ...p, capacidade: { ...p.capacidade, correcaoAcrescimosCentavos: 1 } } } }
  expect(prepararAlteracaoCompra(corrigida, { ...cmd, expectedVersion: 2, dados: { ...cmd.dados, descricao: 'Alterada' } }, contexto()).ok).toBe(false)
})
