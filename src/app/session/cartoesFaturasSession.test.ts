import { expect, it, vi } from 'vitest'
import { clearPrivateIntents } from './financeSession'
it('limpa o descritor006 mesmo se o storage falhar em outra chave',()=>{
 const removeItem=vi.fn((key:string)=>{if(key==='lilica-cadastro-pendente')throw Error('unavailable')})
 clearPrivateIntents({removeItem})
 expect(removeItem).toHaveBeenCalledWith('lilica-cartoes-faturas-pendente')
})
