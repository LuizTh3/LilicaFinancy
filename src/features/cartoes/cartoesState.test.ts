import { expect, it } from 'vitest'
import { CartoesRequestScope, lerCartaoPendente } from './cartoesState'

const descritor={contractVersion:1,tipo:'criarCartao',operationKey:'intent-1',alvoId:'card-1',expectedVersion:0}
it('recupera somente descritor fechado da mesma conta, sem conteúdo do formulário',()=>{
 expect(lerCartaoPendente(JSON.stringify({uid:'A',descritor}),'A')).toEqual(descritor)
 expect(lerCartaoPendente(JSON.stringify({uid:'A',descritor}),'B')).toBeUndefined()
 expect(lerCartaoPendente(JSON.stringify({uid:'A',descritor:{...descritor,payload:{banco:'Privado'}}}),'A')).toBeUndefined()
 expect(lerCartaoPendente(JSON.stringify({uid:'A',descritor,payload:{}}),'A')).toBeUndefined()
 expect(lerCartaoPendente('{','A')).toBeUndefined()
})
it('bloqueia envio duplo e descarta a geração anterior sem liberar outro envio',()=>{
 const scope=new CartoesRequestScope('A'),first=scope.begin()!
 expect(scope.begin()).toBeUndefined()
 expect(scope.valid(first,'B')).toBe(false)
 scope.clear()
 const second=scope.begin()!
 expect(scope.valid(first,'A')).toBe(false)
 scope.finish(first)
 expect(scope.begin()).toBeUndefined()
 scope.finish(second)
 expect(scope.begin()).toBe(second)
})
