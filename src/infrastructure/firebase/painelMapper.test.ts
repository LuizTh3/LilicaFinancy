import { expect, it } from 'vitest'
import { Timestamp } from 'firebase/firestore'
import { mapearExternoPainel, mapearCalendarioPainel, mapearFontePlanejamento, mapearFaturaFinanceiraPainel } from './painelMapper'
import { calendarioBaseFatura } from '../../domain/finance/invoiceCalendar'
const time = Timestamp.fromMillis(1)
function origem() { return { natureza: 'receita', descricao: 'Salário fictício', categoriaId: 'categoria', valorCentavos: 500000, estimado: false, competenciaPlanejamento: '2026-11', dataPrevista: '2026-12-10', schemaVersion: 1, version: 2, createdAt: time, updatedAt: time, estadoObrigacao: 'ativa', liquidadoLiquidoCentavos: 300000, jaLiquidada: true, ultimoEventoId: 'receber__fixture' } }
it('005 conserva competência, posição líquida e identidade tipada sem inferir caixa', () => {
 expect(mapearExternoPainel('A', 'salario', origem())).toMatchObject({ chave: 'externo:salario', autoridade: 'externo', competencia: '2026-11', dataFinanceira: '2026-12-10', valorCentavos: 500000, liquidadoCentavos: 300000, natureza: 'entrada', base: 'planejamento', fonte: 'persistida' })
})
it('não aceita schema/valores desconhecidos, proprietário injetado ou líquido excedente', () => {
 for (const patch of [{ schemaVersion: 2 }, { uid: 'B' }, { liquidadoLiquidoCentavos: 500001 }, { valorCentavos: 1.2 }]) expect(() => mapearExternoPainel('A', 'salario', { ...origem(), ...patch })).toThrow()
})
it('calendário006 é decodificado sem fabricar valor financeiro ou pendência zero', () => {
 const c = calendarioBaseFatura('2026-11', 10, 17); if (!c.ok) throw Error('fixture')
 const r = mapearCalendarioPainel('A', 'card__2026-11', { ...c.valor, cartaoId: 'card', schemaVersion: 1, versaoConteudo: 1, version: 1, ultimoEventoId: 'confirmarFatura__fixture', createdAt: time, updatedAt: time })
 expect(r).toMatchObject({ competencia: '2026-11', cartaoId: 'card' })
 expect(r).not.toHaveProperty('valorCentavos'); expect(r).not.toHaveProperty('pendenteCentavos')
})
it('autoridades007–010 não ganham mapper remoto por contrato/fixture não comprovados', () => {
 const candidates = [
  ['compras', { cronogramaRevision: 2, parcela: { cronogramaRevision: 1 } }],
  ['parcelados', { parcelas: { p05: { valorCentavos: 100 } }, valorOriginalCentavos: 10000 }],
  ['liquidacoes', { exigivelCentavos: 100, liquidadoLiquidoCentavos: 0, reconstruido: true }],
  ['recorrencias', { financeiro: { valorCentavos: 100 }, capacidadeItem: {}, controleSeparado: {} }],
 ] as const
 for (const [source, input] of candidates) expect(mapearFontePlanejamento(source, 'A', 'fixture', input)).toMatchObject({ ok: false, erro: { codigo: 'configuracaoPendente' } })
})
it('fatura financeira008 usa exigível líquido e liquidação do controle, sem ratear por categoria', () => {
 const calendario = calendarioBaseFatura('2026-11', 10, 17); if (!calendario.ok) throw Error('fixture')
 const raw = { ...calendario.valor, cartaoId: 'card', schemaVersion: 1, versaoConteudo: 4, version: 1, ultimoEventoId: 'confirmarFatura__calendar', createdAt: time, updatedAt: time, conteudo: { schemaVersion: 2, version: 2, exigivelCentavos: 90000, liquidadoLiquidoCentavos: 40000, possuiHistoricoPagamento: true, revisaoEstado: 'normal', ultimoEventoTipo: 'pagarFatura', ultimoEventoId: 'pagarFatura__pay', createdAt: time, updatedAt: time } }
 const row = mapearFaturaFinanceiraPainel('A', 'card__2026-11', raw)
 expect(row).toMatchObject({ autoridade: 'fatura', base: 'planejamento', valorCentavos: 90000, liquidadoCentavos: 40000, competencia: '2026-11', dataFinanceira: '2026-11-17', cartaoId: 'card', revisao: 2 })
 expect(row.categoriaId).toBeUndefined()
 expect(() => mapearFaturaFinanceiraPainel('A', 'card__2026-11', { ...raw, conteudo: undefined })).toThrow()
 expect(() => mapearFaturaFinanceiraPainel('A', 'card__2026-11', { ...raw, versaoConteudo: 1 })).toThrow()
})
