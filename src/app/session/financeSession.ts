import { validarFuso } from '../../domain/finance/calendar'
import { clearPrivateFinanceResources } from '../../domain/finance/sessionResources'
export { clearPrivateFinanceResources, registerPrivateFinanceResource } from '../../domain/finance/sessionResources'
export function advancePrivateFinanceGeneration(generation: { next(): number }) {
 const next = generation.next()
 clearPrivateFinanceResources()
 return next
}
export function financeTimezone(value: unknown) {
 const valid=validarFuso(value)
 if(!valid.ok||valid.valor!=='America/Rio_Branco') throw new Error('UNSUPPORTED_PROFILE_TIMEZONE')
 return valid.valor
}
export function clearPrivateIntents(storage: Pick<Storage,'removeItem'>) {
 for(const key of ['lilica-cadastro-pendente','lilica-externo-pendente','lilica-cartoes-faturas-pendente']) {
  try { storage.removeItem(key) } catch { /* Storage cannot prevent invalidation. */ }
 }
}
