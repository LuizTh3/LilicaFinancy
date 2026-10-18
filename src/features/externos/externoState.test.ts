import { expect, it } from 'vitest'
import { IntencaoExterna, lerDescritorExterno } from './externoState'
const command={contractVersion:1 as const,tipo:'criarReceita' as const,operationKey:'key-1',origemId:'origin-1',expectedVersion:0,dados:{natureza:'receita' as const,descricao:'Salário privado',categoriaId:'cat-1',valorCentavos:100,estimado:false,competenciaPlanejamento:'2026-10',dataPrevista:'2026-10-01'}}
it('impede duplo envio e persiste somente o descritor da sessão correta',()=>{
 const intent=new IntencaoExterna('A'),first=intent.iniciar(command)
 expect(first).toBeDefined();expect(intent.iniciar(command)).toBeUndefined()
 expect(JSON.stringify(first)).not.toContain('Salário privado');expect(first).not.toHaveProperty('dados')
 expect(lerDescritorExterno(JSON.stringify(first),'B')).toBeUndefined()
 expect(lerDescritorExterno(JSON.stringify({...first,dados:command.dados}),'A')).toBeUndefined()
 intent.finalizarEnvio();expect(intent.comando()).toEqual(command)
 intent.encerrar();expect(intent.comando()).toBeUndefined()
})
it('não altera o conteúdo de uma intenção após uma falha sem encerrá-la',()=>{
 const intent=new IntencaoExterna('A');intent.iniciar(command);intent.finalizarEnvio()
 expect(intent.iniciar({...command,dados:{...command.dados,valorCentavos:200}})).toBeUndefined()
 expect(intent.iniciar(command)).toBeDefined()
 intent.encerrar();expect(intent.iniciar({...command,operationKey:'key-2'})).toBeDefined()
})
