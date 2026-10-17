import { expect, it } from 'vitest'
import { cleanupOrder, assertInventoriedChild } from './cleanup'
it('ordena filhos antes do pai e nunca autoriza descendente não inventariado', () => {
  const items = ['users/A','users/A/contas/id'].map(path => ({path,owner:'A',createdByRun:true as const,registeredAt:'2026-10-17T00:00:00Z'}))
  expect(cleanupOrder(items)[0].path).toBe('users/A/contas/id')
  expect(() => assertInventoriedChild('users/A','users/A/contas/outro',items)).toThrow()
})
