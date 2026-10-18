import { expect, it } from 'vitest'
import { avaliarOrcamento, perfilFinanceiroRemoto } from './operationBudget'
import { ler } from './testing.testSupport'

const perfil = { status: 'simulacao', contractVersion: 1 } as const
const custo = { parcelas: 12, ocorrencias: 12, mutacoes: 3, bytesRequisicao: 1048576, bytesDocumentos: [32768, 32768, 32768], acessosPorOperacao: [8, 8, 2], expressoes: 1000, incluiMetadados: true }
it('aceita fronteiras somente como simulação local, nunca como autorização remota', () => {
  expect(ler(avaliarOrcamento(custo, perfil)).finalidade).toBe('testeDeContrato')
  expect(avaliarOrcamento(custo).ok).toBe(false)
  expect(avaliarOrcamento(custo, perfilFinanceiroRemoto('criarCompra')).ok).toBe(false)
  expect(perfilFinanceiroRemoto('registrarLiquidacao').status).toBe('naoHabilitado')
})
it('rejeita todo limite excedido e não assume cache para26 escritas', () => {
  for (const patch of [{ parcelas: 13 }, { ocorrencias: 13 }, { mutacoes: 33 }, { bytesRequisicao: 1048577 }, { bytesDocumentos: [32769, 1, 1] }, { acessosPorOperacao: [8, 8, 3] }, { acessosPorOperacao: [9, 1, 1] }, { expressoes: 1001 }, { incluiMetadados: false }, { mutacoes: -1 }, { expressoes: 1.5 }]) expect(avaliarOrcamento({ ...custo, ...patch }, perfil).ok).toBe(false)
  expect(avaliarOrcamento({ ...custo, mutacoes: 26, bytesDocumentos: Array(26).fill(100), acessosPorOperacao: Array(26).fill(1) }, perfil).ok).toBe(false)
  expect(avaliarOrcamento({ ...custo, mutacoes: 32, bytesDocumentos: Array(32).fill(100), acessosPorOperacao: Array(32).fill(0) }, perfil).ok).toBe(true)
})

it('registra a validação remota da criação simples e mantém outros ramos fechados',()=>{
 for(const tipo of ['criarReceita','criarDespesa'])expect(perfilFinanceiroRemoto(tipo)).toMatchObject({status:'validadoNoProjeto',contractVersion:1,acessosPorEscrita:[5,6,2],leiturasTransacionais:1,acessosMaximos:14,mutacoesMaximas:3,substituicao:false})
 for(const tipo of ['gastoImediato','pagar','receber','editarOrigem','cancelarOrigem','reverterPagamento','criarCompra'])expect(perfilFinanceiroRemoto(tipo).status).toBe('naoHabilitado')
 expect(avaliarOrcamento(custo,perfilFinanceiroRemoto('criarDespesa')).ok).toBe(false)
})
