import { descritorExternoValido } from '../../domain/finance/externos'
import { conteudoExternoIgual } from '../../domain/finance/externosValidation'
import type { ComandoExterno, DescritorExterno } from '../../domain/finance/contracts/externos'
export const chaveExterna='lilica-externo-pendente'
export function lerDescritorExterno(raw:string|null,uid:string):DescritorExterno|undefined {
 try {const value:unknown=JSON.parse(raw??'null');return descritorExternoValido(value)&&(value as DescritorExterno).uid===uid?value as DescritorExterno:undefined}catch{return undefined}
}
export class IntencaoExterna {
 private busy=false
 private current:ComandoExterno|undefined
 readonly uid:string
 constructor(uid:string){this.uid=uid}
 iniciar(command:ComandoExterno):DescritorExterno|undefined {
  if(this.busy||this.current&&!conteudoExternoIgual(this.current,command))return undefined
  this.busy=true;this.current=structuredClone(command)
  const {tipo,operationKey,origemId,expectedVersion,contractVersion}=command
  return {uid:this.uid,tipo,operationKey,origemId,expectedVersion,contractVersion}
 }
 comando(){return this.current?structuredClone(this.current):undefined}
 finalizarEnvio(){this.busy=false}
 encerrar(){this.current=undefined;this.busy=false}
}
