import { camposPermitidos, falha, registro, sucesso } from '../../domain/finance/errors'
import { competencia, dataCalendario } from '../../domain/finance/calendar'
import { idCadastroValido } from '../../domain/finance/cadastros'
import { conteudoExternoIgual } from '../../domain/finance/externosValidation'
import type { ConsultaExterna, CursorExterno, LinhaExterna, NaturezaExterna, OrigemExterna, PortaExternos } from '../../domain/finance/contracts/externos'
import { decodeEventoExterno, decodeOrigemExterna } from './externosMapper'
import { decodeCadastro } from './cadastrosMapper'
import type { Colecao } from '../../domain/finance/contracts/cadastros'
import type { createExternosSnapshotReader } from './externosSnapshotReader'

const date=(o:OrigemExterna)=>o.natureza==='receita'?o.dataPrevista:o.vencimento
const order=(a:OrigemExterna,b:OrigemExterna)=>date(a)<date(b)?-1:date(a)>date(b)?1:a.id<b.id?-1:a.id>b.id?1:0
function error(e:unknown){
 const code=(e as {code?:string})?.code
 return falha(code==='semPermissao'?'semPermissao':code==='configuracaoPendente'?'configuracaoPendente':code==='cotaExcedida'?'cotaExcedida':code==='schema'?'esquemaIncompativel':'integridadeIndeterminada',code==='snapshotExpirado'?'A consulta expirou. Atualize para iniciar outra consulta.':code==='configuracaoPendente'?'O banco precisa dos índices desta consulta.':'Não foi possível completar a consulta. Atualize antes de considerar os totais.',{recuperacao:'reler'})
}
function line(origem:OrigemExterna):LinhaExterna {
 const canceled=origem.estadoObrigacao==='cancelada'
 return {origem,exigivelCentavos:canceled?0:origem.valorCentavos,liquidadoCentavos:origem.liquidadoLiquidoCentavos,pendenteCentavos:canceled?0:origem.valorCentavos-origem.liquidadoLiquidoCentavos,situacao:canceled?'cancelada':origem.liquidadoLiquidoCentavos===0?'pendente':origem.liquidadoLiquidoCentavos===origem.valorCentavos?'liquidada':'parcial'}
}
function validQuery(q:ConsultaExterna) {
 return registro(q)&&camposPermitidos(q,['base','competencia','filtro','pageSize'])&&q.base==='planejamento'&&competencia(q.competencia).ok&&Number.isInteger(q.pageSize)&&q.pageSize>=1&&q.pageSize<=50&&registro(q.filtro)&&camposPermitidos(q.filtro,['natureza','situacao','categoriaId','titularId'])&&['receita','despesa','ambas'].includes(q.filtro.natureza)&&(!('situacao'in q.filtro)||['pendente','parcial','liquidada','cancelada'].includes(String(q.filtro.situacao)))&&(['categoriaId','titularId'] as const).every(key=>!(key in q.filtro)||idCadastroValido(q.filtro[key]))
}
export function createExternosQueries(reader:ReturnType<typeof createExternosSnapshotReader>,ctx:{uid:string;generation:number;atual:()=>boolean}):Pick<PortaExternos,'listar'|'detalhe'> {
 const check=()=>{if(!ctx.atual())throw Object.assign(Error('SESSION'),{code:'semPermissao'})}
 return {
  async listar(q,cursor) {
   try {
    check();if(!validQuery(q))return falha('valorInvalido','Informe mês, natureza e tamanho de página válidos para planejamento.')
    const sources:NaturezaExterna[]=q.filtro.natureza==='ambas'?['receita','despesa']:[q.filtro.natureza]
    if(cursor&&(!registro(cursor)||!camposPermitidos(cursor,['snapshot','consulta','posicoes'])||!conteudoExternoIgual(cursor.consulta,q)||cursor.snapshot?.uid!==ctx.uid||cursor.snapshot?.generation!==ctx.generation||!registro(cursor.posicoes)||Object.keys(cursor.posicoes).some(k=>!sources.includes(k as NaturezaExterna))))return falha('valorInvalido','O cursor pertence a outra consulta ou sessão. Atualize.')
    const positions:Record<string,readonly string[]>={...cursor?.posicoes}
    for(const source of sources){const pos=positions[source];if(pos&&(!Array.isArray(pos)||!(pos.length===1&&pos[0]==='fim')&&!(pos.length===2&&dataCalendario(pos[0]).ok&&idCadastroValido(pos[1]))))return falha('valorInvalido','Posição de consulta inválida.')}
    if(cursor&&sources.every(s=>positions[s]?.[0]==='fim'))return falha('valorInvalido','A consulta já foi concluída. Atualize.')
    const snapshot=cursor?.snapshot??await reader.iniciar();check()
    const pages=await Promise.all(sources.map(async natureza=>{
     const pos=positions[natureza]
     if(pos?.[0]==='fim')return {natureza,items:[] as OrigemExterna[],finished:true}
     const docs=await reader.consultar(snapshot,{colecao:'lancamentosExternos',natureza,competencia:q.competencia,pageSize:q.pageSize,...(pos?{apos:{data:pos[0],id:pos[1]}}:{})});check()
     const items=docs.map(d=>decodeOrigemExterna(ctx.uid,d.id,d.dados))
     if(items.some((o,i)=>o.natureza!==natureza||o.competenciaPlanejamento!==q.competencia||(i>0&&order(items[i-1],o)>=0)))throw Error('QUERY_INTEGRITY')
     return {natureza,items,finished:items.length<q.pageSize}
    }))
    check()
    const consumed=pages.flatMap(p=>p.items).sort(order).slice(0,q.pageSize)
    for(const p of pages){const used=consumed.filter(o=>o.natureza===p.natureza);const last=used.at(-1);if(last)positions[p.natureza]=[date(last),last.id];if(p.finished&&used.length===p.items.length)positions[p.natureza]=['fim']}
    const complete=sources.every(s=>positions[s]?.[0]==='fim')
    const items=consumed.map(line).filter(l=>(!q.filtro.situacao||l.situacao===q.filtro.situacao)&&(!q.filtro.categoriaId||l.origem.categoriaId===q.filtro.categoriaId)&&(!q.filtro.titularId||l.origem.titularId===q.filtro.titularId))
    const next:CursorExterno={snapshot,consulta:structuredClone(q),posicoes:positions}
    return sucesso({itens:items,snapshot,completo:complete,motivos:complete?[]:['Páginas pendentes. Totais representam somente o recorte carregado.'],...(!complete?{cursor:next}:{})})
   }catch(e){return error(e)}
  },
  async detalhe(origemId,pageSize=50,previous,after=0) {
   try {
    check();if(!idCadastroValido(origemId)||!Number.isInteger(pageSize)||pageSize<1||pageSize>50||!Number.isSafeInteger(after)||after<0)return falha('valorInvalido','Consulta de detalhe inválida.')
    if(previous&&(previous.uid!==ctx.uid||previous.generation!==ctx.generation))return falha('valorInvalido','A consulta pertence a outra sessão.')
    const snapshot=previous??await reader.iniciar();check()
    const [document]=await reader.obter(snapshot,[{colecao:'lancamentosExternos',id:origemId}]);check()
    if(!document?.dados)return falha('naoEncontrado','Lançamento não encontrado.')
    const origem=decodeOrigemExterna(ctx.uid,origemId,document.dados)
    const raw=await reader.consultar(snapshot,{colecao:'operacoesExternas',origemId,pageSize,...(after?{aposVersao:after}:{})});check()
    const eventos=raw.map(d=>decodeEventoExterno(ctx.uid,d.id,d.dados))
    if(eventos.some((e,i)=>e.origemId!==origemId||e.resultVersion!==after+i+1||e.resultVersion>origem.version)||after>origem.version)throw Error('HISTORY_INTEGRITY')
    const last=eventos.at(-1)?.resultVersion??after,complete=last===origem.version
    if(!complete&&eventos.length<pageSize)throw Error('HISTORY_INTEGRITY')
    const refs:{colecao:Colecao;id:string}[]=[{colecao:'categorias',id:origem.categoriaId}]
    if(origem.titularId)refs.push({colecao:'titulares',id:origem.titularId})
    if(origem.contaPrevistaId)refs.push({colecao:'contas',id:origem.contaPrevistaId})
    for(const id of origem.etiquetaIds??[])refs.push({colecao:'etiquetas',id})
    const cadastros=await reader.obter(snapshot,refs);check()
    const referencias:Record<string,string>={}
    for(const ref of refs){
     const doc=cadastros.find(d=>d.colecao===ref.colecao&&d.id===ref.id)
     referencias[`${ref.colecao}/${ref.id}`]=doc?.dados?decodeCadastro(ctx.uid,ref.colecao,ref.id,doc.dados).dados.nome:'Cadastro indisponível'
    }
    return sucesso({origem,referencias,eventos,snapshot,completo:complete,...(!complete?{proximaVersao:last}:{})})
   }catch(e){return error(e)}
  }
 }
}
