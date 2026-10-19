import { expect, it } from 'vitest'
import { calendarioBaseFatura } from '../invoiceCalendar'
import { descreverFatura, validarComandoFatura, eventoFaturaId } from '../faturas'
it('comando fechado conserva identidade natural e rejeita proprietário/conteúdo extra',()=>{
 const b=calendarioBaseFatura('2027-01',25,5);if(!b.ok)throw Error('fixture')
 const c={contractVersion:1,tipo:'confirmarFatura',operationKey:'key',alvoId:'card__2027-01',expectedVersion:0,payload:{...b.valor,cartaoId:'card',cartaoVersion:1}}
 const valid=validarComandoFatura(c);expect(valid.ok).toBe(true)
 if(!valid.ok)return
 expect(eventoFaturaId(descreverFatura(valid.valor))).toBe('confirmarFatura__key')
 expect(descreverFatura(valid.valor)).not.toHaveProperty('payload')
 for(const patch of [{uid:'B'},{alvoId:'random'},{expectedVersion:1},{payload:{...c.payload,cartaoVersion:2}}])expect(validarComandoFatura({...c,...patch}).ok).toBe(false)
})
