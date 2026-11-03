import { expect, it } from 'vitest'
import { renderToStaticMarkup } from 'react-dom/server'
import { MemoryRouter } from 'react-router'
import { PainelVisao } from './PainelPage'
import { PainelIndicadores } from './PainelIndicadores'
import type { JanelaPainel } from '../../domain/finance/contracts/painel'

it('mensal sem fontes usa indisponível, identifica base e não apresenta zero fictício', () => {
  const html = renderToStaticMarkup(<MemoryRouter><PainelVisao modo="mensal" inicio="2026-11" base="planejamento" /></MemoryRouter>)
  for (const text of ['Painel mensal', 'Receitas previstas', 'Compromissos totais', 'Resultado previsto', 'Indisponível', 'Planejamento por competência', 'não é saldo bancário']) expect(html).toContain(text)
  expect(html).not.toContain('R$ 0,00')
})
it('anual exibe doze meses exatos na virada e mantém retorno ao início escolhido', () => {
  const html = renderToStaticMarkup(<MemoryRouter><PainelVisao modo="12meses" inicio="2026-11" base="caixa" /></MemoryRouter>)
  expect((html.match(/<tr>/g) ?? []).length).toBe(13)
  expect(html).toContain('2027-10')
  expect(html).not.toContain('>2027-11</a>')
  expect(html).toContain('/app?mes=2027-10&amp;base=caixa&amp;retorno=2026-11')
  expect(html).toContain('Variação de caixa no período')
  expect(html).not.toContain('Receitas previstas')
})
it('não mistura resumo de outra base e distingue subtotal de total completo', () => {
  const html = renderToStaticMarkup(<PainelIndicadores base="consumo" resumo={{ competencia: '2026-11', base: 'consumo', indicadores: { despesasConsumo: { estado: 'parcial', subtotalCentavos: 10000, motivos: ['paginasIncompletas'], readTime: '2026-10-21T12:00:00Z' } } }} />)
  expect(html).toContain('Subtotal parcial: R$ 100,00')
  expect(html).toContain('Consumo por data da despesa')
  const wrong = renderToStaticMarkup(<PainelIndicadores base="caixa" resumo={{ competencia: '2026-11', base: 'planejamento', indicadores: {} }} />)
  expect(wrong).not.toContain('R$ 0,00')
})
it('intervalo inválido é explicado e janela divergente não aparece no período atual', () => {
  const invalid = renderToStaticMarkup(<MemoryRouter><PainelVisao modo="12meses" inicio="9999-02" base="planejamento" /></MemoryRouter>)
  expect(invalid).toContain('Período fora do calendário')
  const janela = { consulta: { base: 'planejamento', inicio: '2026-10', fim: '2026-10', modo: 'mensal' }, meses: [] } as unknown as JanelaPainel
  const html = renderToStaticMarkup(<MemoryRouter><PainelVisao modo="mensal" inicio="2026-11" base="planejamento" janela={janela} /></MemoryRouter>)
  expect(html).toContain('dados consolidados ainda estão indisponíveis')
})
