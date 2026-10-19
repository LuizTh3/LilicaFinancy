import { expect, it } from 'vitest'
import { Timestamp } from 'firebase/firestore'
import { calendarioBaseFatura } from '../../domain/finance/invoiceCalendar'
import { decodeFatura, decodeReciboFatura } from './faturasMapper'
const base=calendarioBaseFatura('2027-02',30,31)
if(!base.ok)throw Error('fixture')
const value={...base.valor,cartaoId:'card',schemaVersion:1,versaoConteudo:1,version:1,ultimoEventoId:'confirmarFatura__key',createdAt:Timestamp.fromMillis(1),updatedAt:Timestamp.fromMillis(1)}
it('decodifica identidade e variante vazia e recusa adotar dados incompatíveis',()=>{
 expect(decodeFatura('A','card__2027-02',value)).toMatchObject({uid:'A',inicio:'2027-01-30',fechamento:'2027-02-28',vencimento:'2027-02-28'})
 for(const patch of [{total:0},{itens:[]},{ciclo:'aberto'},{pagamento:'pago'},{uid:'B'},{schemaVersion:2},{versaoConteudo:2},{createdAt:1},{vencimento:'2027-03-01'},{calendarioOrigem:{}}])expect(()=>decodeFatura('A','card__2027-02',{...value,...patch})).toThrow()
 expect(()=>decodeFatura('A','random',value)).toThrow()
})
it('recibo de ajuste prova anterior/novo e preserva calendário canônico',()=>{
 const command={contractVersion:1,tipo:'ajustarVencimento',operationKey:'key',alvoId:'card__2027-02',expectedVersion:1,payload:{vencimento:'2027-02-28',motivo:'Confirmado'}}
 const receipt={schemaVersion:1,contractVersion:1,operationKey:'key',tipo:'ajustarVencimento',alvoId:command.alvoId,expectedVersion:1,resultVersion:2,comando:command,resultado:{...base.valor,cartaoId:'card'},antes:{vencimento:'2027-02-28'},createdAt:Timestamp.fromMillis(1)}
 expect(()=>decodeReciboFatura('ajustarVencimento__key',receipt)).toThrow() // no-op cannot have a receipt
 expect(()=>decodeReciboFatura('ajustarVencimento__key',{...receipt,antes:{vencimento:'2027-03-01'}})).toThrow()
})
it('aceita ajuste efetivo normalizado e rejeita motivo ou antes adulterados',()=>{
 const b=calendarioBaseFatura('2026-10',10,17);if(!b.ok)throw Error('fixture')
 const comando={contractVersion:1,tipo:'ajustarVencimento',operationKey:'key',alvoId:'card__2026-10',expectedVersion:1,payload:{vencimento:'2026-10-19',motivo:'Confirmado'}},r={schemaVersion:1,contractVersion:1,tipo:comando.tipo,operationKey:'key',alvoId:comando.alvoId,expectedVersion:1,resultVersion:2,comando,resultado:{...b.valor,cartaoId:'card',vencimento:'2026-10-19'},antes:{vencimento:'2026-10-17'},createdAt:Timestamp.fromMillis(1)}
 expect(decodeReciboFatura('ajustarVencimento__key',r)).toMatchObject({antes:{vencimento:'2026-10-17'},resultado:{vencimento:'2026-10-19'}})
 expect(()=>decodeReciboFatura('ajustarVencimento__key',{...r,comando:{...comando,payload:{...comando.payload,motivo:' Confirmado '}}})).toThrow()
 expect(()=>decodeReciboFatura('ajustarVencimento__key',{...r,antes:{vencimento:'2026-09-17'}})).toThrow()
})
