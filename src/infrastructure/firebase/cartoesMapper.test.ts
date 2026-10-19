import { expect, it } from 'vitest'
import { Timestamp } from 'firebase/firestore'
import { decodeCartao, decodeReciboCartao } from './cartoesMapper'
const value={banco:'Banco',nome:'Cartão',titularId:'holder',diaFechamento:10,diaVencimento:17,estado:'ativo',schemaVersion:1,version:1,ultimoEventoId:'criarCartao__key',createdAt:Timestamp.fromMillis(100),updatedAt:Timestamp.fromMillis(100)}
it('decodifica schema fechado sem adotar identidade de payload ou timestamps fictícios',()=>{
 expect(decodeCartao('A','card',value)).toMatchObject({uid:'A',id:'card',createdAt:100})
 for(const patch of [{schemaVersion:2},{version:1.5},{uid:'B'},{numeroCompleto:'fixture'},{createdAt:100},{nome:' Cartão'},{archivedAt:Timestamp.fromMillis(100)}])expect(()=>decodeCartao('A','card',{...value,...patch})).toThrow()
 expect(()=>decodeReciboCartao('criarCartao__key',{schemaVersion:1})).toThrow()
})
it('ordem de campos do mapa remoto não muda a identidade canônica do recibo',()=>{
 const payload={nome:'Nome',diaVencimento:17,titularId:'holder',banco:'Banco',diaFechamento:10}
 const command={expectedVersion:0,payload,alvoId:'card',operationKey:'key',tipo:'criarCartao',contractVersion:1}
 expect(decodeReciboCartao('criarCartao__key',{schemaVersion:1,contractVersion:1,operationKey:'key',tipo:'criarCartao',alvoId:'card',expectedVersion:0,resultVersion:1,comando:command,resultado:{...payload,estado:'ativo'},createdAt:Timestamp.fromMillis(100)})).toMatchObject({comando:{payload:{nome:'Nome'}},resultVersion:1})
})
