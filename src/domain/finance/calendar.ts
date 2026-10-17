import { falha, sucesso } from './errors'
import type { Resultado } from './errors'

declare const dataMarca: unique symbol
declare const competenciaMarca: unique symbol
export type DataCalendario = string & { readonly [dataMarca]: true }
export type Competencia = string & { readonly [competenciaMarca]: true }
declare const fusoMarca: unique symbol
export type FusoPerfil = string & { readonly [fusoMarca]: true }
const erroData = () => falha('dataInvalida', 'Informe uma data de calendário válida entre 1900 e 9999.', { recuperacao: 'corrigir' })
const anoValido = (ano: unknown): ano is number => typeof ano === 'number' && Number.isInteger(ano) && ano >= 1900 && ano <= 9999
export function anoBissexto(ano: unknown): Resultado<boolean> {
  return anoValido(ano) ? sucesso(ano % 4 === 0 && (ano % 100 !== 0 || ano % 400 === 0)) : erroData()
}
export function diasNoMes(ano: unknown, mes: unknown): Resultado<number> {
  const leap = anoBissexto(ano)
  if (!leap.ok || typeof mes !== 'number' || !Number.isInteger(mes) || mes < 1 || mes > 12) return erroData()
  return sucesso([31, leap.valor ? 29 : 28, 31, 30, 31, 30, 31, 31, 30, 31, 30, 31][mes - 1])
}
export function competencia(value: unknown): Resultado<Competencia> {
  if (typeof value !== 'string' || !/^[0-9]{4}-[0-9]{2}$/.test(value) || !diasNoMes(Number(value.slice(0, 4)), Number(value.slice(5))).ok) return erroData()
  return sucesso(value as Competencia)
}
export function dataCalendario(value: unknown): Resultado<DataCalendario> {
  if (typeof value !== 'string' || !/^[0-9]{4}-[0-9]{2}-[0-9]{2}$/.test(value) || !competencia(value.slice(0, 7)).ok) return erroData()
  const max = diasNoMes(Number(value.slice(0, 4)), Number(value.slice(5, 7)))
  const dia = Number(value.slice(8))
  return max.ok && dia >= 1 && dia <= max.valor ? sucesso(value as DataCalendario) : erroData()
}
export function competenciaDaData(value: unknown): Resultado<Competencia> {
  const valid = dataCalendario(value)
  return valid.ok ? competencia(valid.valor.slice(0, 7)) : valid
}
export function avancarCompetencia(value: unknown, deslocamento: unknown): Resultado<Competencia> {
  const valid = competencia(value)
  if (!valid.ok) return valid
  if (typeof deslocamento !== 'number' || !Number.isSafeInteger(deslocamento)) return erroData()
  const index = Number(valid.valor.slice(0, 4)) * 12 + Number(valid.valor.slice(5)) - 1
  if (deslocamento < 1900 * 12 - index || deslocamento > 9999 * 12 + 11 - index) return erroData()
  const target = index + deslocamento
  return competencia(`${Math.floor(target / 12)}-${String(target % 12 + 1).padStart(2, '0')}`)
}
export function dataNaCompetencia(value: unknown, diaAncora: unknown): Resultado<DataCalendario> {
  const valid = competencia(value)
  if (!valid.ok) return valid
  if (typeof diaAncora !== 'number' || !Number.isInteger(diaAncora) || diaAncora < 1 || diaAncora > 31) return erroData()
  const max = diasNoMes(Number(valid.valor.slice(0, 4)), Number(valid.valor.slice(5)))
  return max.ok ? dataCalendario(`${valid.valor}-${String(Math.min(diaAncora, max.valor)).padStart(2, '0')}`) : max
}
export function avancarMes(value: unknown, deslocamento: unknown, diaAncora: unknown): Resultado<DataCalendario> {
  const base = competenciaDaData(value)
  if (!base.ok) return base
  const target = avancarCompetencia(base.valor, deslocamento)
  return target.ok ? dataNaCompetencia(target.valor, diaAncora) : target
}
export function validarFuso(value: unknown): Resultado<FusoPerfil> {
  if (typeof value !== 'string' || !/^[A-Za-z][A-Za-z0-9_+\-/]*$/.test(value)) return erroData()
  try {
    new Intl.DateTimeFormat('en', { timeZone: value }).resolvedOptions()
    return sucesso(value as FusoPerfil)
  } catch { return erroData() }
}
export function hojeNoFuso(instanteMs: unknown, fuso: unknown): Resultado<DataCalendario> {
  const zone = validarFuso(fuso)
  if (!zone.ok) return zone
  if (typeof instanteMs !== 'number' || !Number.isSafeInteger(instanteMs) || Math.abs(instanteMs) > 8.64e15) return erroData()
  const parts = new Intl.DateTimeFormat('en', { timeZone: zone.valor, calendar: 'gregory', numberingSystem: 'latn', year: 'numeric', month: '2-digit', day: '2-digit' }).formatToParts(new Date(instanteMs))
  const field = (type: string) => parts.find(part => part.type === type)?.value ?? ''
  return dataCalendario(`${field('year')}-${field('month')}-${field('day')}`)
}
