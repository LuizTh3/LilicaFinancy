import { expect, it } from 'vitest'
import { validatePeriod } from './subscription'

it('handles actual calendar dates and ordered inclusive periods', () => {
  expect(validatePeriod('2028-02-29', '2028-02-29')).toBe(true)
  for (const dates of [['2027-02-29', '2027-03-01'], ['2026-04-31', '2026-05-01'], ['', ''], ['2026-12-01', '2026-01-01']]) {
    expect(validatePeriod(dates[0], dates[1])).toBe(false)
  }
})
