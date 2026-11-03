import { expect, it } from 'vitest'
import { capacidadesPainel, capacidadePainel, painelDisponivel } from './availability'
import { basesPainel, fontesPainel } from '../../domain/finance/contracts/painel'
it('G0-local/fixture não habilita consulta de produto nem fonte remota não comprovada', () => {
 expect(painelDisponivel).toBe(false)
 for (const fonte of fontesPainel) for (const base of basesPainel) {
  expect(capacidadePainel(fonte, base)).toMatchObject({ estado: 'naoHabilitada', motivo: 'fonteNaoHabilitada' })
  expect(capacidadePainel(fonte, base)).not.toHaveProperty('valorCentavos')
 }
 expect(capacidadesPainel).toHaveLength(6)
 expect(capacidadesPainel.every(c => c.estado === 'naoHabilitada')).toBe(true)
 expect(Object.isFrozen(capacidadesPainel)).toBe(true)
 expect(capacidadesPainel.every(Object.isFrozen)).toBe(true)
})
