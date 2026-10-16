import { describe, expect, it } from 'vitest'
import { parseRegistration, formatWhatsapp } from './registration'

const valid = { fullName: ' Pessoa Fictícia ', cpf: '529.982.247-25', whatsapp: '+55 (68) 99999-1234', email: ' teste@example.com ' }
describe('registration validation', () => {
  it('normalizes without claiming identity validation', () => {
    expect(parseRegistration(valid)).toEqual({ fullName: 'Pessoa Fictícia', cpf: '52998224725', whatsapp: '+5568999991234', email: 'teste@example.com' })
    expect(formatWhatsapp('+5568999991234')).toBe('+55 (68) 99999-1234')
  })
  it.each(['11111111111', '52998224724', '', '123'])('rejects CPF %s', cpf => {
    expect(() => parseRegistration({ ...valid, cpf })).toThrow()
  })
  it.each([{ fullName: '' }, { whatsapp: '+1 123' }, { email: 'invalid' }, { uid: 'injected' }])('rejects invalid/extra input', patch => {
    expect(() => parseRegistration({ ...valid, ...patch })).toThrow()
  })
})
