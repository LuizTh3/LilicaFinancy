import { Timestamp } from 'firebase/firestore'
import { registro } from '../../domain/finance/errors'
import { validarControleFatura } from '../../domain/finance/liquidacoesFaturas'
import type { FaturaFinanceira } from '../../domain/finance/faturaFinanceira'
import { decodeFatura } from './faturasMapper'

const bad = (): never => { throw Object.assign(new Error('Conteúdo financeiro da fatura incompatível. Nenhum dado foi alterado.'), { code: 'schema' }) }
/** Explicit v4 decoder. The legacy v1 path remains closed to financial mutations. */
export function decodeFaturaFinanceira(uid: string, id: string, input: unknown): FaturaFinanceira {
  if (!registro(input) || input.versaoConteudo !== 4 || !registro(input.conteudo)) return bad()
  const { conteudo, ...calendar } = input
  // Validate all calendar fields with the existing closed decoder; expose v4 explicitly.
  const fatura = decodeFatura(uid, id, { ...calendar, versaoConteudo: 1 })
  if ('uid' in conteudo || 'faturaId' in conteudo || 'cartaoId' in conteudo || 'competencia' in conteudo || !(conteudo.createdAt instanceof Timestamp) || !(conteudo.updatedAt instanceof Timestamp)) return bad()
  const valid = validarControleFatura({ ...conteudo, uid, faturaId: id, cartaoId: fatura.cartaoId, competencia: fatura.competencia, createdAt: conteudo.createdAt.toMillis(), updatedAt: conteudo.updatedAt.toMillis() })
  if (!valid.ok || valid.valor.createdAt < fatura.createdAt) return bad()
  return Object.freeze({ ...fatura, versaoConteudo: 4, conteudo: Object.freeze(valid.valor) })
}
