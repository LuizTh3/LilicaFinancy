import { avancarCompetencia, competencia, competenciaDaData, dataCalendario, dataNaCompetencia } from './calendar'
import type { Competencia, DataCalendario } from './calendar'
import { falha, registro, sucesso } from './errors'
import type { Resultado } from './errors'

export type CalendarioFatura = Readonly<{ competencia: Competencia; fechamento: DataCalendario; vencimento: DataCalendario }>
export function validarCalendarioFatura(value: unknown): Resultado<CalendarioFatura> {
  if (!registro(value)) return falha('referenciaInvalida', 'Informe o calendário confirmado da fatura.')
  const period = competencia(value.competencia), close = dataCalendario(value.fechamento), due = dataCalendario(value.vencimento)
  if (!period.ok) return period
  if (!close.ok) return close
  if (!due.ok) return due
  if (due.valor.slice(0, 7) !== period.valor || close.valor >= due.valor) return falha('referenciaInvalida', 'O calendário da fatura é inconsistente.')
  return sucesso({ competencia: period.valor, fechamento: close.valor, vencimento: due.valor })
}
export function sugerirPrimeiraFatura(dataConsumo: unknown, calendario: unknown, primeiraFatura?: unknown): Resultado<CalendarioFatura & { readonly origem: 'confirmada' | 'sugestao' }> {
  const date = dataCalendario(dataConsumo)
  if (!date.ok) return date
  if (primeiraFatura !== undefined) {
    const explicit = validarCalendarioFatura(primeiraFatura)
    return explicit.ok ? sucesso({ ...explicit.valor, origem: 'confirmada' }) : explicit
  }
  if (!registro(calendario)) return falha('dataInvalida', 'Informe os dias de fechamento e vencimento.')
  const month = competenciaDaData(date.valor)
  if (!month.ok) return month
  let close = dataNaCompetencia(month.valor, calendario.diaFechamento)
  if (!close.ok) return close
  let cycle = month.valor
  if (date.valor >= close.valor) {
    const next = avancarCompetencia(cycle, 1)
    if (!next.ok) return next
    cycle = next.valor
    close = dataNaCompetencia(cycle, calendario.diaFechamento)
    if (!close.ok) return close
  }
  let due = dataNaCompetencia(cycle, calendario.diaVencimento)
  if (!due.ok) return due
  if (due.valor <= close.valor) {
    const next = avancarCompetencia(cycle, 1)
    if (!next.ok) return next
    due = dataNaCompetencia(next.valor, calendario.diaVencimento)
    if (!due.ok) return due
  }
  const period = competenciaDaData(due.valor)
  return period.ok ? sucesso({ competencia: period.valor, fechamento: close.valor, vencimento: due.valor, origem: 'sugestao' }) : period
}
