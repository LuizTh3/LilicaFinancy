import { expect, it } from 'vitest'
import { anoBissexto, competencia, dataCalendario, diasNoMes } from './calendar'
import { avancarCompetencia, avancarMes, competenciaDaData, dataNaCompetencia, hojeNoFuso, validarFuso } from './calendar'
import { ler } from './testing.testSupport'

it.each(['1900-01-01', '2000-02-29', '2028-02-29', '9999-12-31'])('aceita calendário civil %s', value => {
  expect(dataCalendario(value)).toEqual({ ok: true, valor: value })
})

it('avança mês preservando a âncora, inclusive em séculos e fronteiras', () => {
  expect([0, 1, 2].map(n => ler(avancarMes('2027-01-31', n, 31)))).toEqual(['2027-01-31', '2027-02-28', '2027-03-31'])
  for (const [year, end] of [[1900, 28], [2000, 29], [2028, 29], [2100, 28]]) {
    for (const anchor of [29, 30, 31]) expect(ler(dataNaCompetencia(`${year}-02`, anchor))).toBe(`${year}-02-${end}`)
  }
  expect(ler(avancarCompetencia('2026-12', 1))).toBe('2027-01')
  expect(ler(avancarCompetencia('2027-01', -1))).toBe('2026-12')
  expect(ler(competenciaDaData('2026-10-17'))).toBe('2026-10')
  for (const [period, delta] of [['1900-01', -1], ['9999-12', 1], ['2026-01', 0.5], ['2026-01', Number.MAX_SAFE_INTEGER]] as const) expect(avancarCompetencia(period, delta).ok).toBe(false)
  expect(dataNaCompetencia('2026-01', 0).ok).toBe(false)
})
it('converte somente instante explícito no fuso IANA informado', () => {
  const instant = 1792288800000 // 2026-10-18T02:00:00Z
  expect(new Date(instant).toISOString()).toBe('2026-10-18T02:00:00.000Z')
  expect(ler(hojeNoFuso(instant, 'America/Rio_Branco'))).toBe('2026-10-17')
  expect(ler(hojeNoFuso(instant, 'Asia/Tokyo'))).toBe('2026-10-18')
  expect(ler(hojeNoFuso(instant, 'UTC'))).toBe('2026-10-18')
  for (const zone of ['+01:00', '-05:00', 'Unknown/Zone', '', undefined]) expect(validarFuso(zone).ok).toBe(false)
  for (const invalid of [NaN, Infinity, '2026-10-18', 8.64e15 + 1]) expect(hojeNoFuso(invalid, 'UTC').ok).toBe(false)
  expect(ler(dataCalendario('2026-10-18'))).toBe('2026-10-18')
})
it.each([null, 0, {}, '', '2026-1-01', '2026-01-01T00:00:00Z', '1900-02-29', '2100-02-29', '2026-04-31', '1899-12-31', '10000-01-01'])('rejeita calendário inválido %j', value => {
  expect(dataCalendario(value).ok).toBe(false)
})
it('valida competência, séculos e tipos em execução', () => {
  expect(competencia('2026-12').ok).toBe(true)
  for (const value of ['2026-00', '2026-13', '2026-1', '2026-01-01', 202601]) expect(competencia(value).ok).toBe(false)
  expect(anoBissexto(2000)).toEqual({ ok: true, valor: true })
  expect(anoBissexto(2100)).toEqual({ ok: true, valor: false })
  expect(diasNoMes(1900, 2)).toEqual({ ok: true, valor: 28 })
  expect(diasNoMes(2026, 13).ok).toBe(false)
})
