import { expect, it } from 'vitest'
import { renderToStaticMarkup } from 'react-dom/server'
import { PagamentoFaturaForm } from './PagamentoFaturaForm'
import { EncargoFaturaForm } from './EncargoFaturaForm'
import { FaturaFinanceiraSummary } from './FaturaFinanceiraSummary'
import { inicializarControleFatura } from '../../domain/finance/liquidacoesFaturas'
import { calendarioBaseFatura } from '../../domain/finance/invoiceCalendar'
import { ler } from '../../domain/finance/testing.testSupport'

it('pagamento exige conta, valor e data e oferece prévia sem quitação individual', () => {
  const html = renderToStaticMarkup(<PagamentoFaturaForm busy={false} hoje="2026-11-18" pendenteCentavos={60000} contas={[{ id: 'a', nome: 'Conta própria' }]} onPreview={() => {}} onInvalidate={() => {}} />)
  for (const text of ['Conta pagadora', 'Valor pago', 'Data do pagamento', 'Conferir pagamento', '600,00', 'não quita parcelas']) expect(html).toContain(text)
  expect(html).toContain('max="2026-11-18"')
})
it('encargo é manual, separado e não calcula juros', () => {
  const html = renderToStaticMarkup(<EncargoFaturaForm busy hoje="2026-11-18" categorias={[]} onPreview={() => {}} onInvalidate={() => {}} />)
  for (const text of ['Juros informados', 'Motivo', 'Categoria', 'Não há cálculo automático', 'disabled']) expect(html).toContain(text)
})
it('zero sem pagamento não é fatura quitada nem saldo disponível', () => {
  const controle = ler(inicializarControleFatura({ uid: 'A', faturaId: 'card__2026-11', cartaoId: 'card', competencia: '2026-11', exigivelCentavos: 0, eventoId: 'confirmarFatura__empty', instante: 1000 }))
  const html = renderToStaticMarkup(<FaturaFinanceiraSummary controle={controle} contexto={{ uid: 'A', hoje: '2026-11-18', instante: 2000, calendario: ler(calendarioBaseFatura('2026-11', 10, 17)) }} />)
  expect(html).toContain('Sem exigibilidade')
  expect(html).toContain('não representa saldo bancário')
  expect(html).not.toContain('Liquidada')
})
