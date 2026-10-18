import { validarFuso } from '../../domain/finance/calendar'
export function financeTimezone(value: unknown) {
 const valid=validarFuso(value)
 if(!valid.ok||valid.valor!=='America/Rio_Branco') throw new Error('UNSUPPORTED_PROFILE_TIMEZONE')
 return valid.valor
}
export function clearPrivateIntents(storage: Pick<Storage,'removeItem'>) {
 for(const key of ['lilica-cadastro-pendente','lilica-externo-pendente']) {
  try { storage.removeItem(key) } catch { /* Storage cannot prevent invalidation. */ }
 }
}
