import { expect, it } from 'vitest'
import { validarComandoCartao, descritorCartaoValido, descreverCartao, eventoCartaoId } from '../cartoes'
import { planejarCartao } from '../cartoes'
import { criarSerieDouble, comandoSerie } from './seriesDouble.testSupport'
it('contrato de descritor é fechado e vincula operação, alvo e versão sem conteúdo bancário',()=>{
 const c=validarComandoCartao({contractVersion:1,tipo:'criarCartao',operationKey:'key',alvoId:'card',expectedVersion:0,payload:{banco:'Banco',nome:'Nome',titularId:'holder',diaFechamento:31,diaVencimento:5}})
 expect(c.ok).toBe(true)
 if(!c.ok)return
 const d=descreverCartao(c.valor)
 expect(descritorCartaoValido(d)).toBe(true)
 expect(eventoCartaoId(d)).toBe('criarCartao__key')
 expect(descritorCartaoValido({...d,payload:{}})).toBe(false)
 expect(descritorCartaoValido({...d,expectedVersion:1})).toBe(false)
 expect(descritorCartaoValido({...d,operationKey:'../bad'})).toBe(false)
})
it('double identificado003 preserva parcelas futuras durante transição independente006 do cartão',async()=>{
 const repo=criarSerieDouble('A'),c=comandoSerie('existing','purchase',2)
 expect((await repo.criar(c)).ok).toBe(true)
 const before=repo.estado(),card={id:'card',uid:'A',schemaVersion:1 as const,version:1,estado:'ativo' as const,banco:'Banco',nome:'Nome',titularId:'holder',diaFechamento:10,diaVencimento:17,ultimoEventoId:'criarCartao__key',createdAt:1,updatedAt:1}
 expect(planejarCartao({contractVersion:1,tipo:'arquivarCartao',operationKey:'archive',alvoId:'card',expectedVersion:1,payload:{}},card,undefined,'A')).toMatchObject({ok:true,valor:{dados:{estado:'arquivado'}}})
 expect(repo.estado()).toEqual(before)
 expect(before).toMatchObject({parcelas:3,faturas:3})
 // This is a pure boundary contract, not an integrated remote purchase implementation.
})
