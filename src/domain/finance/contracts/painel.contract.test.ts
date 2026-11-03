import { describe, expect, it } from 'vitest'
import { chaveContribuicao, normalizarConsultaPainel, validarIndicadorPainel, validarSnapshotPainel } from './painel'

const consulta = { contractVersion: 1, base: 'planejamento', inicio: '2026-11', fim: '2026-11', modo: 'mensal', filtros: {} }
const readTime = '2026-10-20T12:00:00.123456Z'
const agora = Date.parse(readTime) + 1000
const snapshot = { uid: 'A', generation: 1, readTime, expiresAt: Date.parse(readTime) + 50 * 60000, contractRevision: 1, hojeFinanceiro: '2026-10-20' }

describe('consulta fechada e canônica011', () => {
 it('normaliza união por dimensão sem permitir campos ou IDs arbitrários', () => {
  expect(normalizarConsultaPainel({ ...consulta, filtros: { etiquetas: ['b', 'a', 'b'] } })).toMatchObject({ ok: true, valor: { filtros: { etiquetas: ['a', 'b'] } } })
  for (const q of [{ ...consulta, uid: 'B' }, { ...consulta, filtros: { contaId: 'a' } }, { ...consulta, filtros: { titulares: ['../B'] } }]) expect(normalizarConsultaPainel(q).ok).toBe(false)
 })
 it.each([
  { inicio: '2026-11', fim: '2027-10', modo: '12meses' },
  { inicio: '1900-01', fim: '1900-12', modo: '12meses' },
  { inicio: '9999-01', fim: '9999-12', modo: '12meses' },
 ])('aceita janela válida atravessando calendário: %j', patch => expect(normalizarConsultaPainel({ ...consulta, ...patch }).ok).toBe(true))
 it.each([
  { inicio: '2026-11', fim: '2027-11', modo: '12meses' }, { fim: '2026-10' }, { inicio: '1899-12' },
  { fim: '2026-12' }, { modo: '12meses' }, { contractVersion: 2 }, { base: 'saldo' },
 ])('recusa intervalo/modo/base inválido: %j', patch => expect(normalizarConsultaPainel({ ...consulta, ...patch }).ok).toBe(false))
})
it('snapshot fixa sessão, instante e expiração sem arredondar nanos não suportados', () => {
 expect(validarSnapshotPainel(snapshot, { uid: 'A', generation: 1, agora }).ok).toBe(true)
 for (const patch of [{ uid: 'B' }, { generation: 2 }, { expiresAt: snapshot.expiresAt + 1 }, { readTime: '2026-02-30T12:00:00Z' }, { readTime: '2026-10-20T12:00:00.123456789Z' }, { hojeFinanceiro: '2026-02-30' }]) expect(validarSnapshotPainel({ ...snapshot, ...patch }, { uid: 'A', generation: 1, agora }).ok).toBe(false)
 expect(validarSnapshotPainel(snapshot, { uid: 'A', generation: 1, agora: snapshot.expiresAt }).ok).toBe(false)
})
it('indicador completo, parcial, indisponível e erro não compartilham valor fictício', () => {
 expect(validarIndicadorPainel({ estado: 'completo', valorCentavos: 0, estimadoCentavos: 0, contribuicoes: [], readTime }).ok).toBe(true)
 expect(validarIndicadorPainel({ estado: 'parcial', subtotalCentavos: 0, motivos: ['fonteNaoHabilitada'], readTime }).ok).toBe(true)
 expect(validarIndicadorPainel({ estado: 'indisponivel', motivo: 'filtroIncompativel' }).ok).toBe(true)
 expect(validarIndicadorPainel({ estado: 'erro', codigo: 'integridadeIndeterminada' }).ok).toBe(true)
 for (const value of [
  { estado: 'parcial', valorCentavos: 0, motivos: ['faltamPaginas'], readTime },
  { estado: 'indisponivel', motivo: 'filtroIncompativel', valorCentavos: 0 },
  { estado: 'completo', valorCentavos: 1.5, estimadoCentavos: 0, contribuicoes: [], readTime },
  { estado: 'completo', valorCentavos: Number.MAX_SAFE_INTEGER + 1, estimadoCentavos: 0, contribuicoes: [], readTime },
  { estado: 'completo', valorCentavos: 10, estimadoCentavos: 11, contribuicoes: [], readTime },
 ]) expect(validarIndicadorPainel(value).ok).toBe(false)
})
it('chaves tipadas distinguem autoridade e efeitos, sem usar descrição', () => {
 expect(chaveContribuicao('externo', 'a')).not.toBe(chaveContribuicao('fatura', 'a'))
 expect(chaveContribuicao('efeito008', 'a', 1)).not.toBe(chaveContribuicao('efeito008', 'a', 2))
 expect(() => chaveContribuicao('externo', '../B')).toThrow()
})
