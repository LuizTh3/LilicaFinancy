import { descritorValido } from '../../domain/finance/cadastros'
import { registro } from '../../domain/finance/errors'
import type { DescritorCadastro } from '../../domain/finance/contracts/cadastros'
export class CadastroRequestScope {
 private generation=0
 private busy=false
 readonly uid:string
 constructor(uid:string){this.uid=uid}
 begin(){if(this.busy)return undefined;this.busy=true;return this.generation}
 valid(ticket:number,uid:string){return ticket===this.generation&&uid===this.uid}
 finish(ticket:number){if(ticket===this.generation)this.busy=false}
 clear(){this.generation++;this.busy=false}
}
export type PendenteCadastro={uid:string;descritor:DescritorCadastro}
export const chavePendente='lilica-cadastro-pendente'
export function lerPendente(raw:string|null,uid:string):PendenteCadastro|undefined {
 try{const d:unknown=JSON.parse(raw??'null');return registro(d)&&Object.keys(d).length===2&&d.uid===uid&&descritorValido(d.descritor)?{uid,descritor:d.descritor}:undefined}catch{return undefined}
}
