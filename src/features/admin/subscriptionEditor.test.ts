import { expect, it } from 'vitest'
import { mayApplyEditorResult, notificationLabel } from './subscriptionEditor'
it('rejects results after teardown or permission loss', () => {
  expect(mayApplyEditorResult(1, 2, true)).toBe(false)
  expect(mayApplyEditorResult(1, 1, false)).toBe(false)
  expect(mayApplyEditorResult(1, 1, true)).toBe(true)
  expect(notificationLabel('accepted')).toBe('Aceito pelo provedor')
})
