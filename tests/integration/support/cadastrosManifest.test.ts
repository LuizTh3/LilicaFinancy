import { expect, it } from 'vitest'
import { validateManifest } from './manifest'
const base = { projectId: 'p', runId: 'run12345', uids: ['A'], documents: [{ path: 'users/A/titulares/id-1', owner: 'A', createdByRun: true as const, registeredAt: '2026-10-17T00:00:00Z' }] }
it('inventaria filhos e recusa paths e proprietários fora do escopo', () => {
  expect(validateManifest(base, 'p', 'run12345', ['A'])).toHaveLength(1)
  for (const path of ['users/B/titulares/id-1', 'users/A/receitas/id-1', 'users/A/titulares/id_1', 'users/A/titulares/id-1/other/id']) {
    expect(() => validateManifest({ ...base, documents: [{ ...base.documents[0], path }] }, 'p', 'run12345', ['A'])).toThrow()
  }
  expect(() => validateManifest({ ...base, documents: [{ ...base.documents[0], path: 'users/A/operacoesCadastros/titulares__missing__1' }] }, 'p', 'run12345', ['A'])).toThrow()
})
