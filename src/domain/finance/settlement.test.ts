import { expect, it } from 'vitest'
import { avaliarAjuste, avaliarLiquidacao, derivarLiquidacao, preverEdicaoSerie, validarSnapshot } from './settlement'
import { credito, fatura, pagamento, ref, snapshot } from './fixtures.testSupport'
import { congelar, ler } from './testing.testSupport'

it('deriva dívida, parcial, quitação e atraso sem editar ciclo da fatura', () => {
  const input = congelar(snapshot({ fatos: [pagamento()] }))
  expect(ler(derivarLiquidacao(input, '2026-11-18'))).toMatchObject({ exigivelCentavos: 10000, liquidadoLiquidoCentavos: 4000, pendenteCentavos: 6000, estadoLiquidacao: 'parcial', atrasada: true })
  expect(ler(derivarLiquidacao(snapshot({ creditos: [credito({ valorCentavos: 10000 })] }), '2026-11-18'))).toMatchObject({ pendenteCentavos: 0, estadoLiquidacao: 'liquidada', atrasada: false })
  expect(ler(derivarLiquidacao(snapshot({ estadoObrigacao: 'cancelada' }), '2026-11-18')).estadoLiquidacao).toBe('semExigibilidade')
  expect(ler(derivarLiquidacao(fatura({ fatos: [pagamento({ alvo: { tipo: 'fatura', id: 'f1' } })] }), '2026-11-18')).pendenteCentavos).toBe(6000)
  expect(fatura().calendario?.ciclo).toBe('fechada')
})
it('reversões não apagam fatos, compartilham limite e não podem inverter inversão', () => {
  const input = snapshot({ fatos: [pagamento()] })
  const proposal = ler(avaliarAjuste(input, { tipo: 'reversaoPagamento', id: 'r1', originalId: 'p1', valorCentavos: 4000, dataEfetiva: '2026-11-18', motivo: 'Correção', operacaoId: 'op3', expectedVersion: 3 }))
  expect(ler(derivarLiquidacao(proposal.snapshots[0], '2026-11-18')).pendenteCentavos).toBe(10000)
  expect(input.fatos).toHaveLength(1)
  expect(proposal.snapshots[0].fatos).toHaveLength(2)
  expect(avaliarAjuste(proposal.snapshots[0], { tipo: 'reversaoPagamento', id: 'r2', originalId: 'p1', valorCentavos: 1, dataEfetiva: '2026-11-18', motivo: 'Correção', operacaoId: 'op4', expectedVersion: 4 }).ok).toBe(false)
  expect(avaliarAjuste(proposal.snapshots[0], { tipo: 'reversaoPagamento', id: 'r2', originalId: 'r1', valorCentavos: 1, dataEfetiva: '2026-11-18', motivo: 'Correção', operacaoId: 'op4', expectedVersion: 4 }).ok).toBe(false)
})
it('recebimento parcial é fato separado e excesso é rejeitado', () => {
  const target = snapshot({ alvo: { tipo: 'receita', id: 'rec1' }, valorOriginalCentavos: 100000 })
  const proposal = ler(avaliarLiquidacao(target, { tipo: 'recebimento', id: 're1', valorCentavos: 60000, dataEfetiva: '2026-11-17', contaId: 'conta', operacaoId: 'op', expectedVersion: 3 }))
  expect(ler(derivarLiquidacao(proposal.snapshot, '2026-11-18')).pendenteCentavos).toBe(40000)
  expect(avaliarLiquidacao(target, { tipo: 'recebimento', id: 're1', valorCentavos: 100001, dataEfetiva: '2026-11-17', contaId: 'conta', operacaoId: 'op', expectedVersion: 3 }).ok).toBe(false)
  expect(avaliarLiquidacao(target, { tipo: 'pagamento', id: 're1', valorCentavos: 1, dataEfetiva: '2026-11-17', contaId: 'conta', operacaoId: 'op', expectedVersion: 3 }).ok).toBe(false)
})
it('não aceita snapshot incompleto, revisão divergente, referência cruzada ou schema desconhecido', () => {
  for (const invalid of [snapshot({ completo: false }), snapshot({ revisao: { antes: 2, depois: 3 } }), snapshot({ schemaVersion: 2 }), snapshot({ fatos: [pagamento({ uid: 'B' })] }), snapshot({ fatos: [pagamento(), pagamento()] })]) expect(validarSnapshot(invalid).ok).toBe(false)
  const bill = fatura()
  expect(validarSnapshot(fatura({ itens: [{ ...bill.itens![0], vencimento: '2026-11-20' }] })).ok).toBe(false)
  expect(validarSnapshot(snapshot({ valorOriginalCentavos: Number.MAX_SAFE_INTEGER, creditos: [credito({ valorCentavos: Number.MAX_SAFE_INTEGER }), credito({ id: 'cr2', valorCentavos: 1 })] })).ok).toBe(false)
})

it('não converte listas ou objetos para discriminantes e estados', () => {
  expect(validarSnapshot({ ...snapshot(), estadoObrigacao: ['ativa'] }).ok).toBe(false)
  expect(validarSnapshot({ ...snapshot(), fatos: [{ ...pagamento(), tipo: ['pagamento'] }] }).ok).toBe(false)
  expect(validarSnapshot({ ...snapshot(), alvo: { tipo: ['obrigacaoExternaAvulsa'], id: 'ob1' } }).ok).toBe(false)
})
it('parcela de cartão é liquidada via fatura sem rateio ou pagamento direto', () => {
  const bill = fatura({ fatos: [pagamento({ alvo: { tipo: 'fatura', id: 'f1' } })] })
  const item = snapshot({ alvo: { tipo: 'parcelaCartao', id: 'par1' }, origemId: 'compra1', fatura: bill })
  expect(ler(derivarLiquidacao(item, '2026-11-18')).viaFatura).toBe('f1')
  expect(avaliarLiquidacao(item, { tipo: 'pagamento', id: 'p2', valorCentavos: 100, dataEfetiva: '2026-11-18', contaId: 'conta', operacaoId: 'op', expectedVersion: 3 }).ok).toBe(false)
})
it('reembolso e estorno são avaliados juntos sem saldo credor nem dupla entrada', () => {
  const input = snapshot({ fatos: [pagamento({ valorCentavos: 10000 })] })
  const proposal = ler(avaliarAjuste(input, {
    tipo: 'estornoConsumo', id: 'est1', origemId: 'ob1', origemTipo: 'obrigacaoExterna', valorCentavos: 10000, dataEfeito: '2026-11-18', motivo: 'Devolução', operacaoId: 'op3',
    origem: { id: 'ob1', uid: 'A', tipo: 'obrigacaoExterna', origemDados: 'nova', valorTotalCentavos: 10000, dataConsumo: '2026-10-17', categoriaId: 'cat' },
    creditos: [{ id: 'cr2', alvo: ref, valorCentavos: 10000, expectedVersion: 3 }],
    reembolsos: [{ id: 'rb1', alvo: ref, originalId: 'p1', valorCentavos: 10000, dataEfetiva: '2026-11-18', expectedVersion: 3 }],
  }))
  expect(proposal.estornos).toHaveLength(1)
  expect(proposal.snapshots[0].fatos.filter(f => f.tipo === 'reembolso')).toHaveLength(1)
  expect(ler(derivarLiquidacao(proposal.snapshots[0], '2026-11-18'))).toMatchObject({ exigivelCentavos: 0, liquidadoLiquidoCentavos: 0, pendenteCentavos: 0 })
  expect(input.fatos).toHaveLength(1)
})
it('crédito, cancelamento e prévia respeitam origem, versão e liquidações', () => {
  expect(ler(avaliarAjuste(snapshot(), { tipo: 'creditoObrigacao', id: 'cr2', origemId: 'ob1', valorCentavos: 1000, dataEfeito: '2026-11-18', motivo: 'Crédito', operacaoId: 'op', expectedVersion: 3 })).snapshots[0].creditos).toHaveLength(1)
  expect(avaliarLiquidacao(snapshot(), { tipo: 'pagamento', id: 'p2', valorCentavos: 1, dataEfetiva: '2026-11-18', contaId: 'conta', operacaoId: 'op', expectedVersion: 2 }).ok).toBe(false)
  expect(preverEdicaoSerie([snapshot({ fatos: [pagamento()] })], 'estaOcorrencia', { tipo: 'cancelar', origemId: 'ob1', alvoId: 'ob1', expectedVersions: [{ id: 'ob1', version: 3 }] }).ok).toBe(false)
  expect(ler(preverEdicaoSerie([snapshot()], 'estaOcorrencia', { tipo: 'alterarValor', origemId: 'ob1', alvoId: 'ob1', valorCentavos: 11000, expectedVersions: [{ id: 'ob1', version: 3 }] })).alvos).toHaveLength(1)
  expect(preverEdicaoSerie([fatura()], 'estaOcorrencia', { tipo: 'alterarValor', origemId: 'compra1', alvoId: 'f1', valorCentavos: 20000, expectedVersions: [{ id: 'f1', version: 3 }] }).ok).toBe(false)
})

it('estorno de compra credita a parcela correta sem descontar consumo duas vezes', () => {
  const bill = fatura()
  const command = { tipo: 'estornoConsumo', id: 'est1', origemId: 'compra1', origemTipo: 'compra', valorCentavos: 1000, dataEfeito: '2026-11-18', motivo: 'Devolução parcial', operacaoId: 'op3', origem: { id: 'compra1', uid: 'A', tipo: 'compra', origemDados: 'nova', valorTotalCentavos: 10000, dataConsumo: '2026-10-17', categoriaId: 'cat' }, creditos: [{ id: 'cr1', alvo: { tipo: 'parcelaCartao', id: 'par1' }, valorCentavos: 1000, expectedVersion: 3 }], reembolsos: [] }
  const proposal = ler(avaliarAjuste(bill, command))
  expect(proposal.estornos).toHaveLength(1)
  expect(proposal.snapshots[0].creditos[0].estornoId).toBe('est1')
  expect(ler(derivarLiquidacao(proposal.snapshots[0], '2026-11-18')).exigivelCentavos).toBe(9000)
  expect(avaliarAjuste(bill, { ...command, creditos: [{ ...command.creditos[0], alvo: { tipo: 'fatura', id: 'f1' } }] }).ok).toBe(false)
})

it('prévia de futuras preserva parcelas com liquidação e explicita as não alteradas', () => {
  const rows = [0, 1, 2].map(i => snapshot({ alvo: { tipo: 'parcelaExterna', id: `par${i}` }, origemId: 'serie', vencimento: ['2026-11-17', '2026-12-17', '2027-01-17'][i], fatos: i === 1 ? [pagamento({ alvo: { tipo: 'parcelaExterna', id: 'par1' } })] : [] }))
  const proposal = ler(preverEdicaoSerie(rows, 'estaEFuturasNaoLiquidadas', { tipo: 'alterarValor', origemId: 'serie', alvoId: 'par0', valorCentavos: 11000, expectedVersions: rows.map(r => ({ id: r.alvo.id, version: r.version })) }))
  expect(proposal.alvos.map(a => a.id)).toEqual(['par0', 'par2'])
  expect(proposal.preservados).toEqual([{ id: 'par1', motivo: 'liquidacaoPreservada' }])
})
it('cancelamento de origem exige manifesto completo de ordinais e não aceita subconjunto', () => {
  const row = snapshot({ alvo: { tipo: 'parcelaExterna', id: 'par1' }, origemId: 'serie' })
  const command = { tipo: 'cancelarOrigem', origemId: 'serie', alvoId: 'par1', expectedVersions: [{ id: 'par1', version: 3 }] }
  expect(preverEdicaoSerie([row], 'estaOcorrencia', command).ok).toBe(false)
  expect(preverEdicaoSerie([row], 'estaOcorrencia', { ...command, origemSerie: { quantidadeOriginal: 3, numeroInicial: 1, parcelas: [{ numero: 1, alvoId: 'par1' }] } }).ok).toBe(false)
  expect(preverEdicaoSerie([row], 'estaOcorrencia', { ...command, origemSerie: { quantidadeOriginal: 1, numeroInicial: 1, parcelas: [{ numero: 1, alvoId: 'par1' }] } }).ok).toBe(true)
})
