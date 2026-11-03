import type { ContextoLiquidacaoFatura } from './contracts/liquidacoesFaturas'
import { sucesso } from './errors'
import { resumirControleFatura } from './liquidacoesFaturas'

/** Cycle and financial settlement are independent; zero never manufactures payment history. */
export function situacaoFatura(controle: unknown, contexto: ContextoLiquidacaoFatura) {
  const resumo = resumirControleFatura(controle, contexto)
  return resumo.ok ? sucesso({ ...resumo.valor, ciclo: contexto.hoje < contexto.calendario.fechamento ? 'aberta' as const : 'fechada' as const }) : resumo
}
