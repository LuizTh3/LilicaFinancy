import { chaveContribuicao } from '../../domain/finance/contracts/painel'
import type { ContribuicaoPainel, FontePainel } from '../../domain/finance/contracts/painel'
import { falha, sucesso } from '../../domain/finance/errors'
import { decodeOrigemExterna } from './externosMapper'
import { decodeFatura } from './faturasMapper'
import { decodeFaturaFinanceira } from './liquidacoesFaturasMapper'

export function mapearExternoPainel(uid: string, id: string, dados: unknown): ContribuicaoPainel {
 const origem = decodeOrigemExterna(uid, id, dados)
 return Object.freeze({
  chave: chaveContribuicao('externo', origem.id), autoridade: 'externo', origemId: origem.id,
  competencia: origem.competenciaPlanejamento, dataFinanceira: origem.natureza === 'receita' ? origem.dataPrevista : origem.vencimento,
  base: 'planejamento', natureza: origem.natureza === 'receita' ? 'entrada' : 'saida', valorCentavos: origem.valorCentavos,
  liquidadoCentavos: origem.liquidadoLiquidoCentavos, estadoObrigacao: origem.estadoObrigacao,
  estimado: origem.estimado, fonte: 'persistida', revisao: origem.version, categoriaId: origem.categoriaId,
  ...(origem.titularId ? { titularId: origem.titularId } : {}), ...(origem.etiquetaIds ? { etiquetaIds: Object.freeze([...origem.etiquetaIds]) } : {}),
 })
}
// A calendar proves dates and identity, never the financial amount of an invoice.
export const mapearCalendarioPainel = decodeFatura
// Local mapping only. Source registration still requires its own remote evidence.
export function mapearFaturaFinanceiraPainel(uid: string, id: string, dados: unknown): ContribuicaoPainel {
 const f = decodeFaturaFinanceira(uid, id, dados)
 return Object.freeze({ chave: chaveContribuicao('fatura', f.id), autoridade: 'fatura', origemId: f.id, competencia: f.competencia, dataFinanceira: f.vencimento, base: 'planejamento', natureza: 'saida', valorCentavos: f.conteudo.exigivelCentavos, liquidadoCentavos: f.conteudo.liquidadoLiquidoCentavos, estadoObrigacao: 'ativa', estimado: false, fonte: 'persistida', revisao: f.conteudo.version, cartaoId: f.cartaoId })
}
export function mapearFontePlanejamento(fonte: FontePainel, uid: string, id: string, dados: unknown) {
 try {
  if (fonte === 'externos') return sucesso(mapearExternoPainel(uid, id, dados))
  if (fonte === 'calendarios') return sucesso(mapearCalendarioPainel(uid, id, dados))
  return falha('configuracaoPendente', 'A autoridade financeira desta fonte ainda não foi comprovada para o painel.')
 } catch { return falha('esquemaIncompativel', 'Registro incompatível com a fonte declarada do painel.') }
}
