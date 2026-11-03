import type { OrcamentoLeituraPainel } from '../../domain/finance/contracts/painel'
export function createOrcamentoRodada(): OrcamentoLeituraPainel {
  let documentos = 0, reservados = 0, requisicoes = 0
  const abort = (code: string): never => { throw Object.assign(Error(code), { code }) }
  return {
    get documentos() { return documentos }, get requisicoes() { return requisicoes }, get disponiveis() { return 100 - documentos - reservados },
    async executar<T>(limite: number, operation: () => Promise<{ documentos: number; valor: T }>): Promise<T> {
      if (!Number.isInteger(limite) || limite < 1 || limite > 50 || requisicoes >= 8 || documentos + reservados + limite > 100) abort('limiteOperacional')
      reservados += limite; requisicoes++
      let terminou = false
      try {
        const result = await operation()
        if (!Number.isInteger(result.documentos) || result.documentos < 0 || result.documentos > limite) abort('integridadeIndeterminada')
        reservados -= limite; documentos += result.documentos; terminou = true
        return result.valor
      } finally { if (!terminou) { reservados -= limite; documentos += limite } }
    },
  }
}
