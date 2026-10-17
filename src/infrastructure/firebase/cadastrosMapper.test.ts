import { expect, it } from 'vitest'
import { decodeCadastro } from './cadastrosMapper'
import { Timestamp } from 'firebase/firestore'
const at=Timestamp.fromMillis(100)
const d={nome:'Livre',estado:'ativo',schemaVersion:1,version:1,createdAt:at,updatedAt:at}
it('decodifica sem permitir campo extra ou esquema presumido',()=>{
 expect(decodeCadastro('A','titulares','id',d).dados.nome).toBe('Livre')
 for(const patch of [{ownerUid:'B'},{version:1.5},{schemaVersion:2},{nome:null},{updatedAt:100},{archivedAt:at}]) expect(()=>decodeCadastro('A','titulares','id',{...d,...patch})).toThrow()
})
