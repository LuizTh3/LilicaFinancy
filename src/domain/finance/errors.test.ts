import { expect, it } from 'vitest'
import { falha, sucesso } from './errors'

it('distingue resultado de falha sem carregar a entrada financeira no erro', () => {
  expect(sucesso(0)).toEqual({ ok: true, valor: 0 })
  const error = falha('conflitoVersao', 'Recarregue o registro.', { campo: 'version', versaoAtual: 4, recuperacao: 'reler' })
  expect(error).toEqual({ ok: false, erro: { codigo: 'conflitoVersao', mensagem: 'Recarregue o registro.', campo: 'version', versaoAtual: 4, recuperacao: 'reler' } })
  expect(JSON.parse(JSON.stringify(error))).toEqual(error)
  expect(error.ok).toBe(false)
  const extra = { campo: 'version', uid: 'private-user', payload: { valor: 100 } }
  expect(JSON.stringify(falha('valorInvalido', 'Entrada inválida.', extra))).not.toContain('private-user')
})
