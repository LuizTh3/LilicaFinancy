import { expect, it } from 'vitest'
import { cadastrosEnvironment } from './environment'
it('exige quatro contas distintas apenas no grupo cadastral', () => {
  expect(() => cadastrosEnvironment({})).toThrow()
})
