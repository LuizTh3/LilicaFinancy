import { expect, it } from 'vitest'
import { registrarFontesPainel } from './painelSources'

it('adapter ou schema declarado não habilita fonte sem evidência explícita', () => {
 const registro = registrarFontesPainel([], [])
 expect(registro.estado('recorrencias', 'planejamento')).toBe('indisponivel')
 expect(registro.estado('externos', 'caixa')).toBe('indisponivel')
})
it('registro rejeita IDs duplicados e capability incompatível em vez de escolher versão', () => {
 const adapter = { id: 'externos' as const, bases: ['planejamento' as const], contractRevision: 1, paginar: async () => ({ contribuicoes: [], completo: true }) }
 expect(() => registrarFontesPainel([adapter, adapter], [])).toThrow()
 expect(() => registrarFontesPainel([adapter], [{ fonte: 'externos', contractRevision: 2, bases: ['planejamento'], estado: 'comprovada', evidencia: 'fixture-local' }])).toThrow()
 expect(() => registrarFontesPainel([adapter], [{ fonte: 'externos', contractRevision: 1, bases: ['caixa'], estado: 'comprovada', evidencia: 'fixture-local' }])).toThrow()
})
