import { expect, it } from 'vitest'
import { renderToStaticMarkup } from 'react-dom/server'
import { ParceladoForm } from './ParceladoForm'
import { CronogramaPreview } from './CronogramaPreview'
import { prepararCriacao } from '../../domain/finance/parcelados'
import { entradaParceladaTeste } from '../../domain/finance/parcelados.testSupport'
import { ler } from '../../domain/finance/testing.testSupport'
it('formulário distingue empréstimo, original opcional e série em andamento', () => {
  const html = renderToStaticMarkup(<ParceladoForm busy={false} opcoes={{ categorias: [], titulares: [], contas: [], etiquetas: [] }} onPreview={() => {}} onCancel={() => {}} />)
  for (const texto of ['Empréstimo', 'Próxima parcela', 'Quantidade original', 'Valor original conhecido', 'Cronograma explícito', 'Conferir cronograma']) expect(html).toContain(texto)
  expect(html).not.toContain('type="hidden"')
})
it('prévia5/10 mostra seis obrigações sem passado e original ausente sem zero fictício', () => {
  const html = renderToStaticMarkup(<CronogramaPreview previa={ler(prepararCriacao(entradaParceladaTeste, 'criarSerie__intent'))} />)
  expect(html).toContain('Não informado')
  expect(html).toContain('5 de 10')
  expect(html).toContain('10 de 10')
  expect(html).not.toContain('4 de 10')
  expect(html).toContain('não registra pagamentos')
})
