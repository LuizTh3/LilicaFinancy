import { expect, it } from 'vitest'
import { calendarDate, validatePeriod } from './subscription'

it('handles actual calendar dates and ordered inclusive periods', () => {
  expect(validatePeriod('2028-02-29', '2028-02-29')).toBe(true)
  for (const dates of [['2027-02-29', '2027-03-01'], ['2026-04-31', '2026-05-01'], ['', ''], ['2026-12-01', '2026-01-01']]) {
    expect(validatePeriod(dates[0], dates[1])).toBe(false)
  }
})

it('preserva o wrapper civil compartilhado e a faixa histórica', () => {
  expect(calendarDate('1900-01-01')).toBe(true)
  expect(calendarDate('9999-12-31')).toBe(true)
  expect(calendarDate('2100-02-29')).toBe(false)
  expect(calendarDate('2000-02-29')).toBe(true)
  expect(validatePeriod('2026-10-18', '2026-10-17')).toBe(false)
})
