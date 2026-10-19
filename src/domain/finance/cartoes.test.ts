import { expect, it } from 'vitest'
import { validarComandoCartao, planejarCartao, descreverCartao } from './cartoes'
import type { Cartao, ComandoCartao } from './contracts/cartoes'
export const novoCartao:ComandoCartao={contractVersion:1,tipo:'criarCartao',operationKey:'op-1',alvoId:'card-1',expectedVersion:0,payload:{banco:'Banco',nome:'Cartão',titularId:'holder-1',diaFechamento:10,diaVencimento:17}}
const holder={id:'holder-1',uid:'A',estado:'ativo' as const}
const saved:Cartao={...novoCartao.payload as Cartao,id:'card-1',uid:'A',estado:'ativo',schemaVersion:1,version:1,ultimoEventoId:'criarCartao__op-1',createdAt:100,updatedAt:100}
it('normaliza somente campos previstos e aceita identidades distintas com nomes iguais',()=>{
 expect(validarComandoCartao({...novoCartao,payload:{...novoCartao.payload,nome:' Cartão '}})).toMatchObject({ok:true,valor:{payload:{nome:'Cartão'}}})
 expect(planejarCartao(novoCartao,undefined,holder,'A').ok).toBe(true)
 expect(planejarCartao({...novoCartao,alvoId:'card-2'},undefined,holder,'A').ok).toBe(true)
 expect(descreverCartao(novoCartao)).not.toHaveProperty('payload')
 for(const patch of [{nome:''},{banco:'x'.repeat(121)},{diaFechamento:0},{diaVencimento:32},{diaFechamento:10.5},{titularId:'../other'},{cvv:'123'},{numeroCompleto:'fixture'},{password:'fixture'}])expect(validarComandoCartao({...novoCartao,payload:{...novoCartao.payload,...patch}}).ok).toBe(false)
 expect(validarComandoCartao({...novoCartao,uid:'B'}).ok).toBe(false)
})
it('valida vínculo no mesmo UID e conserva titular histórico somente no mesmo papel',()=>{
 expect(planejarCartao(novoCartao,undefined,{...holder,estado:'arquivado'},'A')).toMatchObject({ok:false,erro:{codigo:'referenciaInvalida'}})
 expect(planejarCartao(novoCartao,undefined,{...holder,uid:'B'},'A').ok).toBe(false)
 expect(planejarCartao(novoCartao,undefined,undefined,'A').ok).toBe(false)
 const clean:ComandoCartao={...novoCartao,tipo:'editarCartao',expectedVersion:1,payload:{...novoCartao.payload,nome:'Novo'}}
 expect(planejarCartao(clean,saved,{...holder,estado:'arquivado'},'A')).toMatchObject({ok:true,valor:{dados:{nome:'Novo'},semAlteracao:false}})
 expect(planejarCartao({...clean,expectedVersion:2},saved,holder,'A')).toMatchObject({ok:false,erro:{codigo:'conflitoVersao'}})
 expect(planejarCartao({...clean,payload:{...novoCartao.payload,titularId:'another'}},saved,{...holder,id:'another',estado:'arquivado'},'A').ok).toBe(false)
 expect(planejarCartao({...novoCartao,tipo:'editarCartao',expectedVersion:1},saved,holder,'A')).toMatchObject({ok:true,valor:{semAlteracao:true}})
})
it('arquiva preservando conteúdo, não exige titular e recusa edição/reativação embutida',()=>{
 const command={contractVersion:1,tipo:'arquivarCartao',operationKey:'archive',alvoId:saved.id,expectedVersion:1,payload:{}}
 expect(planejarCartao(command,saved,undefined,'A')).toMatchObject({ok:true,valor:{semAlteracao:false,dados:{...novoCartao.payload,estado:'arquivado'}}})
 expect(planejarCartao(command,{...saved,estado:'arquivado'},undefined,'A')).toMatchObject({ok:true,valor:{semAlteracao:true}})
 expect(planejarCartao({...command,payload:{nome:'Alterado'}},saved,undefined,'A').ok).toBe(false)
 expect(planejarCartao({...novoCartao,tipo:'editarCartao',expectedVersion:1},{...saved,estado:'arquivado'},holder,'A').ok).toBe(false)
})
