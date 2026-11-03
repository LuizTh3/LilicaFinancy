import { criarSerieParcelada } from './parcelados'
import { ler } from './testing.testSupport'
export const entradaParceladaTeste = { tipo: 'emprestimo', origemDados: 'migrada', numeroInicial: 5, quantidadeOriginal: 10, descricao: 'Empréstimo manual', modo: 'mensal', diaAncora: 31, primeiroVencimento: '2026-10-31', primeiraCompetencia: '2026-10', referencias: { categoriaId: 'cat', titularId: 'holder', contaPrevistaId: 'account', etiquetaIds: ['b', 'a'] }, calculo: { tipo: 'porParcela', valorCentavos: 20000 } }
export const serieParceladaTeste = () => ler(criarSerieParcelada(entradaParceladaTeste, { uid: 'A', id: 'serie', operationKey: 'intent', instante: 1000 }))
