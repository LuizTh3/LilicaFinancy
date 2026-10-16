import { expect, it } from 'vitest'
import { validateManifest } from './manifest'
it('rejects shared counters, preexisting roles and other UID records', () => {
  for (const path of ['admins/A', 'operationBudgets/global-1', 'users/B', 'users/A/finance/x']) {
    expect(() => validateManifest({ projectId: 'p', runId: 'run12345', uids: ['A'], documents: [{ path, owner: 'A', createdByRun: true, registeredAt: '2026-10-16T00:00:00Z' }] }, 'p', 'run12345', ['A'])).toThrow()
  }
  expect(validateManifest({ projectId: 'p', runId: 'run12345', uids: ['A'], documents: [{ path: 'users/A', owner: 'A', createdByRun: true, registeredAt: '2026-10-16T00:00:00Z' }] }, 'p', 'run12345', ['A'])).toHaveLength(1)
})
