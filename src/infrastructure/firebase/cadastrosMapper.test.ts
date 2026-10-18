import { expect, it } from 'vitest'
import { decodeCadastro } from './cadastrosMapper'
import { Timestamp } from 'firebase/firestore'
const at=Timestamp.fromMillis(100)
const d={nome:'Livre',estado:'ativo',schemaVersion:1,version:1,createdAt:at,updatedAt:at}
it('decodifica sem permitir campo extra ou esquema presumido',()=>{
 expect(decodeCadastro('A','titulares','id',d).dados.nome).toBe('Livre')
 for(const patch of [{ownerUid:'B'},{version:1.5},{schemaVersion:2},{nome:null},{updatedAt:100},{archivedAt:at}]) expect(()=>decodeCadastro('A','titulares','id',{...d,...patch})).toThrow()
})
it('schema2 é restrito a categoria/conta e preserva metadado de primeiro uso fora dos campos editáveis',()=>{
 const use={eventoId:'criarDespesa__key-1',origemId:'origin-1',papel:'classificacao',createdAt:at}
 const category={...d,natureza:'despesa',schemaVersion:2,usoFinanceiro:use}
 expect(decodeCadastro('A','categorias','id',category)).toMatchObject({schemaVersion:2,usoFinanceiro:{...use,createdAt:100},dados:{nome:'Livre',estado:'ativo',natureza:'despesa'}})
 expect(decodeCadastro('A','categorias','id',{...d,natureza:'despesa'}).schemaVersion).toBe(1)
 for(const patch of [{schemaVersion:1},{usoFinanceiro:{...use,papel:'movimentacao'}},{usoFinanceiro:{...use,eventoId:'pagar__key-1'}},{usoFinanceiro:{...use,ownerUid:'B'}},{usoFinanceiro:{...use,createdAt:100}},{usoFinanceiro:{...use,origemId:'../escape'}}]) expect(()=>decodeCadastro('A','categorias','id',{...category,...patch})).toThrow()
 expect(()=>decodeCadastro('A','etiquetas','id',{...d,schemaVersion:2})).toThrow()
 const account={...d,tipo:'carteira',schemaVersion:2,usoFinanceiro:{...use,eventoId:'pagar__key-1',papel:'movimentacao'}}
 expect(decodeCadastro('A','contas','id',account).usoFinanceiro?.papel).toBe('movimentacao')
})
