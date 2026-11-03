import { expect, it } from 'vitest'
import { criarComprovanteParcelado, orcamentoCriacaoComprovada } from './parceladosWitness'
import { serieParceladaTeste } from './parcelados.testSupport'
import { ler } from './testing.testSupport'
it('comprovante tem identidade estável e não copia valores ou cronograma', () => {
  const c = ler(criarComprovanteParcelado(serieParceladaTeste()))
  expect(c).toEqual({ id: 'criarSerie__intent__serie', dados: { schemaVersion: 1, serieId: 'serie', eventoId: 'criarSerie__intent', resultVersion: 1, createdAt: 1000 } })
  expect(criarComprovanteParcelado({ ...serieParceladaTeste(), version: 2 }).ok).toBe(false)
})
it('orça criação máxima18 e substituição máxima21 rejeitada integralmente', () => {
  const max = { titular: true, contaPrevista: true, etiquetas: 5, primeiroUsoCategoria: true, substituicao: false }
  expect(orcamentoCriacaoComprovada(max)).toMatchObject({ ok: true, valor: { acessos: 18, mutacoes: 4, acessosPorEscrita: [5, 7, 2, 2] } })
  expect(orcamentoCriacaoComprovada({ ...max, substituicao: true })).toMatchObject({ ok: false, erro: { codigo: 'limiteOperacional' } })
  expect(ler(orcamentoCriacaoComprovada({ ...max, titular: false, contaPrevista: false, etiquetas: 0, primeiroUsoCategoria: false, substituicao: true })).acessos).toBe(11)
})
