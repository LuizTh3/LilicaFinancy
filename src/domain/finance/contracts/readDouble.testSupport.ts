import { competencia } from '../calendar'
import { falha, sucesso } from '../errors'
import type { Resultado } from '../errors'
import type { ConsultaPeriodo, LinhaPeriodo, PaginaPeriodo, PortaConsultarPeriodo } from './commands'

let nextContext = 0
export function criarLeituraDouble(uid: string, records: readonly LinhaPeriodo[]): PortaConsultarPeriodo & { alterarRevisao(): void } {
  const context = ++nextContext
  let revision = 1, counter = 0
  const cursors = new Map<string, { signature: string; uid: string; revision: number; offset: number }>()
  return {
    alterarRevisao() { revision++ },
    async listar(q: ConsultaPeriodo): Promise<Resultado<PaginaPeriodo>> {
      if (!competencia(q.inicio).ok || !competencia(q.fim).ok || q.fim < q.inicio || !['consumo', 'planejamento', 'caixa'].includes(q.baseTemporal) || !Number.isInteger(q.pageSize) || q.pageSize < 1 || q.pageSize > 50) return falha('limiteOperacional', 'Informe intervalo e página de1 a50.')
      const signature = JSON.stringify([q.baseTemporal, q.inicio, q.fim, q.pageSize])
      const previous = q.cursor ? cursors.get(q.cursor) : undefined
      if (q.cursor && (!previous || previous.uid !== uid || previous.signature !== signature)) return falha('referenciaInvalida', 'O cursor não pertence a esta consulta.')
      if (previous && previous.revision !== revision) return sucesso({ itens: [], completo: false, revisao: revision, motivos: ['revisaoAlterada'] })
      const rows = records.filter(r => r.uid === uid && r.competencia >= q.inicio && r.competencia <= q.fim).toSorted((a, b) => a.competencia < b.competencia ? -1 : a.competencia > b.competencia ? 1 : a.id < b.id ? -1 : a.id > b.id ? 1 : 0)
      const offset = previous?.offset ?? 0, page = rows.slice(offset, offset + q.pageSize), end = offset + page.length
      if (end < rows.length) {
        const cursor = `cursor_${context}_${++counter}`
        cursors.set(cursor, { signature, uid, revision, offset: end })
        return sucesso({ itens: structuredClone(page), completo: false, revisao: revision, proximaPagina: cursor, motivos: ['paginasIncompletas'] })
      }
      return sucesso({ itens: structuredClone(page), completo: true, revisao: revision, motivos: [] })
    },
  }
}
