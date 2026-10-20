import { validateManifest, type Manifest } from './manifest'

// Identity-only fixture plan: no SDK, credentials, writes or financial seed.
export function liquidacoesFaturasFixtures(scope:{projectId:string;runId:string;uids:readonly string[]},owner:string) {
 if(!scope.projectId || !/^[A-Za-z0-9-]{8,40}$/.test(scope.runId) || !scope.uids.includes(owner) || new Set(scope.uids).size!==scope.uids.length) throw new Error('INVALID_TEST_SCOPE')
 const id=scope.runId+'-008', invoice=id+'__2026-10', parcel=id+'__r1__n1'
 const root='users/'+owner+'/'
 const documents=[
  'cartoes/'+id, 'faturas/'+invoice, 'controlesFaturas/'+invoice,
  'compras/'+id, 'parcelasCartao/'+parcel,
  'operacoesCompras/incluirCompraEsquecida__'+id,
  'operacoesLiquidacoesFaturas/pagarFatura__'+id,
  'controlesPagamentosFaturas/pagarFatura__'+id+'__e1',
  'controlesItensFaturas/parcelaCartao__'+parcel,
  'operacoesLiquidacoesFaturas/registrarEncargo__'+id,
  'controlesItensFaturas/encargo__registrarEncargo__'+id+'__e1',
  'operacoesLiquidacoesFaturas/corrigirItem__'+id,
  'controlesAjustesFaturas/corrigirItem__'+id+'__e1',
 ].map(path=>({path:root+path,owner,createdByRun:true as const,registeredAt:'2026-10-19T00:00:00Z'}))
 const manifest:Manifest={projectId:scope.projectId,runId:scope.runId,uids:[...scope.uids],documents}
 validateManifest(manifest,scope.projectId,scope.runId,[...scope.uids])
 return {id,invoiceId:invoice,parcelId:parcel,manifest}
}
