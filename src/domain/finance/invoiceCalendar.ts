import { avancarCompetencia, competencia, competenciaDaData, dataCalendario, dataNaCompetencia } from './calendar'
import type { Competencia, DataCalendario } from './calendar'
import { camposPermitidos, falha, registro, sucesso, versaoValida } from './errors'
import type { Resultado } from './errors'

type DatasFatura = Readonly<{competencia:Competencia;fechamento:DataCalendario;vencimento:DataCalendario}>
export type OrigemCalendario = Readonly<{calendarVersion:2;cartaoVersion:number;diaFechamento:number;diaVencimento:number;vencimentoOriginal:DataCalendario;origemInicio:'padrao'|'vizinhoConfirmado';origemFechamento:'padrao'|'vizinhoConfirmado'}>
export type CalendarioFaturaV2 = DatasFatura & Readonly<{inicio:DataCalendario;calendarioOrigem:OrigemCalendario}>
export type CalendarioFaturaLegado = DatasFatura & Readonly<{inicio?:never;calendarioOrigem?:never}>
export type CalendarioFatura = CalendarioFaturaLegado|CalendarioFaturaV2
const erro = () => falha('referenciaInvalida','O calendário da fatura é inconsistente.')

/** Calendar version2 compares nominal anchors before clamping; no stored history is inferred. */
export function calendarioBaseFatura(periodo:unknown,diaFechamento:unknown,diaVencimento:unknown,cartaoVersion=1):Resultado<CalendarioFaturaV2> {
 const month=competencia(periodo)
 if(!month.ok)return month
 if(!versaoValida(cartaoVersion)||!Number.isInteger(diaFechamento)||!Number.isInteger(diaVencimento))return erro()
 const closeMonth=avancarCompetencia(month.valor,(diaFechamento as number)<(diaVencimento as number)?0:-1)
 if(!closeMonth.ok)return closeMonth
 const startMonth=avancarCompetencia(closeMonth.valor,-1)
 if(!startMonth.ok)return startMonth
 const start=dataNaCompetencia(startMonth.valor,diaFechamento),close=dataNaCompetencia(closeMonth.valor,diaFechamento),due=dataNaCompetencia(month.valor,diaVencimento)
 if(!start.ok)return start
 if(!close.ok)return close
 if(!due.ok)return due
 return sucesso({competencia:month.valor,inicio:start.valor,fechamento:close.valor,vencimento:due.valor,calendarioOrigem:{calendarVersion:2,cartaoVersion,diaFechamento:diaFechamento as number,diaVencimento:diaVencimento as number,vencimentoOriginal:due.valor,origemInicio:'padrao',origemFechamento:'padrao'}})
}
export function validarCalendarioFatura(value:unknown):Resultado<CalendarioFatura> {
 if(!registro(value))return erro()
 const period=competencia(value.competencia),close=dataCalendario(value.fechamento),due=dataCalendario(value.vencimento)
 if(!period.ok)return period
 if(!close.ok)return close
 if(!due.ok)return due
 if(due.valor.slice(0,7)!==period.valor||close.valor>due.valor)return erro()
 const basic={competencia:period.valor,fechamento:close.valor,vencimento:due.valor}
 if(!('inicio' in value)&&!('calendarioOrigem' in value))return close.valor<due.valor?sucesso(basic):erro()
 const start=dataCalendario(value.inicio),m=value.calendarioOrigem
 if(!start.ok||!registro(m)||!camposPermitidos(m,['calendarVersion','cartaoVersion','diaFechamento','diaVencimento','vencimentoOriginal','origemInicio','origemFechamento'])||m.calendarVersion!==2||!versaoValida(m.cartaoVersion)||!['padrao','vizinhoConfirmado'].includes(m.origemInicio as string)||!['padrao','vizinhoConfirmado'].includes(m.origemFechamento as string))return erro()
 const base=calendarioBaseFatura(period.valor,m.diaFechamento,m.diaVencimento,m.cartaoVersion)
 if(!base.ok)return base
 if(m.vencimentoOriginal!==base.valor.vencimento||start.valor>=close.valor)return erro()
 const previous=avancarCompetencia(period.valor,-1),previous2=avancarCompetencia(period.valor,-2)
 if(!previous.ok)return previous
 const startMonths=[previous.valor,...(previous2.ok?[previous2.valor]:[])]
 if(!startMonths.includes(start.valor.slice(0,7) as Competencia)||![period.valor,previous.valor].includes(close.valor.slice(0,7) as Competencia))return erro()
 if(m.origemInicio==='padrao'&&start.valor!==base.valor.inicio)return erro()
 if(m.origemFechamento==='padrao'&&close.valor!==base.valor.fechamento)return erro()
 if(close.valor===due.valor&&!(base.valor.calendarioOrigem.diaFechamento<base.valor.calendarioOrigem.diaVencimento&&base.valor.fechamento===due.valor&&base.valor.vencimento===due.valor))return erro()
 return sucesso({...basic,inicio:start.valor,calendarioOrigem:{...base.valor.calendarioOrigem,origemInicio:m.origemInicio as OrigemCalendario['origemInicio'],origemFechamento:m.origemFechamento as OrigemCalendario['origemFechamento']}})
}
export function sugerirPrimeiraFatura(dataConsumo:unknown,calendario:unknown,primeiraFatura?:unknown):Resultado<CalendarioFatura & {readonly origem:'confirmada'|'sugestao'}> {
 const date=dataCalendario(dataConsumo)
 if(!date.ok)return date
 if(primeiraFatura!==undefined){const explicit=validarCalendarioFatura(primeiraFatura);return explicit.ok?sucesso({...explicit.valor,origem:'confirmada'}):explicit}
 if(!registro(calendario))return erro()
 const month=competenciaDaData(date.valor)
 if(!month.ok)return month
 const close=dataNaCompetencia(month.valor,calendario.diaFechamento)
 if(!close.ok)return close
 const nominalSameMonth=typeof calendario.diaFechamento==='number'&&typeof calendario.diaVencimento==='number'&&calendario.diaFechamento<calendario.diaVencimento
 const offset=(date.valor>=close.valor?1:0)+(nominalSameMonth?0:1)
 const period=avancarCompetencia(month.valor,offset)
 if(!period.ok)return period
 const proposed=calendarioBaseFatura(period.valor,calendario.diaFechamento,calendario.diaVencimento,typeof calendario.version==='number'?calendario.version:1)
 return proposed.ok?sucesso({...proposed.valor,origem:'sugestao'}):proposed
}
