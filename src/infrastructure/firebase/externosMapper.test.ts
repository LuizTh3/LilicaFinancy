import { expect, it } from 'vitest'
import { Timestamp } from 'firebase/firestore'
import { decodeOrigemExterna, decodeEventoExterno, decodeMarcadorExterno } from './externosMapper'

const at = Timestamp.fromMillis(100)
const dados = { natureza:'despesa', descricao:'Internet', categoriaId:'cat-1', valorCentavos:10000, estimado:false, competenciaPlanejamento:'2026-10', vencimento:'2026-11-10', dataConsumo:'2026-10-18' }
const origem = { ...dados, schemaVersion:1, version:1, createdAt:at, updatedAt:at, estadoObrigacao:'ativa', liquidadoLiquidoCentavos:0, jaLiquidada:false, ultimoEventoId:'criarDespesa__key-1' }
const comando = { contractVersion:1, tipo:'criarDespesa', operationKey:'key-1', origemId:'origin-1', expectedVersion:0, dados }
const evento = { schemaVersion:1, contractVersion:1, tipo:'criarDespesa', operationKey:'key-1', origemId:'origin-1', natureza:'despesa', expectedVersion:0, resultVersion:1, comando, depois:dados, createdAt:at }
it('decodifica datas independentes sem aceitar campos extras, esquema ou projeção impossíveis', () => {
 expect(decodeOrigemExterna('A','origin-1',origem)).toMatchObject({ ...dados, id:'origin-1', uid:'A', createdAt:100 })
 for (const patch of [{ownerUid:'B'}, {schemaVersion:2}, {valorCentavos:0}, {valorCentavos:1.1}, {version:1.5}, {dataConsumo:undefined}, {dataConsumo:'2026-02-30'}, {liquidadoLiquidoCentavos:10001}, {liquidadoLiquidoCentavos:1}, {jaLiquidada:true}, {dataPrevista:'2026-10-18'}, {createdAt:100}]) {
  expect(() => decodeOrigemExterna('A','origin-1',{...origem,...patch})).toThrow()
 }
})
it('recusa evento incompatível com caminho, comando, natureza ou fato', () => {
 expect(decodeEventoExterno('A','criarDespesa__key-1',evento)).toMatchObject({id:'criarDespesa__key-1',comando})
 for (const patch of [{ownerUid:'A'}, {resultVersion:2}, {tipo:'pagar'}, {natureza:'receita'}, {fato:{tipo:'pagamento',valorCentavos:10000,contaId:'account-1',dataEfetiva:'2026-10-18'}}, {depois:{...dados,valorCentavos:20000}}, {comando:{...comando,operationKey:'other'}}]) {
  expect(() => decodeEventoExterno('A','criarDespesa__key-1',{...evento,...patch})).toThrow()
 }
 expect(() => decodeEventoExterno('A','criarDespesa__other',evento)).toThrow()
})
it('marcador possui identidade natural e somente inversão permitida', () => {
 const marker = {schemaVersion:1,origemId:'origin-1',originalId:'pagar__key-1',reversaoEventoId:'reverterPagamento__key-2',createdAt:at}
 expect(decodeMarcadorExterno('A','pagar__key-1',marker).originalId).toBe('pagar__key-1')
 expect(() => decodeMarcadorExterno('A','pagar__key-1',{...marker,originalId:'pagar__other'})).toThrow()
 expect(() => decodeMarcadorExterno('A','pagar__key-1',{...marker,reversaoEventoId:'reverterRecebimento__key-2'})).toThrow()
})
