import { avancarCompetencia, avancarMes, competencia, dataCalendario, dataNaCompetencia } from './calendar'
import type { Competencia, DataCalendario } from './calendar'
import { falha, registro, sucesso, umDe } from './errors'
import type { Resultado } from './errors'
import { validarCalendarioFatura } from './invoiceCalendar'
import { distribuirParcelas, somarCentavos, valorPositivo } from './money'
import type { ValorPositivo } from './money'

export type CompromissoProposto = Readonly<{ numero: number; quantidadeOriginal: number; valorCentavos: ValorPositivo; competenciaPlanejamento: Competencia; vencimento: DataCalendario }>
export function montarCronograma(input: unknown): Resultado<readonly CompromissoProposto[]> {
  if (!registro(input) || !umDe(input.origemDados, ['nova', 'migrada'])) return falha('valorInvalido', 'Informe a origem nova ou migrada do cronograma.')
  const n = input.quantidadeOriginal, k = input.origemDados === 'nova' ? 1 : input.numeroInicial
  if (typeof n !== 'number' || !Number.isInteger(n) || n < 1 || n > 12) return falha('limiteOperacional', 'São permitidas de 1 a 12 parcelas originais.', { limite: 12 })
  if (typeof k !== 'number' || !Number.isInteger(k) || k < 1 || k > n) return falha('valorInvalido', 'Informe o número inicial válido.')
  const count = n - k + 1
  const total = valorPositivo(input.origemDados === 'nova' ? input.totalCentavos : input.saldoMigradoCentavos)
  if (!total.ok) return total
  const period = competencia(input.primeiraCompetencia), firstDue = dataCalendario(input.primeiroVencimento)
  if (!period.ok) return period
  if (!firstDue.ok) return firstDue
  if (!dataNaCompetencia(period.valor, input.diaAncora).ok) return falha('dataInvalida', 'Informe uma âncora de 1 a 31.')
  let values = distribuirParcelas(total.valor, count)
  if (!values.ok) return values
  if (input.valoresConhecidos !== undefined) {
    if (!Array.isArray(input.valoresConhecidos) || input.valoresConhecidos.length !== count) return falha('valorInvalido', 'Informe todas as parcelas conhecidas.')
    const known: ValorPositivo[] = []
    for (const value of input.valoresConhecidos) {
      const valid = valorPositivo(value)
      if (!valid.ok) return valid
      known.push(valid.valor)
    }
    const sum = somarCentavos(known)
    if (!sum.ok) return sum
    if (sum.valor !== total.valor) return falha('valorInvalido', 'A soma das parcelas deve coincidir com o saldo informado.')
    values = sucesso(known)
  }
  if (!values.ok) return values
  const faturas = input.faturas
  if (faturas !== undefined && (!Array.isArray(faturas) || faturas.length !== count)) return falha('referenciaInvalida', 'Informe a fatura de cada parcela.')
  if (input.vencimentosCopiados !== undefined && (!Array.isArray(input.vencimentosCopiados) || input.vencimentosCopiados.length !== count || !faturas)) return falha('referenciaInvalida', 'As datas copiadas exigem todas as faturas.')
  const result: CompromissoProposto[] = []
  for (let i = 0; i < count; i++) {
    const month = avancarCompetencia(period.valor, i)
    if (!month.ok) return month
    let due = avancarMes(firstDue.valor, i, input.diaAncora)
    if (Array.isArray(faturas)) {
      const invoice = validarCalendarioFatura(faturas[i])
      if (!invoice.ok) return invoice
      if (invoice.valor.competencia !== month.valor || (Array.isArray(input.vencimentosCopiados) && input.vencimentosCopiados[i] !== invoice.valor.vencimento)) return falha('referenciaInvalida', 'Competência ou vencimento da parcela diverge da fatura.')
      due = sucesso(invoice.valor.vencimento)
    }
    if (!due.ok) return due
    result.push({ numero: k + i, quantidadeOriginal: n, valorCentavos: values.valor[i], competenciaPlanejamento: month.valor, vencimento: due.valor })
  }
  return sucesso(result)
}
