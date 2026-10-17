import { camposPermitidos, falha, registro, sucesso } from './errors'
import type { Resultado } from './errors'

export const LIMITES = Object.freeze({ parcelas: 12, ocorrencias: 12, mutacoes: 32, bytesRequisicao: 1048576, bytesDocumento: 32768, acessos: 18, acessosPorOperacao: 8, expressoes: 1000, pagina: 50 })
// No production adapter is authorized by this module. A simulation is data, not a capability.
export function perfilFinanceiroRemoto(_tipo: string) { return { status: 'naoHabilitado' } as const }
export function avaliarOrcamento(custo: unknown, perfil?: unknown): Resultado<{ finalidade: 'testeDeContrato'; mutacoes: number; acessos: number }> {
  const reject = () => falha('limiteOperacional', 'A operação não tem orçamento seguro comprovado ou excede seus limites. Nenhuma série foi criada.', { recuperacao: 'corrigir' })
  if (!registro(perfil) || !camposPermitidos(perfil, ['status', 'contractVersion']) || perfil.status !== 'simulacao' || perfil.contractVersion !== 1 || !registro(custo) || !camposPermitidos(custo, ['parcelas', 'ocorrencias', 'mutacoes', 'bytesRequisicao', 'bytesDocumentos', 'acessosPorOperacao', 'expressoes', 'incluiMetadados']) || custo.incluiMetadados !== true) return reject()
  const within = (value: unknown, max: number) => typeof value === 'number' && Number.isSafeInteger(value) && value >= 0 && value <= max
  if (!within(custo.parcelas, LIMITES.parcelas) || !within(custo.ocorrencias, LIMITES.ocorrencias) || !within(custo.mutacoes, LIMITES.mutacoes) || !within(custo.bytesRequisicao, LIMITES.bytesRequisicao) || !within(custo.expressoes, LIMITES.expressoes) || !Array.isArray(custo.bytesDocumentos) || custo.bytesDocumentos.length !== custo.mutacoes || !custo.bytesDocumentos.every(n => within(n, LIMITES.bytesDocumento)) || !Array.isArray(custo.acessosPorOperacao) || custo.acessosPorOperacao.length < (custo.mutacoes as number) || !custo.acessosPorOperacao.every(n => within(n, LIMITES.acessosPorOperacao))) return reject()
  const bytes = (custo.bytesDocumentos as number[]).reduce((sum, n) => sum + n, 0)
  const accesses = (custo.acessosPorOperacao as number[]).reduce((sum, n) => sum + n, 0)
  if (!within(accesses, LIMITES.acessos) || bytes > (custo.bytesRequisicao as number)) return reject()
  return sucesso({ finalidade: 'testeDeContrato', mutacoes: custo.mutacoes as number, acessos: accesses })
}
