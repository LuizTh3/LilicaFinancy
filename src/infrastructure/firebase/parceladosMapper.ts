import { Timestamp } from 'firebase/firestore'
import type { CompromissoPlanejamento } from '../../domain/finance/contracts/commands'
import type { EventoCriacaoParcelada, SerieParcelada } from '../../domain/finance/contracts/parcelados'
import { camposPermitidos, registro } from '../../domain/finance/errors'
import { validarSerieParcelada } from '../../domain/finance/parcelados'
import { conferirCriacaoParcelada } from '../../domain/finance/parceladosCommands'
import { identidadeParcelaExterna } from '../../domain/finance/parceladosValidation'
import { idCartaoValido } from '../../domain/finance/cartoes'

const bad = (): never => { throw Object.assign(new Error('Série ou evento parcelado incompatível.'), { code: 'schema' }) }
export function decodeSerieParcelada(uid: string, id: string, v: unknown): SerieParcelada {
  if (!uid || !registro(v) || 'uid' in v || 'id' in v || !(v.createdAt instanceof Timestamp) || !(v.updatedAt instanceof Timestamp) || !registro(v.parcelas)) return bad()
  const parcelas: Record<string, unknown> = {}
  for (const [k, row] of Object.entries(v.parcelas)) {
    if (!registro(row) || 'canceledAt' in row && !(row.canceledAt instanceof Timestamp)) return bad()
    parcelas[k] = { ...row, ...(row.canceledAt instanceof Timestamp ? { canceledAt: row.canceledAt.toMillis() } : {}) }
  }
  const valid = validarSerieParcelada({ ...v, uid, id, parcelas, createdAt: v.createdAt.toMillis(), updatedAt: v.updatedAt.toMillis() })
  return valid.ok ? valid.valor : bad()
}
export function encodeSerieParcelada(input: SerieParcelada): Record<string, unknown> {
  const valid = validarSerieParcelada(input)
  if (!valid.ok) return bad()
  const { uid: _, id: __, ...s } = valid.valor
  return { ...s, createdAt: Timestamp.fromMillis(s.createdAt), updatedAt: Timestamp.fromMillis(s.updatedAt), parcelas: Object.fromEntries(Object.entries(s.parcelas).map(([key, p]) => [key, { ...p, ...(p.canceledAt !== undefined ? { canceledAt: Timestamp.fromMillis(p.canceledAt) } : {}) }])) }
}
export function mapearCompromissosParcelados(input: SerieParcelada): readonly CompromissoPlanejamento[] {
  const valid = validarSerieParcelada(input)
  if (!valid.ok) return bad()
  const s = valid.valor
  return Object.freeze(Object.values(s.parcelas).map(p => {
    const id = identidadeParcelaExterna(s.id, p.numero)
    if (!id.ok) return bad()
    return Object.freeze({ id: id.valor, uid: s.uid, origemId: s.id, tipo: 'parcelaExterna' as const, valorCentavos: p.valorCentavos, competenciaPlanejamento: p.competenciaPlanejamento, vencimento: p.vencimento, estadoObrigacao: p.estadoObrigacao })
  }))
}
export function decodeCriacaoParcelada(uid: string, id: string, v: unknown): EventoCriacaoParcelada {
  if (!uid || !registro(v) || !camposPermitidos(v, ['schemaVersion', 'contractVersion', 'tipo', 'operationKey', 'seriesIds', 'expectedVersions', 'resultVersions', 'comando', 'createdAt']) || v.schemaVersion !== 1 || v.contractVersion !== 1 || v.tipo !== 'criarSerie' || !idCartaoValido(v.operationKey) || id !== `criarSerie__${v.operationKey}` || !(v.createdAt instanceof Timestamp) || !Array.isArray(v.seriesIds) || !registro(v.expectedVersions) || !registro(v.resultVersions)) return bad()
  const comando = conferirCriacaoParcelada(v.comando, id)
  if (!comando.ok) return bad()
  const sid = comando.valor.serieId
  if (v.seriesIds.length !== 1 || v.seriesIds[0] !== sid || Object.keys(v.expectedVersions).length !== 1 || v.expectedVersions[sid] !== 0 || Object.keys(v.resultVersions).length !== 1 || v.resultVersions[sid] !== 1 || v.createdAt.toMillis() < 0 || new TextEncoder().encode(JSON.stringify(v)).length > 32768) return bad()
  return { uid, id, schemaVersion: 1, contractVersion: 1, tipo: 'criarSerie', operationKey: String(v.operationKey), seriesIds: Object.freeze([sid]), expectedVersions: Object.freeze({ [sid]: 0 }), resultVersions: Object.freeze({ [sid]: 1 }), comando: comando.valor, createdAt: v.createdAt.toMillis() }
}
