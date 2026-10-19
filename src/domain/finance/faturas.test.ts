import { expect, it } from 'vitest'
import { construirFatura, cicloFatura, planejarConfirmacaoFatura, planejarAjusteVencimento, resolverPrimeiraFatura, validarComandoFatura } from './faturas'
import type { Cartao } from './contracts/cartoes'
import type { Fatura } from './contracts/faturas'
export const cartaoTeste:Cartao={uid:'A',id:'card',banco:'Banco',nome:'Nome',titularId:'holder',diaFechamento:10,diaVencimento:17,estado:'ativo',schemaVersion:1,version:1,ultimoEventoId:'criarCartao__key',createdAt:1,updatedAt:1}
function snapshot(c:Cartao,month:string,neighbors:readonly Fatura[]=[]):Fatura {const out=construirFatura(c,month,neighbors);if(!out.ok)throw Error(out.erro.codigo);return {...out.valor,uid:'A',id:`card__${month}`,cartaoId:'card',schemaVersion:1,versaoConteudo:1,version:1,ultimoEventoId:'confirmarFatura__key',createdAt:1,updatedAt:1}}
it('usa limites de vizinhos preexistentes e preserva datas após mudar o cartão',()=>{
 const october=snapshot(cartaoTeste,'2026-10')
 const changed={...cartaoTeste,version:2,diaFechamento:12}
 expect(construirFatura(changed,'2026-11',[october])).toMatchObject({ok:true,valor:{inicio:'2026-10-10',fechamento:'2026-11-12',calendarioOrigem:{origemInicio:'vizinhoConfirmado'}}})
 expect(october.fechamento).toBe('2026-10-10')
 expect(construirFatura(changed,'2026-11')).toMatchObject({ok:true,valor:{inicio:'2026-10-12',calendarioOrigem:{origemInicio:'padrao'}}})
 expect(cicloFatura(october,'2026-10-09')).toMatchObject({ok:true,valor:'aberta'})
 expect(cicloFatura(october,'2026-10-10')).toMatchObject({ok:true,valor:'fechada'})
})
it('rejeita sobreposição de distância dois nas duas ordens, mesmo com datas individualmente válidas',()=>{
 const a={...cartaoTeste,diaFechamento:30,diaVencimento:31},b={...cartaoTeste,version:2,diaFechamento:25,diaVencimento:5}
 const october=snapshot(a,'2026-10'),december=snapshot(b,'2026-12')
 expect(december).toMatchObject({inicio:'2026-10-25',fechamento:'2026-11-25',vencimento:'2026-12-05'})
 expect(construirFatura(b,'2026-12',[october])).toMatchObject({ok:false})
 expect(construirFatura(a,'2026-10',[december])).toMatchObject({ok:false})
})
it('confirma calendário exato, recusa origem circular, revisão antiga e devolve existente sem efeito',()=>{
 const f=snapshot(cartaoTeste,'2026-10'),{competencia,inicio,fechamento,vencimento,calendarioOrigem}=f
 const c={contractVersion:1,tipo:'confirmarFatura',operationKey:'intent',alvoId:f.id,expectedVersion:0,payload:{cartaoId:'card',cartaoVersion:1,competencia,inicio,fechamento,vencimento,calendarioOrigem}}
 expect(planejarConfirmacaoFatura(c,cartaoTeste,undefined,[])).toMatchObject({ok:true,valor:{estado:'novo'}})
 expect(planejarConfirmacaoFatura(c,cartaoTeste,f,[])).toMatchObject({ok:true,valor:{estado:'existente'}})
 expect(planejarConfirmacaoFatura({...c,payload:{...c.payload,calendarioOrigem:{...calendarioOrigem,origemFechamento:'vizinhoConfirmado'}}},cartaoTeste,undefined,[])).toMatchObject({ok:false})
 expect(planejarConfirmacaoFatura(c,{...cartaoTeste,version:2},undefined,[])).toMatchObject({ok:false,erro:{codigo:'conflitoVersao'}})
 expect(validarComandoFatura({...c,payload:{...c.payload,total:0}})).toMatchObject({ok:false})
})
it('compra no fechamento entra na próxima; escolha explícita distante prevalece sem escrita',()=>{
 expect(resolverPrimeiraFatura(cartaoTeste,'2026-10-09',[])).toMatchObject({ok:true,valor:{estado:'sugestao',calendario:{competencia:'2026-10'}}})
 expect(resolverPrimeiraFatura(cartaoTeste,'2026-10-10',[])).toMatchObject({ok:true,valor:{estado:'sugestao',calendario:{competencia:'2026-11'}}})
 expect(resolverPrimeiraFatura(cartaoTeste,'2026-10-10',[],'2027-01')).toMatchObject({ok:true,valor:{estado:'escolhaExplicita',calendario:{competencia:'2027-01'}}})
 expect(resolverPrimeiraFatura({...cartaoTeste,estado:'arquivado'},'2026-10-10',[])).toMatchObject({ok:false})
 const feb={...cartaoTeste,diaFechamento:30,diaVencimento:31}
 expect(resolverPrimeiraFatura(feb,'2027-02-28',[])).toMatchObject({ok:true,valor:{calendario:{competencia:'2027-03'}}})
})
it('ajusta somente vencimento no mês com motivo, preserva snapshot e aceita igualdade apenas comprovada',()=>{
 const f=snapshot(cartaoTeste,'2026-10'),c={contractVersion:1,tipo:'ajustarVencimento',operationKey:'adjust',alvoId:f.id,expectedVersion:1,payload:{vencimento:'2026-10-19',motivo:'Emissor confirmou'}}
 const adjusted=planejarAjusteVencimento(c,f)
 expect(adjusted).toMatchObject({ok:true,valor:{dados:{inicio:f.inicio,fechamento:f.fechamento,calendarioOrigem:f.calendarioOrigem,vencimento:'2026-10-19'}}})
 for(const payload of [{vencimento:'2026-11-19',motivo:'X'},{vencimento:'2026-10-10',motivo:'X'},{vencimento:'2026-10-19',motivo:' '}])expect(planejarAjusteVencimento({...c,payload},f).ok).toBe(false)
 expect(planejarAjusteVencimento({...c,payload:{...c.payload,vencimento:f.vencimento}},f)).toMatchObject({ok:true,valor:{semAlteracao:true}})
 expect(planejarAjusteVencimento({...c,payload:{...c.payload,vencimento:'2026-10-18'}},f)).toMatchObject({ok:true,valor:{dados:{vencimento:'2026-10-18'}}}) // Sunday is not shifted.
 const feb=snapshot({...cartaoTeste,diaFechamento:30,diaVencimento:31},'2027-02')
 expect(planejarAjusteVencimento({...c,alvoId:feb.id,payload:{vencimento:'2027-02-28',motivo:'Confirmado'}},feb).ok).toBe(true)
 expect(planejarAjusteVencimento(c,{...f,versaoConteudo:2} as unknown as Fatura).ok).toBe(false)
 expect(planejarAjusteVencimento(c,{...f,itens:[]} as Fatura).ok).toBe(false)
})
it('duas contenções históricas conflitantes e leituras de revisões diferentes falham sem escolha arbitrária',()=>{
 const a=snapshot(cartaoTeste,'2026-10'),b=snapshot({...cartaoTeste,diaFechamento:12},'2026-11')
 expect(resolverPrimeiraFatura(cartaoTeste,'2026-10-10',[a,{...a,version:2}])).toMatchObject({ok:false,erro:{codigo:'integridadeIndeterminada'}})
 const overlapping={...b,inicio:'2026-09-12' as typeof b.inicio,calendarioOrigem:{...b.calendarioOrigem,origemInicio:'vizinhoConfirmado' as const}}
 expect(resolverPrimeiraFatura(cartaoTeste,'2026-10-09',[a,overlapping])).toMatchObject({ok:true,valor:{estado:'conflito'}})
})
