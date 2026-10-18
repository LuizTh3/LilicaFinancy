import { hojeNoFuso } from '../../domain/finance/calendar'
import { formatarBRL } from '../../domain/finance/money'
export const brl=(n:number)=>{const r=formatarBRL(n);return r.ok?r.valor:'Valor fora do limite'}
export function diaAtualExterno(timezone:string){const r=hojeNoFuso(Date.now(),timezone);return r.ok?r.valor:''}
