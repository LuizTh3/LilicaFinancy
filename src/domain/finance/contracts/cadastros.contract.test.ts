import { expect, it } from 'vitest'
import { planejarCadastro, conteudoIgual, descrever, descritorValido } from '../cadastros'
import type { ComandoCadastro } from './cadastros'
it('transição finita de arquivo preserva conteúdo e não muda estado de outra entidade',()=>{
 const before={nome:'Pessoa',estado:'ativo' as const}
 const next=planejarCadastro('titulares',before,{nome:'Tentativa',estado:'arquivado'},'arquivar',false)
 expect(next).toEqual({ok:true,valor:{...before,estado:'arquivado'}})
 expect(before.estado).toBe('ativo')
 expect(planejarCadastro('titulares',{...before,estado:'arquivado'},before,'editar',false).ok).toBe(false)
 expect(conteudoIgual(before,{estado:'ativo',nome:'Pessoa'})).toBe(true)
})
it('descritor é determinístico e fecha coleção, chave e versão',()=>{
 const c:ComandoCadastro={contractVersion:1,tipo:'criar',colecao:'etiquetas',cadastroId:'id',operationKey:'op',expectedVersion:0,dados:{nome:'Livre',estado:'ativo'}}
 const d=descrever(c);expect(descritorValido(d)).toBe(true)
 expect(descritorValido({...d,reciboId:'contas__id__1'})).toBe(false)
})
