export type Registration = { fullName: string; cpf: string; whatsapp: string; email: string }
export function exactKeys(value: unknown, keys: string[]): asserts value is Record<string, unknown> {
  if (!value || typeof value !== 'object' || Array.isArray(value) || Object.keys(value).length !== keys.length || !keys.every(key => Object.hasOwn(value, key))) throw new Error('INVALID_INPUT')
}
export function validCpf(cpf: string) {
  if (!/^\d{11}$/.test(cpf) || /^(\d)\1{10}$/.test(cpf)) return false
  for (const length of [9, 10]) {
    const sum = [...cpf.slice(0, length)].reduce((total, digit, i) => total + Number(digit) * (length + 1 - i), 0)
    const remainder = (sum * 10) % 11
    if ((remainder === 10 ? 0 : remainder) !== Number(cpf[length])) return false
  }
  return true
}
export function parseRegistration(input: unknown): Registration {
  exactKeys(input, ['fullName', 'cpf', 'whatsapp', 'email'])
  if (!Object.values(input).every(value => typeof value === 'string')) throw new Error('INVALID_INPUT')
  const fullName = (input.fullName as string).trim()
  const cpf = (input.cpf as string).replace(/[.\-\s]/g, '')
  const whatsapp = (input.whatsapp as string).replace(/[()\-\s]/g, '')
  const email = (input.email as string).trim().toLowerCase()
  if (!fullName || fullName.length > 150) throw new Error('Nome completo inválido.')
  if (!validCpf(cpf)) throw new Error('CPF inválido.')
  if (!/^\+55[1-9]\d9\d{8}$/.test(whatsapp)) throw new Error('WhatsApp inválido. Use +55 (xx) xxxxx-xxxx.')
  if (email.length > 254 || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) throw new Error('Email inválido.')
  return { fullName, cpf, whatsapp, email }
}
export function formatWhatsapp(value: string) {
  let digits = value.replace(/\D/g, '')
  if (!digits.startsWith('55')) digits = '55' + digits
  digits = digits.slice(0, 13)
  const local = digits.slice(4)
  return '+55' + (digits.length > 2 ? ` (${digits.slice(2, 4)}` : '') + (digits.length >= 4 ? ') ' : '') + local.slice(0, 5) + (local.length > 5 ? '-' + local.slice(5) : '')
}
