import { expect, it } from 'vitest'
import { renderToStaticMarkup } from 'react-dom/server'
import { calendarioBaseFatura } from '../../domain/finance/invoiceCalendar'
import { descreverFatura } from '../../domain/finance/faturas'
import { comandoConfirmar, lerFaturaPendente, rotaIntencao } from './faturasState'
import { lerIntencaoPendente, lerCartaoPendente } from './cartoesState'
import { FaturaSummary } from './FaturaSummary'
import { PrimeiraFaturaPreview } from './PrimeiraFaturaPreview'
it('retomada compartilha descritor fechado sem confundir cartão e fatura ou trocar UID',()=>{
 const d={contractVersion:1,tipo:'confirmarFatura',operationKey:'key',alvoId:'card__2026-10',expectedVersion:0},raw=JSON.stringify({uid:'A',descritor:d})
 expect(lerFaturaPendente(raw,'A')).toEqual(d)
 expect(lerIntencaoPendente(raw,'A')).toEqual(d)
 expect(lerCartaoPendente(raw,'A')).toBeUndefined()
 expect(lerFaturaPendente(raw,'B')).toBeUndefined()
 expect(lerFaturaPendente(JSON.stringify({uid:'A',descritor:{...d,payload:{}}}),'A')).toBeUndefined()
 expect(rotaIntencao(d)).toBe('/app/cartoes/card/faturas/2026-10')
})
it('calendário vazio distingue ciclo de pagamento, confirmação de prévia e não oferece pagar',()=>{
 const r=calendarioBaseFatura('2026-10',10,17);if(!r.ok)throw Error('fixture')
 const html=renderToStaticMarkup(<FaturaSummary calendario={r.valor} hoje="2026-10-10" confirmada/>)
 expect(html).toContain('fechada');expect(html).toContain('Sem pagamento registrado');expect(html).toContain('R$ 0,00');expect(html).not.toContain('<button')
 const draft=renderToStaticMarkup(<FaturaSummary calendario={r.valor} hoje="2026-10-09" confirmada={false}/>);expect(draft).toContain('Prévia');expect(draft).toContain('aberta')
})
it('prévia explica convenção e correção; arquivado não apresenta formulário de nova compra',()=>{
 const props={cartaoId:'card',hoje:'2026-10-10',porta:{prever:async()=>({ok:false as const,erro:{codigo:'indisponivel' as const,mensagem:'fixture'}})}}
 const active=renderToStaticMarkup(<PrimeiraFaturaPreview {...props} arquivado={false}/>),archived=renderToStaticMarkup(<PrimeiraFaturaPreview {...props} arquivado/>)
 expect(active).toContain('fatura seguinte');expect(active).toContain('pode corrigir');expect(active).not.toContain('Registrar compra')
 expect(archived).not.toContain('<form')
})
it('confirmação fixa revisão e calendário mostrados, sem incluir proprietário no comando',()=>{
 const r=calendarioBaseFatura('2026-10',10,17);if(!r.ok)throw Error('fixture')
 const c=comandoConfirmar({id:'card',uid:'A',schemaVersion:1,version:1,estado:'ativo',nome:'Nome',banco:'Banco',titularId:'holder',diaFechamento:10,diaVencimento:17,ultimoEventoId:'criarCartao__key',createdAt:1,updatedAt:1},r.valor,'stable')
 expect(c).toMatchObject({alvoId:'card__2026-10',operationKey:'stable',payload:{cartaoVersion:1,fechamento:'2026-10-10'}})
 expect(c).not.toHaveProperty('uid');expect(descreverFatura(c)).not.toHaveProperty('payload')
})
