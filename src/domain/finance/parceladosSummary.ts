import { dataCalendario } from './calendar'
import { validarSerieParcelada } from './parcelados'
import { somarCentavos, subtrairCentavos } from './money'
import { falha, sucesso } from './errors'

/** Current persisted obligation controls; totals do not claim to reconstruct a paginated ledger. */
export function resumirSerieParcelada(input: unknown, ctx: Readonly<{ uid: string; hoje: string }>) {
  const s = validarSerieParcelada(input)
  if (!s.ok) return s
  if (s.valor.uid !== ctx.uid || !dataCalendario(ctx.hoje).ok) return falha('referenciaInvalida', 'Confira a série e a data da consulta.')
  const linhas = []
  for (const p of Object.values(s.valor.parcelas)) {
    const pendente = subtrairCentavos(p.valorCentavos, p.liquidadoLiquidoCentavos)
    if (!pendente.ok) return pendente
    linhas.push({ ...p, pendenteCentavos: p.estadoObrigacao === 'ativa' ? pendente.valor : 0, situacao: p.estadoObrigacao === 'cancelada' ? 'cancelada' as const : pendente.valor === 0 ? 'liquidada' as const : p.liquidadoLiquidoCentavos > 0 ? 'parcial' as const : 'pendente' as const, atrasada: p.estadoObrigacao === 'ativa' && pendente.valor > 0 && p.vencimento < ctx.hoje })
  }
  const total = somarCentavos(linhas.filter(p => p.estadoObrigacao === 'ativa').map(p => p.valorCentavos)), pago = somarCentavos(linhas.map(p => p.liquidadoLiquidoCentavos)), pendente = somarCentavos(linhas.map(p => p.pendenteCentavos))
  if (!total.ok) return total
  if (!pago.ok) return pago
  if (!pendente.ok) return pendente
  return sucesso({ serie: s.valor, linhas, planejadoAtivoCentavos: total.valor, liquidadoLiquidoCentavos: pago.valor, pendenteCentavos: pendente.valor, anterioresNaoCadastradas: s.valor.numeroInicial - 1, ...(s.valor.valorOriginalCentavos !== undefined ? { valorOriginalCentavos: s.valor.valorOriginalCentavos } : {}) })
}
