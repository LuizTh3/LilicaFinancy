import { expect, it } from 'vitest'
import { CadastroRequestScope, lerPendente } from './cadastroState'
it('respostas de geração anterior são descartadas e envio duplicado é bloqueado',()=>{
 const s=new CadastroRequestScope('A'); const ticket=s.begin()
 expect(s.begin()).toBeUndefined();expect(s.valid(ticket!,'A')).toBe(true)
 s.clear();expect(s.valid(ticket!,'A')).toBe(false)
})
it('descritor corrompido ou de outro UID não vira comando',()=>{
 expect(lerPendente('{bad','A')).toBeUndefined()
 expect(lerPendente(JSON.stringify({uid:'B'}),'A')).toBeUndefined()
})
it('mantém o envio atual ocupado ao chegar conclusão de geração anterior',()=>{
 const s=new CadastroRequestScope('A'),old=s.begin()!;s.clear();const current=s.begin()!
 s.finish(old);expect(s.begin()).toBeUndefined();expect(s.valid(current,'B')).toBe(false)
 s.finish(current);expect(s.begin()).toBe(current)
})
it('retém somente descritor válido do mesmo UID, sem conteúdo de formulário',()=>{
 const d={operationKey:'op',colecao:'contas',cadastroId:'id',tipo:'criar',expectedVersion:0,reciboId:'contas__id__1'}
 expect(lerPendente(JSON.stringify({uid:'A',descritor:d}),'A')?.descritor).toEqual(d)
 expect(lerPendente(JSON.stringify({uid:'A',descritor:{...d,dados:{nome:'Não permitido'}}}),'A')).toBeUndefined()
})
