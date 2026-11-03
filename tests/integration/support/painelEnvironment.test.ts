import { expect, it } from 'vitest'
import { integrationClientLabels, integrationGroup, painelEnvironment } from './environment'
import { painelManifest } from './painelFixtures'
function values() {
 const env: Record<string, string> = { TEST_EXPECTED_PROJECT_ID: 'lilicafinancy', VITE_FIREBASE_PROJECT_ID: 'lilicafinancy', TEST_RUN_ID: 'painel-20261020', VITE_FIREBASE_API_KEY: 'fixture', VITE_FIREBASE_AUTH_DOMAIN: 'fixture.invalid', VITE_FIREBASE_APP_ID: 'fixture', TEST_PAINEL_READS_AUTHORIZED: 'yes', TEST_PAINEL_FIXTURES_READY: 'yes', TEST_PAINEL_MONTH: '2026-11' }
 for (const role of ['A', 'B', 'ADMIN', 'PENDING']) for (const key of ['UID', 'EMAIL', 'PASSWORD']) env[`TEST_USER_${role}_${key}`] = key === 'UID' ? role : 'fixture-only'
 return env
}
it('grupo painel seleciona cinco perfis e manifesto só inventaria os registros exatos', () => {
 const v = values(), scope = painelEnvironment(v), manifest = painelManifest(scope, v.TEST_PAINEL_MONTH)
 expect(integrationGroup('painel')).toBe('painel')
 expect(integrationClientLabels('painel')).toEqual(['A', 'B', 'visitor', 'ADMIN', 'PENDING'])
 expect(manifest.paths).toEqual([`users/A/lancamentosExternos/${scope.runId}-externo`, `users/A/faturas/${scope.runId}-cartao__2026-11`])
 expect(JSON.stringify(manifest)).not.toContain('PASSWORD')
 expect(manifest.mode).toBe('existing-fixtures-read-only')
})
it('aborta projeto divergente, UID repetido, falta de autorização ou fixtures não prontas', () => {
 for (const patch of [{ VITE_FIREBASE_PROJECT_ID: 'other' }, { TEST_EXPECTED_PROJECT_ID: 'other', VITE_FIREBASE_PROJECT_ID: 'other' }, { TEST_USER_ADMIN_UID: 'A' }, { TEST_PAINEL_READS_AUTHORIZED: 'no' }, { TEST_PAINEL_FIXTURES_READY: 'no' }]) expect(() => painelEnvironment({ ...values(), ...patch })).toThrow()
 expect(() => painelManifest(painelEnvironment(values()), '2026-13')).toThrow()
 expect(() => painelManifest({ ...painelEnvironment(values()), runId: '../escape' }, '2026-11')).toThrow()
})
