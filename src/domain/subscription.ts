import { dataCalendario } from './finance/calendar'

export function calendarDate(value: string) {
  return dataCalendario(value).ok
}
export function validatePeriod(start: string, end: string) { return calendarDate(start) && calendarDate(end) && end >= start }
