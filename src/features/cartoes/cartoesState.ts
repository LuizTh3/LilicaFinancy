import { descritorCartaoValido } from '../../domain/finance/cartoes'
import { registro } from '../../domain/finance/errors'
import type { DescritorCartao } from '../../domain/finance/contracts/cartoes'
import type { DescritorFatura } from '../../domain/finance/contracts/faturas'
import { descritorFaturaValido } from '../../domain/finance/faturas'
export const chaveCartaoPendente='lilica-cartoes-faturas-pendente'
export function lerIntencaoPendente(raw:string|null,uid:string):DescritorCartao|DescritorFatura|undefined {
 try{const v:unknown=JSON.parse(raw??'null');return registro(v)&&Object.keys(v).length===2&&v.uid===uid&&(descritorCartaoValido(v.descritor)||descritorFaturaValido(v.descritor))?v.descritor:undefined}catch{return undefined}
}
export function lerCartaoPendente(raw:string|null,uid:string):DescritorCartao|undefined {
 try{const v:unknown=JSON.parse(raw??'null');return registro(v)&&Object.keys(v).length===2&&v.uid===uid&&descritorCartaoValido(v.descritor)?v.descritor:undefined}catch{return undefined}
}
export class CartoesRequestScope {
 private generation=0
 private busy=false
 readonly uid:string
 constructor(uid:string){this.uid=uid}
 begin(){if(this.busy)return undefined;this.busy=true;return this.generation}
 valid(ticket:number,uid:string){return ticket===this.generation&&uid===this.uid}
 finish(ticket:number){if(ticket===this.generation)this.busy=false}
 clear(){this.generation++;this.busy=false}
}
