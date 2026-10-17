import type { CreditoObrigacao, DadosPeriodo, FatoLiquidacao, SnapshotAlvo } from './contracts/commands'
export const ref = { tipo: 'obrigacaoExternaAvulsa', id: 'ob1' } as const
export function snapshot(patch: Partial<SnapshotAlvo> = {}): SnapshotAlvo {
  return { uid: 'A', schemaVersion: 1, version: 3, alvo: ref, completo: true, revisao: { antes: 3, depois: 3 }, estadoObrigacao: 'ativa', vencimento: '2026-11-17', valorOriginalCentavos: 10000, origemId: 'ob1', dataConsumo: '2026-10-17', estimado: false, contas: [{ id: 'conta', uid: 'A', estadoCadastro: 'ativo' }], fatos: [], creditos: [], ...patch }
}
export function pagamento(patch: Partial<FatoLiquidacao> = {}): FatoLiquidacao {
  return { id: 'p1', uid: 'A', schemaVersion: 1, version: 1, tipo: 'pagamento', alvo: ref, valorCentavos: 4000, dataEfetiva: '2026-11-17', contaId: 'conta', operacaoId: 'op1', ...patch } as FatoLiquidacao
}
export function credito(patch: Partial<CreditoObrigacao> = {}): CreditoObrigacao {
  return { id: 'cr1', uid: 'A', schemaVersion: 1, version: 1, tipo: 'creditoObrigacao', alvo: ref, origemId: 'ob1', valorCentavos: 1000, dataEfeito: '2026-11-17', motivo: 'Crédito informado', operacaoId: 'op2', ...patch }
}
export function fatura(patch: Partial<SnapshotAlvo> = {}): SnapshotAlvo {
  return snapshot({ alvo: { tipo: 'fatura', id: 'f1' }, valorOriginalCentavos: undefined,
    calendario: { cartaoId: 'card', competencia: '2026-11', fechamento: '2026-11-10', vencimento: '2026-11-17', ciclo: 'fechada' },
    itens: [{ id: 'par1', uid: 'A', origemId: 'compra1', cartaoId: 'card', faturaId: 'f1', valorCentavos: 10000, competenciaPlanejamento: '2026-11', vencimento: '2026-11-17', estadoObrigacao: 'ativa' }], ...patch })
}
export function dadosPeriodo(patch: Partial<DadosPeriodo> = {}): DadosPeriodo {
  return { uid: 'A', completo: true, revisao: { antes: 1, depois: 1 }, origens: [], compromissos: [], receitas: [], fatos: [], estornos: [], creditos: [], ...patch }
}
