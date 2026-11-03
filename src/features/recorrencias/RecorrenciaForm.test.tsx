import { expect, it } from 'vitest'
import { renderToStaticMarkup } from 'react-dom/server'
import { RecorrenciaForm } from './RecorrenciaForm'
import { OcorrenciaPreview } from './OcorrenciaPreview'
import { ParceladoResumo } from '../parcelados/ParceladoResumo'
import { serieParceladaTeste } from '../../domain/finance/parcelados.testSupport'
it('cadastro distingue assinatura, estimativa e geração com aplicativo aberto', () => {
  const html = renderToStaticMarkup(<RecorrenciaForm busy={false} categorias={[]} cartoes={[]} titulares={[]} contas={[]} onPreview={() => {}} onInvalidate={() => {}} />)
  for (const t of ['Receita externa', 'Despesa externa', 'Assinatura em cartão', 'Valor estimado', 'Término opcional', 'último dia', 'aplicativo fechado não executa']) expect(html).toContain(t)
  expect(html).not.toContain('Quantidade de parcelas')
})
it('prévia parcial vazia não anuncia ausência confirmada', () => {
  const html = renderToStaticMarkup(<OcorrenciaPreview linhas={[]} completo={false} />)
  expect(html).toContain('Nenhuma ocorrência carregada até aqui')
  expect(html).not.toContain('Nenhuma ocorrência no período consultado')
  expect(html).toContain('não registra pagamento ou recebimento')
})
it('resumo5/10 mantém original ausente e não cria posições anteriores', () => {
  const html = renderToStaticMarkup(<ParceladoResumo serie={serieParceladaTeste()} uid="A" hoje="2026-10-21" />)
  for (const t of ['5 de 10', '10 de 10', 'Não informado', 'não cadastradas', 'não são o fluxo de caixa']) expect(html).toContain(t)
  expect(html).not.toContain('4 de 10')
})
