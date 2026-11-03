import { basesPainel, fontesPainel } from '../../domain/finance/contracts/painel'
import type { BasePainel, FontePainel } from '../../domain/finance/contracts/painel'

// Local tests cannot enable production queries. G0-remoto/G1/G2 remain pending.
export const painelDisponivel = false
export const capacidadesPainel = Object.freeze(fontesPainel.map(fonte => Object.freeze({
 fonte, contractRevision: 1, bases: basesPainel, estado: 'naoHabilitada' as const, motivo: 'fonteNaoHabilitada' as const,
})))
export function capacidadePainel(fonte: FontePainel, base: BasePainel) {
 if (!fontesPainel.includes(fonte) || !basesPainel.includes(base)) throw Error('CAPACIDADE_PAINEL_INVALIDA')
 return capacidadesPainel.find(cap => cap.fonte === fonte)!
}
