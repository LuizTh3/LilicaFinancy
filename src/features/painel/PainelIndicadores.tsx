import type { BasePainel, ResumoMensalPainel } from '../../domain/finance/contracts/painel'
import { indicadoresPorBase, moedaPainel, nomesBases, rotulosIndicadores, textoIndicadorPainel } from './painelPresentation'

export function PainelIndicadores({ base, resumo }: Readonly<{ base: BasePainel; resumo?: ResumoMensalPainel }>) {
  return <dl className="painel-indicadores">{indicadoresPorBase[base].map(nome => {
    const valor = resumo?.base === base ? resumo.indicadores[nome] : undefined
    return <div key={nome}><dt>{rotulosIndicadores[nome]}</dt><dd><strong>{textoIndicadorPainel(valor)}</strong><small>{nomesBases[base]}</small>{valor?.estado === 'completo' && valor.estimadoCentavos > 0 && <small>Inclui estimativas: {moedaPainel(valor.estimadoCentavos)}</small>}{valor?.estado === 'parcial' && <small>Existem fontes ou páginas pendentes.</small>}</dd></div>
  })}</dl>
}
