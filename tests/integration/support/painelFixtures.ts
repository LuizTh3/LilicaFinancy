import { competencia } from '../../../src/domain/finance/calendar'
import { idCadastroValido } from '../../../src/domain/finance/cadastros'
import { identidadeFaturaValida } from '../../../src/domain/finance/faturas'

export function painelManifest(scope: { projectId: string; runId: string; uids: readonly string[] }, month: string) {
 if (scope.projectId !== 'lilicafinancy' || !/^[A-Za-z0-9_-]{8,80}$/.test(scope.runId) || scope.uids.length !== 4 || new Set(scope.uids).size !== 4 || scope.uids.some(uid => !/^[A-Za-z0-9_-]{1,128}$/.test(uid)) || !competencia(month).ok) throw Error('INVALID_PAINEL_SCOPE')
 const externoId = scope.runId + '-externo', cartaoId = scope.runId + '-cartao', cartaoVazioId = scope.runId + '-vazio', faturaId = cartaoId + '__' + month
 if (!idCadastroValido(externoId) || !idCadastroValido(cartaoId) || !identidadeFaturaValida(faturaId)) throw Error('INVALID_PAINEL_FIXTURE_ID')
 const uid = scope.uids[0]
 return Object.freeze({ mode: 'existing-fixtures-read-only' as const, projectId: scope.projectId, runId: scope.runId, uids: Object.freeze([...scope.uids]), month, externoId, cartaoId, cartaoVazioId, faturaId, paths: Object.freeze([`users/${uid}/lancamentosExternos/${externoId}`, `users/${uid}/faturas/${faturaId}`]) })
}
