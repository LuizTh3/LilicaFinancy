import { expect, it, vi } from 'vitest'
import { financeTimezone, clearPrivateIntents } from './financeSession'
it('fuso vem do perfil válido, sem fallback silencioso ao navegador',()=>{
 expect(financeTimezone('America/Rio_Branco')).toBe('America/Rio_Branco')
 for(const value of [undefined,'', 'invalid', 'UTC']) expect(()=>financeTimezone(value)).toThrow()
})
it('invalidação remove apenas os dois descritores privados e suporta storage indisponível',()=>{
 const removeItem=vi.fn()
 clearPrivateIntents({removeItem})
 expect(removeItem.mock.calls).toEqual([['lilica-cadastro-pendente'],['lilica-externo-pendente']])
 expect(()=>clearPrivateIntents({removeItem:()=>{throw Error('unavailable')}})).not.toThrow()
})
