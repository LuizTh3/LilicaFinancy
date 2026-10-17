import { expect, it } from 'vitest'
import { validarSnapshot, avaliarLiquidacao } from '../settlement'
import { projetarPeriodo } from '../projections'
import { montarCronograma } from '../installments'
import { dadosPeriodo, pagamento, snapshot } from '../fixtures.testSupport'
import { ler } from '../testing.testSupport'

it('homônimos não unem usuários e referências de outro escopo são rejeitadas', () => {
  const titulares = [{ id: 'titularA', uid: 'A', nome: 'Ana' }, { id: 'titularB', uid: 'B', nome: 'Ana' }]
  expect(titulares[0].id).not.toBe(titulares[1].id)
  expect(validarSnapshot(snapshot({ contas: [{ id: 'conta', uid: 'B', estadoCadastro: 'ativo' }] })).ok).toBe(false)
})
it('conta arquivada conserva fatos antigos mas bloqueia liquidação nova', () => {
  const current = snapshot({ contas: [{ id: 'conta', uid: 'A', estadoCadastro: 'arquivado' }], fatos: [pagamento()] })
  expect(validarSnapshot(current).ok).toBe(true)
  expect(avaliarLiquidacao(current, { tipo: 'pagamento', id: 'p2', valorCentavos: 100, dataEfetiva: '2026-11-18', contaId: 'conta', operacaoId: 'op2', expectedVersion: 3 }).ok).toBe(false)
})
it('classificação pertence à origem, migração mantém ausência de total/data', () => {
  const data = dadosPeriodo({ origens: [{ uid: 'A', id: 'compra', tipo: 'compra', origemDados: 'nova', valorTotalCentavos: 10000, dataConsumo: '2026-10-17', categoriaId: 'cat', etiquetaIds: ['projeto'] }] })
  expect(ler(projetarPeriodo('consumo', { inicio: '2026-10', fim: '2026-10' }, data)).itens[0].categoriaId).toBe('cat')
  const migrated = ler(montarCronograma({ origemDados: 'migrada', saldoMigradoCentavos: 60000, numeroInicial: 5, quantidadeOriginal: 10, primeiraCompetencia: '2026-11', primeiroVencimento: '2026-11-17', diaAncora: 17 }))
  expect(migrated).toHaveLength(6)
  expect(migrated[0].numero).toBe(5)
  expect(migrated[0]).not.toHaveProperty('valorTotalOriginal')
  expect(ler(projetarPeriodo('consumo', { inicio: '2026-10', fim: '2026-10' }, dadosPeriodo({ origens: [{ uid: 'A', id: 'm', tipo: 'compra', origemDados: 'migrada', saldoMigradoCentavos: 60000, categoriaId: 'cat' }] })))).not.toHaveProperty('totalDefinitivo')
})
